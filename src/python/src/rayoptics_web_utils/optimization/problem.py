"""Algorithm-agnostic optimization problem model."""

from __future__ import annotations

import math

import numpy as np

from .config import normalize_config, pickup_order
from .operands import OPERAND_REGISTRY, PENALTY_RESIDUAL
from .progress import OptimizationProgress
from .targets import (
    curvature_to_radius,
    radius_to_curvature,
    read_target_value,
    write_target_value,
)


class OptimizationProblem:
    """Validated optimization problem bound to an optical model."""

    def __init__(self, opm, config: dict):
        self.opm = opm
        self.config = normalize_config(opm, config)
        self.variables = self.config["variables"]
        self.pickups = self.config["pickups"]
        self.ordered_pickups = pickup_order(self.pickups)
        self.optimizer = self.config["optimizer"]
        self.operands = self.config["merit_function"]["operands"]
        self.progress = OptimizationProgress()
        self.optimization_progress = self.progress.entries
        self._progress_reporter = None

    def current_vector(self) -> np.ndarray:
        return np.array(
            [self._to_internal_value(variable, read_target_value(self.opm, variable)) for variable in self.variables],
            dtype=float,
        )

    def bounds(self) -> tuple[np.ndarray, np.ndarray]:
        if len(self.variables) == 0:
            return np.array([], dtype=float), np.array([], dtype=float)
        lower = np.array([self._internal_lower_bound(variable) for variable in self.variables], dtype=float)
        upper = np.array([self._internal_upper_bound(variable) for variable in self.variables], dtype=float)
        return lower, upper

    def apply_vector(self, values: np.ndarray | list[float]) -> list[dict]:
        for value, variable in zip(values, self.variables):
            write_target_value(self.opm, variable, self._from_internal_value(variable, float(value)))
        pickup_reports: list[dict] = []
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

    def evaluate(self, values: np.ndarray | list[float] | None = None) -> dict:
        if values is None:
            values = self.current_vector()
        pickups = self.apply_vector(values)
        residuals: list[dict] = []
        weighted_values: list[float] = []
        for operand in self.operands:
            evaluator = OPERAND_REGISTRY[operand["kind"]]
            actual = float(
                evaluator(
                    self.opm,
                    operand["field_index"],
                    operand["wavelength_index"],
                    operand["options"],
                )
            )
            total_weight = operand["weight"] * math.sqrt(operand["field_weight"]) * math.sqrt(operand["wavelength_weight"])
            weighted_residual = total_weight * (actual - operand["target"])
            residuals.append(
                {
                    "kind": operand["kind"],
                    "target": operand["target"],
                    "value": actual,
                    "field_index": operand["field_index"],
                    "wavelength_index": operand["wavelength_index"],
                    "operand_weight": operand["weight"],
                    "field_weight": operand["field_weight"],
                    "wavelength_weight": operand["wavelength_weight"],
                    "total_weight": float(total_weight),
                    "weighted_residual": float(weighted_residual),
                }
            )
            weighted_values.append(float(weighted_residual))

        sum_of_squares = float(sum(value ** 2 for value in weighted_values))
        rss = float(math.sqrt(sum_of_squares))
        return {
            "optimizer": {"kind": self.optimizer["kind"], "method": self.optimizer["method"]},
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

    def variable_state(self) -> list[dict]:
        return [
            {
                "kind": variable["kind"],
                "surface_index": variable["surface_index"],
                **({"asphere_kind": variable["asphere_kind"]} if "asphere_kind" in variable else {}),
                **({"coefficient_index": variable["coefficient_index"]} if "coefficient_index" in variable else {}),
                "value": float(read_target_value(self.opm, variable)),
                "min": variable["min"],
                "max": variable["max"],
            }
            for variable in self.variables
        ]

    def penalty_residual_vector(self) -> np.ndarray:
        size = max(len(self.operands), 1)
        return np.full(size, PENALTY_RESIDUAL, dtype=float)

    def residual_objective(self, vector: np.ndarray) -> np.ndarray:
        try:
            evaluation = self.evaluate(vector)
        except Exception:
            return self.penalty_residual_vector()
        self.progress.record(vector, evaluation, self._progress_reporter)
        return np.array([entry["weighted_residual"] for entry in evaluation["residuals"]], dtype=float)

    def scalar_objective(self, vector: np.ndarray) -> float:
        try:
            evaluation = self.evaluate(vector)
        except Exception:
            return float(PENALTY_RESIDUAL)
        self.progress.record(vector, evaluation, self._progress_reporter)
        return float(evaluation["merit_function"]["sum_of_squares"])

    def _to_internal_value(self, variable: dict, value: float) -> float:
        if variable["kind"] == "radius":
            return radius_to_curvature(value)
        return value

    def _from_internal_value(self, variable: dict, value: float) -> float:
        if variable["kind"] == "radius":
            return curvature_to_radius(value)
        return value

    def _internal_lower_bound(self, variable: dict) -> float:
        return min(self._internal_bound_candidates(variable))

    def _internal_upper_bound(self, variable: dict) -> float:
        return max(self._internal_bound_candidates(variable))

    def _internal_bound_candidates(self, variable: dict) -> list[float]:
        if variable["kind"] != "radius":
            return [float(variable["min"]), float(variable["max"])]

        candidates = [radius_to_curvature(float(variable["min"])), radius_to_curvature(float(variable["max"]))]
        if float(variable["min"]) <= 0.0 <= float(variable["max"]):
            candidates.append(0.0)
        return candidates
