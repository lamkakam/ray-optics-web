"""Model an algorithm-independent optimization problem."""

from __future__ import annotations

import math
from typing import Self

import numpy as np
from rayoptics.environment import OpticalModel

from .config import normalize_config, pickup_order
from ._types import (
    FloatArray,
    NormalizedOptimizationConfig,
    OptimizationConfig,
    PickupReportEntry,
    ProblemEvaluation,
    ProgressReporter,
    ResidualEntry,
    VariableConfig,
    VariableStateEntry,
)
from .operands import OPERAND_REGISTRY, PENALTY_RESIDUAL, get_nominal_operand_sample_residual_count
from .progress import OptimizationProgress
from .targets import (
    curvature_to_radius,
    radius_to_curvature,
    read_target_value,
    write_target_value,
)


class OptimizationProblem:
    """Validated optimization problem bound to an optical model.


    Provides the algorithm-agnostic `OptimizationProblem` core used by optimization solver adapters. It owns config normalization, variable/pickup application, operand evaluation, merit computation, and progress tracking, but does not call any SciPy solver directly.

    - Normalizes the incoming config with `config.normalize_config(...)`.
    - Keeps variables in radius-based external units while translating radius optimization internally to curvature space.
    - Keeps variable-state report entries aligned with the normalized config shape, so `min` / `max` appear only for bounded variables.
    - Applies variables, then pickups in dependency order, then calls `opm.update_model()`.
    - Evaluates all normalized merit operands and returns the same report shape consumed by the existing public API.
    - Passes `image_point` into every operand evaluator; OPD-based operands consume it and non-OPD operands ignore it.
    - Expands vector-valued operand outputs into one residual report entry per returned sample, so target-less operands such as Ray Fan variants can contribute many least-squares residuals from one normalized field/wavelength selection.
    - Exposes residual-vector, scalar-merit, and glass-safe scalar objective methods so solver adapters can choose the representation they need.
    - For targeted scalar operands, weighted residuals remain `total_weight * (actual - target)`. For target-less vector operands, weighted residuals are `total_weight * sample_value`.
    - The penalty residual vector length matches the nominal expanded residual dimension using the same shared operand residual-count helper as config validation. For `ray_fan`, that means `num_rays * 2` entries per normalized field/wavelength sample; for axis-specific Ray Fan operands, that means `num_rays` entries.
    - Records progress only when the evaluated optimizer vector or glass-search context changes materially.
    - `from_normalized_config(...)` lets the glass facade reuse the problem core after its distinct flat configuration has already been validated.
    - Converts optional bounds into SciPy-compatible `(None, None)` intervals for L-BFGS-B while preserving the existing array bounds used by current solvers.
    - Uses `OpticalModel` plus package-local typed config/report aliases for all internal mappings."""

    def __init__(self, opm: OpticalModel, config: OptimizationConfig, image_point: str = "chief_ray"):
        self._bind_config(opm, normalize_config(opm, config), image_point)

    @classmethod
    def from_normalized_config(
        cls,
        opm: OpticalModel,
        config: NormalizedOptimizationConfig,
        image_point: str = "chief_ray",
    ) -> Self:
        """Bind a pre-normalized config without applying standard solver validation.

        Args:
            opm: RayOptics optical model.
            config: Already normalized problem configuration.
            image_point: Image-point reference convention.

        Returns:
            Problem bound to the supplied normalized configuration.
        """
        problem = cls.__new__(cls)
        problem._bind_config(opm, config, image_point)
        return problem

    def _bind_config(
        self,
        opm: OpticalModel,
        config: NormalizedOptimizationConfig,
        image_point: str,
    ) -> None:
        """Initialize common problem state from a normalized configuration."""
        self.opm = opm
        self.image_point = image_point
        self.config = config
        self.variables = self.config["variables"]
        self.pickups = self.config["pickups"]
        self.ordered_pickups = pickup_order(self.pickups)
        self.optimizer = self.config["optimizer"]
        self.operands = self.config["merit_function"]["operands"]
        self.progress = OptimizationProgress()
        self.optimization_progress = self.progress.entries
        self._progress_reporter: ProgressReporter | None = None
        self.progress_context: dict[str, object] | None = None

    def current_vector(self) -> FloatArray:
        return np.array(
            [self._to_internal_value(variable, read_target_value(self.opm, variable)) for variable in self.variables],
            dtype=float,
        )

    def bounds(self) -> tuple[FloatArray, FloatArray]:
        if len(self.variables) == 0:
            return np.array([], dtype=float), np.array([], dtype=float)
        lower = np.array([self._internal_lower_bound(variable) for variable in self.variables], dtype=float)
        upper = np.array([self._internal_upper_bound(variable) for variable in self.variables], dtype=float)
        return lower, upper

    def scipy_bounds(self) -> list[tuple[float | None, float | None]]:
        """Return optional per-variable bounds accepted by SciPy minimize."""
        bounds: list[tuple[float | None, float | None]] = []
        for variable in self.variables:
            if "min" not in variable or "max" not in variable:
                bounds.append((None, None))
                continue
            bounds.append(
                (
                    self._internal_lower_bound(variable),
                    self._internal_upper_bound(variable),
                )
            )
        return bounds

    def apply_vector(self, values: FloatArray | list[float]) -> list[PickupReportEntry]:
        for value, variable in zip(values, self.variables):
            write_target_value(self.opm, variable, self._from_internal_value(variable, float(value)))
        pickup_reports: list[PickupReportEntry] = []
        for pickup in self.ordered_pickups:
            source_target = {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **({"asphere_kind": pickup["asphere_kind"]} if "asphere_kind" in pickup else {}),
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            }
            source_value = read_target_value(self.opm, source_target)
            value = pickup["scale"] * source_value + pickup["offset"]
            write_target_value(self.opm, pickup, value)
            pickup_reports.append({**pickup, "value": float(value)})
        self.opm.update_model()
        return pickup_reports

    def evaluate(self, values: FloatArray | list[float] | None = None) -> ProblemEvaluation:
        if values is None:
            values = self.current_vector()
        pickups = self.apply_vector(values)
        residuals: list[ResidualEntry] = []
        weighted_values: list[float] = []
        for operand in self.operands:
            evaluator = OPERAND_REGISTRY[operand["kind"]]
            actual_values = evaluator(
                self.opm,
                operand["field_index"],
                operand["wavelength_index"],
                operand["options"],
                self.image_point,
            )
            if isinstance(actual_values, list):
                actuals = [float(value) for value in actual_values]
            else:
                actuals = [float(actual_values)]
            total_weight = operand["weight"] * math.sqrt(operand["field_weight"]) * math.sqrt(operand["wavelength_weight"])
            for actual in actuals:
                weighted_residual = total_weight * (
                    actual - operand["target"] if "target" in operand else actual
                )
                residual: ResidualEntry = {
                    "kind": operand["kind"],
                    "value": actual,
                    "field_index": operand["field_index"],
                    "wavelength_index": operand["wavelength_index"],
                    "operand_weight": operand["weight"],
                    "field_weight": operand["field_weight"],
                    "wavelength_weight": operand["wavelength_weight"],
                    "total_weight": float(total_weight),
                    "weighted_residual": float(weighted_residual),
                }
                if "target" in operand:
                    residual["target"] = operand["target"]
                residuals.append(residual)
                weighted_values.append(float(weighted_residual))

        sum_of_squares = float(sum(value ** 2 for value in weighted_values))
        rss = float(math.sqrt(sum_of_squares))
        optimizer_summary = {"kind": self.optimizer["kind"]}
        if "method" in self.optimizer:
            optimizer_summary["method"] = self.optimizer["method"]
        return {
            "optimizer": optimizer_summary,
            "initial_values": self.variable_state(),
            "final_values": self.variable_state(),
            "pickups": pickups,
            "residuals": residuals,
            "merit_function": {
                "sum_of_squares": sum_of_squares,
                "rss": rss,
            },
            "optimization_progress": list(self.optimization_progress),
        }

    def variable_state(self) -> list[VariableStateEntry]:
        return [
            {
                "kind": variable["kind"],
                "surface_index": variable["surface_index"],
                **({"asphere_kind": variable["asphere_kind"]} if "asphere_kind" in variable else {}),
                **({"coefficient_index": variable["coefficient_index"]} if "coefficient_index" in variable else {}),
                "value": float(read_target_value(self.opm, variable)),
                **({"min": variable["min"]} if "min" in variable else {}),
                **({"max": variable["max"]} if "max" in variable else {}),
            }
            for variable in self.variables
        ]

    def penalty_residual_vector(self) -> np.ndarray:
        size = max(
            sum(get_nominal_operand_sample_residual_count(operand) for operand in self.operands),
            1,
        )
        return np.full(size, PENALTY_RESIDUAL, dtype=float)

    def residual_objective(self, vector: FloatArray) -> FloatArray:
        try:
            evaluation = self.evaluate(vector)
        except Exception:
            return self.penalty_residual_vector()
        self.progress.record(
            vector,
            evaluation,
            self._progress_reporter,
            context=self.progress_context,
        )
        return np.array([entry["weighted_residual"] for entry in evaluation["residuals"]], dtype=float)

    def scalar_objective(self, vector: FloatArray) -> float:
        try:
            evaluation = self.evaluate(vector)
        except Exception:
            return float(PENALTY_RESIDUAL)
        self.progress.record(
            vector,
            evaluation,
            self._progress_reporter,
            context=self.progress_context,
        )
        return float(evaluation["merit_function"]["sum_of_squares"])

    def glass_scalar_objective(self, vector: FloatArray) -> float:
        """Evaluate scalar merit and normalize non-finite values to ``1e10``.

        Evaluation exceptions deliberately propagate to the dedicated L-BFGS-B
        adapter, which applies the same penalty while leaving ``KeyboardInterrupt``
        available to the glass workflow.
        """
        evaluation = self.evaluate(vector)
        merit = float(evaluation["merit_function"]["sum_of_squares"])
        if not math.isfinite(merit):
            merit = 1e10
            evaluation["merit_function"] = {
                "sum_of_squares": merit,
                "rss": float(math.sqrt(merit)),
            }
        self.progress.record(
            vector,
            evaluation,
            self._progress_reporter,
            context=self.progress_context,
        )
        return merit

    def _to_internal_value(self, variable: VariableConfig, value: float) -> float:
        if variable["kind"] == "radius":
            return radius_to_curvature(value)
        return value

    def _from_internal_value(self, variable: VariableConfig, value: float) -> float:
        if variable["kind"] == "radius":
            return curvature_to_radius(value)
        return value

    def _internal_lower_bound(self, variable: VariableConfig) -> float:
        return min(self._internal_bound_candidates(variable))

    def _internal_upper_bound(self, variable: VariableConfig) -> float:
        return max(self._internal_bound_candidates(variable))

    def _internal_bound_candidates(self, variable: VariableConfig) -> list[float]:
        if "min" not in variable or "max" not in variable:
            return [float("-inf"), float("inf")]
        if variable["kind"] != "radius":
            return [float(variable["min"]), float(variable["max"])]

        candidates = [radius_to_curvature(float(variable["min"])), radius_to_curvature(float(variable["max"]))]
        if float(variable["min"]) <= 0.0 <= float(variable["max"]):
            candidates.append(0.0)
        return candidates
