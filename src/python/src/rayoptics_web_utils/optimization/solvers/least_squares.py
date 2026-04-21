"""SciPy least-squares solver adapter."""

from __future__ import annotations

from scipy.optimize import least_squares

from rayoptics_web_utils.optimization._types import ProgressReporter, SolverResult

from .base import SolverAdapter


class LeastSquaresSolver(SolverAdapter):
    """Run ``scipy.optimize.least_squares`` against an optimization problem."""

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        x0 = self.problem.current_vector()
        lower, upper = self.problem.bounds()
        self.problem._progress_reporter = progress_reporter
        try:
            result = least_squares(
                self.problem.residual_objective,
                x0,
                bounds=(lower, upper),
                method=self.problem.optimizer["method"],
                ftol=self.problem.optimizer.get("ftol", 1e-8),
                xtol=self.problem.optimizer.get("xtol", 1e-8),
                gtol=self.problem.optimizer.get("gtol", 1e-8),
                max_nfev=self.problem.optimizer.get("max_nfev", 200),
            )
            return {
                "x": result.x,
                "success": bool(result.success),
                "status": result.status,
                "message": result.message,
                "nfev": int(result.nfev),
                "njev": int(result.njev) if result.njev is not None else 0,
                "cost": float(result.cost),
                "optimality": float(result.optimality),
            }
        finally:
            self.problem._progress_reporter = None
