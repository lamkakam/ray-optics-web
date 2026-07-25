"""Assemble JSON-safe optimization reports after ordinary Python failures.

Both optimizer facades and the Pyodide-generated setup fallback use these
builders. Facades may supply a fully initialized problem or glass optimizer so
restored state and partial progress remain visible. Setup failures omit state
that was never captured. Merit evaluation is never retried: each report uses
the penalty associated with its solver family.
"""

from __future__ import annotations

from copy import deepcopy
import math
from typing import TYPE_CHECKING, cast

from ._types import (
    GlassOptimizationConfig,
    GlassOptimizationReport,
    OptimizationConfig,
    OptimizationProgressEntry,
    OptimizationReport,
    PickupReportEntry,
    SnapshotEntry,
    SolverResult,
    TargetKey,
    VariableStateEntry,
)
from .operands import PENALTY_RESIDUAL
from .solvers.lbfgsb import GLASS_OBJECTIVE_PENALTY
from .targets import target_key

if TYPE_CHECKING:
    from .glass_optimizer import GlassExpertOptimizer
    from .problem import OptimizationProblem


def _config_mapping(value: object) -> dict[str, object]:
    """Return a shallow string-keyed mapping or an empty fallback."""
    if not isinstance(value, dict):
        return {}
    return cast(dict[str, object], value)


def _progress_for_problem(
    problem: OptimizationProblem | None,
) -> list[OptimizationProgressEntry]:
    """Copy any progress recorded before the failing operation."""
    if problem is None:
        return []
    return deepcopy(list(problem.optimization_progress))


def _restored_problem_state(
    problem: OptimizationProblem | None,
    initial_values: list[VariableStateEntry] | None,
    snapshot: dict[TargetKey, SnapshotEntry] | None,
) -> tuple[
    list[VariableStateEntry],
    list[VariableStateEntry],
    list[PickupReportEntry],
]:
    """Build state entries directly from the captured rollback snapshot."""
    if problem is None or initial_values is None or snapshot is None:
        return [], [], []

    restored_values = deepcopy(initial_values)
    pickups: list[PickupReportEntry] = []
    for pickup in problem.pickups:
        snapshot_entry = snapshot.get(target_key(pickup))
        if snapshot_entry is None:
            continue
        pickups.append(
            cast(
                PickupReportEntry,
                {
                    **pickup,
                    "value": float(snapshot_entry["value"]),
                },
            )
        )
    return deepcopy(restored_values), restored_values, pickups


def _continuous_family(
    config: OptimizationConfig,
    problem: OptimizationProblem | None,
) -> tuple[str, str | None]:
    """Identify a supported solver family and optional valid method."""
    if problem is not None:
        kind = problem.optimizer["kind"]
        method = problem.optimizer.get("method")
        return kind, method

    optimizer = _config_mapping(_config_mapping(config).get("optimizer"))
    kind = optimizer.get("kind")
    if kind == "differential_evolution":
        return kind, None
    method = optimizer.get("method")
    return "least_squares", method if method in {"trf", "lm"} else None


def _continuous_penalty_merit(
    kind: str,
    problem: OptimizationProblem | None,
) -> tuple[float, float]:
    """Return solver-family penalty merit and matching root sum of squares."""
    if kind == "differential_evolution":
        merit = float(PENALTY_RESIDUAL)
        return merit, float(math.sqrt(merit))

    residual_count = 1
    if problem is not None:
        try:
            residual_count = max(int(problem.penalty_residual_vector().size), 1)
        except Exception:
            residual_count = 1
    merit = float(residual_count) * float(PENALTY_RESIDUAL) ** 2
    return merit, float(math.sqrt(merit))


