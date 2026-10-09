"""Adapt SciPy least squares to optimization problems."""

from __future__ import annotations

from typing import Any, cast

import numpy as np
from scipy.optimize import least_squares

from rayoptics_web_utils.optimization._types import (
    NormalizedLeastSquaresOptimizerConfig,
    OptimizationProblemProtocol,
    ProgressReporter,
    SolverResult,
)

from .base import SolverAdapter


def build_least_squares_kwargs(problem: OptimizationProblemProtocol) -> dict[str, Any]:
    """Build SciPy ``least_squares`` keyword arguments for a problem.

    The ``jac`` callable is ``problem.residual_jacobian`` with the same
    optimizer-space bounds SciPy uses for its default finite differences
    (``problem.bounds()`` for ``trf``; unbounded for ``lm``), so Jacobian probes
    neither record progress nor exceed the user-visible ``max_nfev`` budget.
    ``bounds`` is passed to SciPy only for ``trf``.

    Args:
        problem: Optimization problem with a normalized least-squares optimizer.

    Returns:
        Keyword arguments excluding the objective and initial vector.
    """
    # Only problems normalized for the least-squares optimizer reach this adapter.
    method = cast("NormalizedLeastSquaresOptimizerConfig", problem.optimizer)["method"]
    kwargs: dict[str, Any] = {
        "method": method,
        "ftol": problem.optimizer.get("ftol", 1e-8),
        "xtol": problem.optimizer.get("xtol", 1e-8),
        "gtol": problem.optimizer.get("gtol", 1e-8),
        "max_nfev": problem.optimizer.get("max_nfev", 200),
    }
    if method == "trf":
        jacobian_bounds = problem.bounds()
        kwargs["bounds"] = jacobian_bounds
    else:
        jacobian_bounds = (-np.inf, np.inf)
    kwargs["jac"] = lambda vector: problem.residual_jacobian(vector, jacobian_bounds)
    return kwargs


class LeastSquaresSolver(SolverAdapter):
    """Run ``scipy.optimize.least_squares`` against an optimization problem.


    Implements the current SciPy least-squares optimization as a solver adapter.

    - Calls `scipy.optimize.least_squares(...)`.
    - Uses `OptimizationProblem.residual_objective(...)` as the solver objective.
    - Passes SciPy `bounds=(lower, upper)` only for bounded least-squares methods such as `trf`; omits the `bounds` argument for `lm`.
    - Passes `jac=` backed by `OptimizationProblem.residual_jacobian(...)`, which reproduces SciPy's default 2-point estimate without recording progress, so progress entries never exceed `max_nfev`. Config validation rejects `lm` budgets below 2 because MINPACK always evaluates one trial step after the initial point.
    - Returns a normalized result mapping with least-squares-specific metadata:
      - `x`
      - `success`
      - `status`
      - `message`
      - `nfev`
      - `njev`
      - `cost`
      - `optimality`"""

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        x0 = self.problem.current_vector()
        self.problem._progress_reporter = progress_reporter
        try:
            result = least_squares(
                self.problem.residual_objective,
                x0,
                **build_least_squares_kwargs(self.problem),
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
