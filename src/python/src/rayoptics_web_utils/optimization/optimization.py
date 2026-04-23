"""Operand-based optimization helpers for rayoptics optical models."""

from __future__ import annotations

from typing import cast

from scipy.optimize import least_squares
from rayoptics.environment import OpticalModel

import rayoptics_web_utils.optimization.operands as _operands_module
from rayoptics_web_utils.analysis import get_opd_fan_data
from rayoptics_web_utils.optimization._types import (
    FloatArray,
    OptimizationConfig,
    OptimizationReport,
    ProblemEvaluation,
    ProgressReporter,
)
from rayoptics_web_utils.optimization.operands import (
    OPERAND_REGISTRY as _OPERAND_REGISTRY,
)
from rayoptics_web_utils.optimization.problem import OptimizationProblem
from rayoptics_web_utils.optimization.solvers import LeastSquaresSolver
from rayoptics_web_utils.optimization.targets import restore_state as _restore_state
from rayoptics_web_utils.optimization.targets import snapshot_state as _snapshot_state

_SOLVER_REGISTRY = {
    "least_squares": LeastSquaresSolver,
}


def _sync_legacy_hooks() -> None:
    _operands_module.get_opd_fan_data = get_opd_fan_data


class _OptimizationProblem(OptimizationProblem):
    """Compatibility subclass retained for tests and internal imports."""

    def objective(self, vector: FloatArray) -> FloatArray:
        return self.residual_objective(vector)

    def _record_progress(self, vector: FloatArray, evaluation: ProblemEvaluation) -> bool:
        return self.progress.record(vector, evaluation, self._progress_reporter)

    def optimize(self, progress_reporter: ProgressReporter | None = None):
        x0 = self.current_vector()
        self._progress_reporter = progress_reporter
        try:
            least_squares_kwargs = {
                "method": self.optimizer["method"],
                "ftol": self.optimizer.get("ftol", 1e-8),
                "xtol": self.optimizer.get("xtol", 1e-8),
                "gtol": self.optimizer.get("gtol", 1e-8),
                "max_nfev": self.optimizer.get("max_nfev", 200),
            }
            if self.optimizer["method"] == "trf":
                lower, upper = self.bounds()
                least_squares_kwargs["bounds"] = (lower, upper)
            return least_squares(
                self.objective,
                x0,
                **least_squares_kwargs,
            )
        finally:
            self._progress_reporter = None


def evaluate_optimization_problem(opm: OpticalModel, config: OptimizationConfig) -> OptimizationReport:
    """Evaluate a dict-driven optimization problem without running SciPy."""
    _sync_legacy_hooks()
    problem = _OptimizationProblem(opm, config)
    snapshot = _snapshot_state(opm, problem.variables, problem.pickups)
    initial_values = problem.variable_state()
    try:
        report = problem.evaluate()
    except Exception:
        _restore_state(opm, snapshot)
        raise
    report = cast(OptimizationReport, report)
    report["success"] = True
    report["status"] = "evaluated"
    report["message"] = "Optimization problem evaluated"
    report["initial_values"] = initial_values
    report["optimization_progress"] = []
    return report


def optimize_opm(
    opm: OpticalModel,
    config: OptimizationConfig,
    progress_reporter: ProgressReporter | None = None,
) -> OptimizationReport:
    """Optimize a rayoptics optical model using a dict-driven config."""
    _sync_legacy_hooks()
    problem = _OptimizationProblem(opm, config)
    snapshot = _snapshot_state(opm, problem.variables, problem.pickups)
    initial_values = problem.variable_state()

    if len(problem.variables) == 0:
        report = cast(OptimizationReport, problem.evaluate())
        problem.progress.record(problem.current_vector(), report, progress_reporter)
        report["success"] = True
        report["status"] = "no_variables"
        report["message"] = "No optimization variables supplied"
        report["initial_values"] = initial_values
        report["optimization_progress"] = list(problem.optimization_progress)
        report["optimizer"].update({"nfev": 0, "njev": 0})
        return report

    try:
        solver = _SOLVER_REGISTRY[problem.optimizer["kind"]](problem)
        result = solver.solve(progress_reporter)
        report = problem.evaluate(result["x"])
    except Exception:
        _restore_state(opm, snapshot)
        raise

    report = cast(OptimizationReport, report)
    report["success"] = bool(result["success"])
    report["status"] = int(result["status"])
    report["message"] = result["message"]
    report["initial_values"] = initial_values
    report["optimizer"].update(
        {
            "nfev": int(result["nfev"]),
            "njev": int(result["njev"]),
            "cost": float(result["cost"]),
            "optimality": float(result["optimality"]),
        }
    )
    report["optimization_progress"] = list(problem.optimization_progress)
    return report
