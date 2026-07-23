"""Optimize categorical RayOptics glasses with continuous L-BFGS-B refinement.

The implementation mirrors Optiland's glass-expert search without importing it:
ordered greedy surface passes, deterministic K-means representatives, raw
``(nd, Vd)`` nearest neighbours, strict merit improvement, and a final continuous
polish. Optical materials and all numeric/pickup targets are snapshotted together
so candidate trials and failures restore coherent designs.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import cast

import numpy as np
from rayoptics.environment import OpticalModel
from scipy.cluster.vq import kmeans2

from .glass_config import (
    NormalizedGlassOptimizationConfig,
    NormalizedGlassVariable,
    ResolvedGlassCandidate,
    material_report_entry,
    normalize_glass_optimization_config,
)
from .optimization import _sync_legacy_hooks
from .problem import OptimizationProblem
from .solvers.lbfgsb import GLASS_OBJECTIVE_PENALTY, LBFGSBSolver
from .targets import snapshot_state, write_target_value
from ._types import (
    GlassOptimizationConfig,
    GlassOptimizationReport,
    GlassStateEntry,
    OptimizationReport,
    ProgressReporter,
    SnapshotEntry,
    SolverResult,
    TargetKey,
    VariableStateEntry,
)


@dataclass
class _MixedState:
    """Material references and numeric target values for one coherent design."""

    materials: dict[int, object]
    numeric: dict[TargetKey, SnapshotEntry]


def select_global_representatives(
    candidates: list[ResolvedGlassCandidate],
    count: int,
) -> list[ResolvedGlassCandidate]:
    """Select deterministic K-means representatives in raw ``(nd, Vd)`` space."""
    keep = min(count, len(candidates))
    if keep <= 0:
        return []
    if len(candidates) == 1:
        return list(candidates)

    points = np.array([(candidate.nd, candidate.vd) for candidate in candidates], dtype=float)
    centroids, labels = kmeans2(points, keep, minit="points", seed=1234)
    selected: list[ResolvedGlassCandidate] = []
    for cluster_index in range(keep):
        indices = np.flatnonzero(np.asarray(labels) == cluster_index)
        if len(indices) == 0:
            continue
        distances = np.linalg.norm(points[indices] - centroids[cluster_index], axis=1)
        closest_index = int(indices[int(np.argmin(distances))])
        selected.append(candidates[closest_index])
    return selected


def nearest_candidates(
    current: ResolvedGlassCandidate,
    candidates: list[ResolvedGlassCandidate],
    count: int,
) -> list[ResolvedGlassCandidate]:
    """Return stable raw-distance neighbours, excluding the current identity."""
    limit = min(count, len(candidates))
    ranked = sorted(
        (
            (
                math.hypot(candidate.nd - current.nd, candidate.vd - current.vd),
                candidate,
            )
            for candidate in candidates
            if candidate.identity != current.identity
        ),
        key=lambda entry: entry[0],
    )
    return [candidate for _, candidate in ranked[:limit]]


class GlassExpertOptimizer:
    """Coordinate ordered categorical trials and nested continuous solves."""

    def __init__(
        self,
        opm: OpticalModel,
        config: NormalizedGlassOptimizationConfig,
        problem: OptimizationProblem,
        progress_reporter: ProgressReporter | None,
    ) -> None:
        self.opm = opm
        self.config = config
        self.problem = problem
        self.progress_reporter = progress_reporter
        self.settings = config["glass_optimizer"]
        self.glass_variables = config["glass_variables"]
        self.runs = 0
        self.nfev = 0
        self.nit = 0
        self.original_state = self.capture_state()
        self.best_completed_state = self.original_state
        self.initial_values = problem.variable_state()
        self.initial_glasses = self.glass_state()
        self.current_merit = GLASS_OBJECTIVE_PENALTY
        self.final_result: SolverResult | None = None

    def capture_state(self) -> _MixedState:
        """Capture every configured glass and mutable numeric/pickup target."""
        gaps = self.opm["seq_model"].gaps
        return _MixedState(
            materials={
                variable["surface_index"]: gaps[variable["surface_index"]].medium
                for variable in self.glass_variables
            },
            numeric=snapshot_state(
                self.opm,
                self.config["variables"],
                self.config["pickups"],
            ),
        )

    def restore_state(self, state: _MixedState) -> None:
        """Restore materials and numeric targets, then update the model once."""
        gaps = self.opm["seq_model"].gaps
        for surface_index, medium in state.materials.items():
            gaps[surface_index].medium = medium
        for snapshot_entry in state.numeric.values():
            write_target_value(
                self.opm,
                snapshot_entry["entry"],
                snapshot_entry["value"],
            )
        self.opm.update_model()

    def glass_state(self) -> list[GlassStateEntry]:
        """Return configured surface materials in user-supplied order."""
        gaps = self.opm["seq_model"].gaps
        return cast(
            list[GlassStateEntry],
            [
                material_report_entry(
                    variable["surface_index"],
                    gaps[variable["surface_index"]].medium,
                )
                for variable in self.glass_variables
            ],
        )

    def initialize(self) -> None:
        """Convert ModelGlass incumbents and establish the completed baseline."""
        gaps = self.opm["seq_model"].gaps
        converted = False
        for variable in self.glass_variables:
            replacement = variable.get("model_replacement")
            if replacement is not None:
                gaps[variable["surface_index"]].medium = replacement.medium
                converted = True
        if converted:
            self.opm.update_model()

        evaluation = self.problem.evaluate(self.problem.current_vector())
        merit = float(evaluation["merit_function"]["sum_of_squares"])
        self.current_merit = merit if math.isfinite(merit) else GLASS_OBJECTIVE_PENALTY
        self.best_completed_state = self.capture_state()

    def _candidate_for_current(
        self,
        variable: NormalizedGlassVariable,
    ) -> ResolvedGlassCandidate:
        """Resolve the current surface medium back into its configured pool."""
        surface_index = variable["surface_index"]
        medium = self.opm["seq_model"].gaps[surface_index].medium
        identity_entry = material_report_entry(surface_index, medium)
        identity = cast(str, identity_entry["name"]), cast(str, identity_entry["catalog"])
        for candidate in variable["candidates"]:
            if candidate.identity == identity:
                return candidate
        raise ValueError(f"Current glass at surface {surface_index} is outside its candidate pool")

    def _record_result(self, result: SolverResult) -> None:
        """Aggregate metadata from one fully completed nested solve."""
        self.nfev += int(result.get("nfev", 0))
        self.nit += int(result.get("nit", 0))

    def explore(
        self,
        variable: NormalizedGlassVariable,
        candidates: list[ResolvedGlassCandidate],
        phase: str,
    ) -> None:
        """Try candidates from one common incumbent and keep only strict improvement."""
        surface_index = variable["surface_index"]
        incumbent_state = self.capture_state()
        best_state = incumbent_state
        best_merit = self.current_merit

        for candidate in candidates:
            self.restore_state(incumbent_state)
            self.opm["seq_model"].gaps[surface_index].medium = candidate.medium
            self.opm.update_model()
            self.problem.progress_context = {
                "phase": phase,
                "surface_index": surface_index,
                "candidate": candidate.report_identity(),
            }
            self.runs += 1
            result = LBFGSBSolver(
                self.problem,
                self.settings["maxiter"],
                self.settings["tol"],
            ).solve(self.progress_reporter)
            self._record_result(result)
            merit = float(result.get("fun", GLASS_OBJECTIVE_PENALTY))
            candidate_state = self.capture_state()
            if math.isfinite(merit) and merit < best_merit:
                best_merit = merit
                best_state = candidate_state
                self.best_completed_state = candidate_state

        self.restore_state(best_state)
        self.best_completed_state = best_state
        self.current_merit = best_merit

    def search(self) -> None:
        """Run ordered global and local greedy passes across all glass surfaces."""
        count = self.settings["num_neighbours"]
        for variable in self.glass_variables:
            self.explore(
                variable,
                select_global_representatives(variable["candidates"], count),
                "global",
            )
        for variable in self.glass_variables:
            current = self._candidate_for_current(variable)
            self.explore(
                variable,
                nearest_candidates(current, variable["candidates"], count),
                "local",
            )

    def polish(self) -> SolverResult:
        """Run the final continuous-only L-BFGS-B refinement."""
        pre_polish_state = self.capture_state()
        self.best_completed_state = pre_polish_state
        self.problem.progress_context = {"phase": "polish"}
        self.runs += 1
        result = LBFGSBSolver(
            self.problem,
            self.settings["maxiter"],
            self.settings["tol"],
        ).solve(self.progress_reporter)
        self._record_result(result)
        self.best_completed_state = self.capture_state()
        self.current_merit = float(result.get("fun", self.current_merit))
        self.final_result = result
        return result

    def optimizer_summary(self) -> dict[str, object]:
        """Return normalized settings and aggregate nested-solver metadata."""
        return {
            "kind": "glass_expert",
            "method": "L-BFGS-B",
            "runs": int(self.runs),
            "nfev": int(self.nfev),
            "nit": int(self.nit),
            "num_neighbours": int(self.settings["num_neighbours"]),
            "maxiter": int(self.settings["maxiter"]),
            "tol": float(self.settings["tol"]),
        }

    def build_report(self, *, stopped: bool = False) -> GlassOptimizationReport:
        """Evaluate the current coherent state and assemble the public report."""
        report = cast(
            OptimizationReport,
            self.problem.evaluate(self.problem.current_vector()),
        )
        has_glasses = len(self.glass_variables) > 0
        has_continuous = len(self.problem.variables) > 0

        if stopped:
            success = True
            status: str | int = "stopped"
            message = "Optimization stopped by user"
        elif not has_glasses and not has_continuous:
            success = True
            status = "no_variables"
            message = "No optimization variables supplied"
        elif has_glasses and not has_continuous:
            success = True
            status = "optimized"
            message = "Glass optimization completed"
        else:
            result = self.final_result
            if result is None:
                raise RuntimeError("Final L-BFGS-B result is unavailable")
            success = bool(result["success"])
            status = int(result["status"])
            message = str(result["message"])

        report["success"] = success
        report["status"] = status
        report["message"] = message
        report["optimizer"] = cast(dict, self.optimizer_summary())
        report["initial_values"] = cast(list[VariableStateEntry], self.initial_values)
        report["optimization_progress"] = list(self.problem.optimization_progress)
        glass_report = cast(GlassOptimizationReport, report)
        glass_report["initial_glasses"] = self.initial_glasses
        glass_report["final_glasses"] = self.glass_state()
        return glass_report


def optimize_glasses(
    opm: OpticalModel,
    config: GlassOptimizationConfig,
    image_point: str = "chief_ray",
    progress_reporter: ProgressReporter | None = None,
) -> GlassOptimizationReport:
    """Optimize ordered glass choices and optional continuous RayOptics targets.

    The function validates and resolves all candidates before mutation, snapshots
    both material and numeric state, converts ModelGlass incumbents to the nearest
    allowed real glass, performs global/local greedy passes, and finishes with one
    continuous L-BFGS-B polish. Unexpected failures restore the original design.
    ``KeyboardInterrupt`` instead restores the best fully completed candidate and
    returns a successful ``"stopped"`` report.

    Args:
        opm: RayOptics optical model to optimize in place.
        config: Flat glass-expert, variable, pickup, and merit configuration.
        image_point: Image-point reference convention forwarded to operands.
        progress_reporter: Optional callback receiving the globally monotonic history.

    Returns:
        Detailed JSON-safe mixed optimization report.
    """
    _sync_legacy_hooks()
    normalized = normalize_glass_optimization_config(opm, config)
    problem = OptimizationProblem.from_normalized_config(
        opm,
        normalized["problem_config"],
        image_point=image_point,
    )
    optimizer = GlassExpertOptimizer(opm, normalized, problem, progress_reporter)

    try:
        optimizer.initialize()
        optimizer.search()
        optimizer.polish()
        return optimizer.build_report()
    except KeyboardInterrupt:
        try:
            optimizer.restore_state(optimizer.best_completed_state)
            return optimizer.build_report(stopped=True)
        except Exception:
            optimizer.restore_state(optimizer.original_state)
            raise
    except Exception:
        optimizer.restore_state(optimizer.original_state)
        raise