def build_optimization_failure_report(
    error: Exception,
    config: OptimizationConfig,
    *,
    problem: OptimizationProblem | None = None,
    initial_values: list[VariableStateEntry] | None = None,
    snapshot: dict[TargetKey, SnapshotEntry] | None = None,
    solver_result: SolverResult | None = None,
) -> OptimizationReport:
    """Build a complete continuous-optimization failure report without evaluation.

    Args:
        error: Ordinary Python exception that ended setup or execution.
        config: Raw optimization configuration, used when setup did not finish.
        problem: Initialized problem when available.
        initial_values: Values captured before optimizer mutation.
        snapshot: Full variable and pickup rollback snapshot.
        solver_result: Completed solver metadata when final reporting failed.

    Returns:
        JSON-safe report with ``success == False`` and ``status == "error"``.
    """
    progress = _progress_for_problem(problem)
    restored_initial, restored_final, pickups = _restored_problem_state(
        problem,
        initial_values,
        snapshot,
    )
    kind, method = _continuous_family(config, problem)
    merit, rss = _continuous_penalty_merit(kind, problem)

    if kind == "differential_evolution":
        optimizer_summary: dict[str, object] = {
            "kind": kind,
            "nfev": int(
                solver_result.get("nfev", len(progress))
                if solver_result is not None
                else len(progress)
            ),
            "nit": int(
                solver_result.get("nit", 0)
                if solver_result is not None
                else 0
            ),
        }
    else:
        optimizer_summary = {
            "kind": "least_squares",
            **({"method": method} if method is not None else {}),
            "nfev": int(
                solver_result.get("nfev", len(progress))
                if solver_result is not None
                else len(progress)
            ),
            "njev": int(
                solver_result.get("njev", 0)
                if solver_result is not None
                else 0
            ),
            "cost": merit / 2.0,
            "optimality": 0.0,
        }

    return cast(
        OptimizationReport,
        {
            "success": False,
            "status": "error",
            "message": str(error),
            "optimizer": optimizer_summary,
            "initial_values": restored_initial,
            "final_values": restored_final,
            "pickups": pickups,
            "residuals": [],
            "merit_function": {
                "sum_of_squares": merit,
                "rss": rss,
            },
            "optimization_progress": progress,
        },
    )


def _positive_integer_setting(
    settings: dict[str, object],
    key: str,
    default: int,
) -> int:
    """Return one valid positive integer setting or its report fallback."""
    value = settings.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        return default
    return value


def _positive_float_setting(
    settings: dict[str, object],
    key: str,
    default: float,
) -> float:
    """Return one valid positive finite float setting or its report fallback."""
    value = settings.get(key)
    if isinstance(value, bool):
        return default
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(normalized) or normalized <= 0.0:
        return default
    return normalized


def _glass_settings(
    config: GlassOptimizationConfig,
    optimizer: GlassExpertOptimizer | None,
) -> tuple[int, int, float]:
    """Return normalized glass settings or safe setup-failure defaults."""
    if optimizer is not None:
        settings = cast(dict[str, object], optimizer.settings)
    else:
        settings = _config_mapping(
            _config_mapping(config).get("glass_optimizer")
        )
    return (
        _positive_integer_setting(settings, "num_neighbours", 7),
        _positive_integer_setting(settings, "maxiter", 1000),
        _positive_float_setting(settings, "tol", 1e-3),
    )


def build_glass_optimization_failure_report(
    error: Exception,
    config: GlassOptimizationConfig,
    *,
    optimizer: GlassExpertOptimizer | None = None,
) -> GlassOptimizationReport:
    """Build a complete mixed glass/continuous failure report without evaluation.

    An initialized optimizer contributes its original material/numeric snapshot,
    completed nested-solver counters, and any partial progress. Before that state
    exists, all state arrays and counters are empty or zero.

    Args:
        error: Ordinary Python exception that ended setup or execution.
        config: Raw glass-optimization configuration.
        optimizer: Initialized glass expert when available.

    Returns:
        JSON-safe glass report with ``success == False`` and
        ``status == "error"``.
    """
    if optimizer is None:
        progress: list[OptimizationProgressEntry] = []
        initial_values: list[VariableStateEntry] = []
        final_values: list[VariableStateEntry] = []
        pickups: list[PickupReportEntry] = []
        initial_glasses: list[dict[str, object]] = []
        final_glasses: list[dict[str, object]] = []
        runs = 0
        nfev = 0
        nit = 0
    else:
        progress = _progress_for_problem(optimizer.problem)
        initial_values, final_values, pickups = _restored_problem_state(
            optimizer.problem,
            cast(list[VariableStateEntry], optimizer.initial_values),
            optimizer.original_state.numeric,
        )
        initial_glasses = deepcopy(cast(list[dict[str, object]], optimizer.initial_glasses))
        final_glasses = deepcopy(initial_glasses)
        runs = int(optimizer.runs)
        nfev = int(optimizer.nfev)
        nit = int(optimizer.nit)

    num_neighbours, maxiter, tol = _glass_settings(config, optimizer)
    merit = float(GLASS_OBJECTIVE_PENALTY)
    return cast(
        GlassOptimizationReport,
        {
            "success": False,
            "status": "error",
            "message": str(error),
            "optimizer": {
                "kind": "glass_expert",
                "method": "L-BFGS-B",
                "runs": runs,
                "nfev": nfev,
                "nit": nit,
                "num_neighbours": num_neighbours,
                "maxiter": maxiter,
                "tol": tol,
            },
            "initial_values": initial_values,
            "final_values": final_values,
            "pickups": pickups,
            "initial_glasses": initial_glasses,
            "final_glasses": final_glasses,
            "residuals": [],
            "merit_function": {
                "sum_of_squares": merit,
                "rss": float(math.sqrt(merit)),
            },
            "optimization_progress": progress,
        },
    )
