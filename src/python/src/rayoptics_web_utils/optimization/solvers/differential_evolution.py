"""Adapt SciPy differential evolution to optimization problems."""

from __future__ import annotations

from scipy.optimize import differential_evolution

from rayoptics_web_utils.optimization._types import ProgressReporter, SolverResult
from rayoptics_web_utils.optimization.config import (
    DIFFERENTIAL_EVOLUTION_DEFAULT_POPSIZE,
    differential_evolution_population_size,
)

from .base import SolverAdapter


def _maxiter_for_evaluation_budget(max_nfev: int | None, population_size: int) -> int:
    """Translate an evaluation budget into SciPy's generation count.

    SciPy evaluates ``population_size * (maxiter + 1)`` candidates (the initial
    population plus one population per generation), so the largest ``maxiter``
    that stays within ``max_nfev`` is ``max_nfev // population_size - 1``.

    Args:
        max_nfev: Evaluation budget, or ``None`` for SciPy's default ``maxiter``.
        population_size: Members evaluated per generation.

    Returns:
        Non-negative SciPy ``maxiter``.
    """
    if max_nfev is None:
        return 1000
    return max(0, (max_nfev // population_size) - 1)


class DifferentialEvolutionSolver(SolverAdapter):
    """Run ``scipy.optimize.differential_evolution`` against an optimization problem.


    Implements SciPy differential evolution as a solver adapter for scalar-merit optimization problems.

    - Calls `scipy.optimize.differential_evolution(...)`.
    - Uses `OptimizationProblem.scalar_objective(...)` as the solver objective.
    - Converts `OptimizationProblem.bounds()` into SciPy's per-dimension `(min, max)` sequence.
    - Supports the SciPy 1.14.1-compatible DE options:
      - `strategy`
      - `max_nfev` as the public/internal function-evaluation budget, including the initial population; the adapter translates it into SciPy's generation-count `maxiter` using SciPy's actual population size (`config.differential_evolution_population_size(...)`, which applies SciPy's minimum of 5 members, excludes equal-bound variables, rounds `init="sobol"` populations up to a power of two, and honors an array `init`). Config validation guarantees the budget covers at least one population
      - `popsize`
      - `tol`
      - `mutation`
      - `recombination`
      - `seed`
      - `polish` (defaults to `False` so the configured evaluation budget is not extended by an extra local-search phase; `polish=True` evaluations fall outside the budget)
      - `init`
      - `atol`
    - Leaves unsupported SciPy features such as `workers`, `vectorized`, `updating`, `constraints`, `integrality`, `callback`, and `x0` out of scope for this adapter.
    - Returns a normalized result mapping with:
      - `x`
      - `success`
      - `status` (uses SciPy's value when present, otherwise falls back to `1` for success and `0` for failure)
      - `message`
      - `nfev`
      - `nit`"""

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        lower, upper = self.problem.bounds()
        bounds = list(zip(lower.tolist(), upper.tolist(), strict=True))
        popsize = self.problem.optimizer.get("popsize", DIFFERENTIAL_EVOLUTION_DEFAULT_POPSIZE)
        self.problem._progress_reporter = progress_reporter
        try:
            result = differential_evolution(
                func=self.problem.scalar_objective,
                bounds=bounds,
                strategy=self.problem.optimizer.get("strategy", "best1bin"),
                maxiter=_maxiter_for_evaluation_budget(
                    self.problem.optimizer.get("max_nfev"),
                    differential_evolution_population_size(self.problem.optimizer, self.problem.variables),
                ),
                popsize=popsize,
                tol=self.problem.optimizer.get("tol", 0.01),
                mutation=self.problem.optimizer.get("mutation", (0.5, 1)),
                recombination=self.problem.optimizer.get("recombination", 0.7),
                # SciPy 1.17 declares ``rng``; ``seed`` remains its legacy alias and
                # keeps the RandomState stream seeded configurations reproduce.
                seed=self.problem.optimizer.get("seed"),  # pyright: ignore[reportCallIssue]
                polish=self.problem.optimizer.get("polish", False),
                init=self.problem.optimizer.get("init", "latinhypercube"),
                atol=self.problem.optimizer.get("atol", 0.0),
            )
            return {
                "x": result.x,
                "success": bool(result.success),
                "status": getattr(result, "status", 1 if result.success else 0),
                "message": result.message,
                "nfev": int(result.nfev),
                "nit": int(result.nit),
            }
        finally:
            self.problem._progress_reporter = None
