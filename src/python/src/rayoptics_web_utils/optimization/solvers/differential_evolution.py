"""SciPy differential-evolution solver adapter."""

from __future__ import annotations

from scipy.optimize import differential_evolution

from rayoptics_web_utils.optimization._types import ProgressReporter, SolverResult

from .base import SolverAdapter


class DifferentialEvolutionSolver(SolverAdapter):
    """Run ``scipy.optimize.differential_evolution`` against an optimization problem."""

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        lower, upper = self.problem.bounds()
        bounds = list(zip(lower.tolist(), upper.tolist(), strict=True))
        self.problem._progress_reporter = progress_reporter
        try:
            result = differential_evolution(
                func=self.problem.scalar_objective,
                bounds=bounds,
                strategy=self.problem.optimizer.get("strategy", "best1bin"),
                maxiter=self.problem.optimizer.get("maxiter", 1000),
                popsize=self.problem.optimizer.get("popsize", 15),
                tol=self.problem.optimizer.get("tol", 0.01),
                mutation=self.problem.optimizer.get("mutation", (0.5, 1)),
                recombination=self.problem.optimizer.get("recombination", 0.7),
                seed=self.problem.optimizer.get("seed"),
                polish=self.problem.optimizer.get("polish", True),
                init=self.problem.optimizer.get("init", "latinhypercube"),
                atol=self.problem.optimizer.get("atol", 0.0),
            )
            return {
                "x": result.x,
                "success": bool(result.success),
                "status": result.status,
                "message": result.message,
                "nfev": int(result.nfev),
                "nit": int(result.nit),
            }
        finally:
            self.problem._progress_reporter = None
