"""Expose dict-driven optical-model optimization.

The facade accepts JSON-safe configs for least-squares or differential-evolution
solvers and returns JSON-safe reports. Radius targets remain radius-valued in the
public contract but are optimized internally as curvature; other targets stay in
direct value space.

Residual weights are ``operand_weight * sqrt(field_weight) *
sqrt(wavelength_weight)``. The merit sum of squares is the sum of squared weighted
residuals and ``rss`` is its square root. Scalar operands expand by selected
field/wavelength samples; ray-fan operands retain fixed, penalty-padded dimensions.
"""

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
from rayoptics_web_utils.optimization.solvers import DifferentialEvolutionSolver, LeastSquaresSolver
from rayoptics_web_utils.optimization.targets import restore_state as _restore_state
from rayoptics_web_utils.optimization.targets import snapshot_state as _snapshot_state

_SOLVER_REGISTRY = {
    "differential_evolution": DifferentialEvolutionSolver,
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


def evaluate_optimization_problem(
    opm: OpticalModel,
    config: OptimizationConfig,
    image_point: str = "chief_ray",
) -> OptimizationReport:
    """Evaluate a dict-driven optimization problem without running SciPy.


    1. Validates and normalizes the config.
    2. Snapshots all variable/pickup targets before mutation.
    3. Applies the current variable vector and then applies pickups in dependency order.
    4. Calls `opm.update_model()`.
    5. Evaluates all operand residuals and returns a JSON-safe report.
    6. If evaluation fails, restores the snapshotted state and re-raises."""
    _sync_legacy_hooks()
    problem = _OptimizationProblem(opm, config, image_point=image_point)
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


def _build_stopped_report(
    problem: _OptimizationProblem,
    initial_values,
) -> OptimizationReport:
    latest_vector = problem.progress.latest_vector
    if latest_vector is None:
        latest_vector = problem.current_vector()

    report = cast(OptimizationReport, problem.evaluate(latest_vector))
    report["success"] = True
    report["status"] = "stopped"
    report["message"] = "Optimization stopped by user"
    report["initial_values"] = initial_values
    report["optimization_progress"] = list(problem.optimization_progress)
    report["optimizer"]["nfev"] = len(problem.optimization_progress)
    if problem.optimizer["kind"] == "least_squares":
        report["optimizer"]["njev"] = 0
        report["optimizer"]["cost"] = float(report["merit_function"]["sum_of_squares"]) / 2.0
        report["optimizer"]["optimality"] = 0.0
    elif problem.optimizer["kind"] == "differential_evolution":
        report["optimizer"]["nit"] = 0
    return report


def optimize_opm(
    opm: OpticalModel,
    config: OptimizationConfig,
    image_point: str = "chief_ray",
    progress_reporter: ProgressReporter | None = None,
) -> OptimizationReport:
    """Optimize a rayoptics optical model using a dict-driven config.


    1. Validates and normalizes the config.
    2. Snapshots all variable/pickup targets before mutation.
    3. Builds the current variable vector and, for bounded solvers, bounds from the config.
    4. Selects the registered solver adapter for `optimizer.kind` and delegates execution to it.
    5. Each objective evaluation:
       - is handled by `_OptimizationProblem.objective(vector)`
       - writes variables
       - applies pickups
       - calls `opm.update_model()`
       - evaluates operand residuals
    6. Exceptions during objective evaluation return a large penalty residual vector (`1e6` per residual, minimum length 1) for residual solvers or a scalar `1e6` penalty for scalar solvers so SciPy can continue.
    7. Leaves `opm` at the optimized state and returns a detailed report including `optimization_progress`.
    8. If SciPy raises `KeyboardInterrupt`, treats it as a user stop, evaluates the latest recorded optimizer vector (or the current vector if no progress was recorded), returns `success == True`, `status == "stopped"`, and `message == "Optimization stopped by user"`, and includes the partial progress history and final values from that latest state.
    9. If SciPy setup or the final evaluation fails for any other exception, restores the snapshotted state and re-raises.

    If there are no variables, `optimize_opm()` skips SciPy, records one progress point from the evaluated merit report, and returns `status == "no_variables"`."""
    _sync_legacy_hooks()
    problem = _OptimizationProblem(opm, config, image_point=image_point)
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
        report["optimizer"]["nfev"] = 0
        if problem.optimizer["kind"] == "least_squares":
            report["optimizer"]["njev"] = 0
            report["optimizer"]["cost"] = float(report["merit_function"]["sum_of_squares"]) / 2.0
            report["optimizer"]["optimality"] = 0.0
        elif problem.optimizer["kind"] == "differential_evolution":
            report["optimizer"]["nit"] = 0
        return report

    try:
        solver = _SOLVER_REGISTRY[problem.optimizer["kind"]](problem)
        result = solver.solve(progress_reporter)
        report = problem.evaluate(result["x"])
    except KeyboardInterrupt:
        return _build_stopped_report(problem, initial_values)
    except Exception:
        _restore_state(opm, snapshot)
        raise

    report = cast(OptimizationReport, report)
    report["success"] = bool(result["success"])
    report["status"] = int(result["status"])
    report["message"] = result["message"]
    report["initial_values"] = initial_values
    for key in ("nfev", "njev", "nit", "cost", "optimality"):
        if key in result:
            report["optimizer"][key] = result[key]
    report["optimization_progress"] = list(problem.optimization_progress)
    return report
