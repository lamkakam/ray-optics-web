"""Adapt SciPy least squares to optimization problems."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Self, cast

import numpy as np
from scipy.optimize import least_squares

from rayoptics_web_utils.optimization._types import (
    FloatArray,
    NormalizedLeastSquaresOptimizerConfig,
    OptimizationProblemProtocol,
    ProgressReporter,
    SolverResult,
)

from .base import SolverAdapter


@dataclass(frozen=True)
class VariableScaling:
    """Affine map between optimizer vectors ``x`` and the scaled vectors ``u`` SciPy solves for.

    ``x = offset + u * width`` per variable. SciPy's default finite-difference
    step is ``1.5e-8 * max(1, |u|)`` absolute and its trust region and ``xtol``
    test are measured in ``u``, so without scaling a variable whose useful range
    is far below one (such as an r⁶ asphere coefficient near ``1e-15``) gets a
    meaningless Jacobian and the run stops at once with ``xtol`` termination.

    - ``trf``: a variable with finite bounds ``lower < upper`` maps to
      ``u in [0, 1]`` (``offset = lower``, ``width = upper - lower``).
    - ``lm`` (no bounds), and ``trf`` variables without finite bounds:
      ``offset = 0`` and ``width`` is the variable's natural unit from
      ``problem.natural_units()``, so one unit of ``u`` moves the edge sag by
      about one model unit for curvatures and polynomial asphere terms.

    Attributes:
        offset: Optimizer value at ``u = 0``.
        width: Optimizer change per unit of ``u``; always positive.
        lower: Optimizer-space lower bounds (``-inf`` when unbounded).
        upper: Optimizer-space upper bounds (``inf`` when unbounded).
    """

    offset: FloatArray
    width: FloatArray
    lower: FloatArray
    upper: FloatArray

    @classmethod
    def for_problem(cls, problem: OptimizationProblemProtocol) -> Self:
        """Build the scaling for a problem with a normalized least-squares optimizer.

        Args:
            problem: Optimization problem with a normalized least-squares optimizer.

        Returns:
            Scaling whose solver bounds SciPy receives for ``trf``.
        """
        width = np.array(problem.natural_units(), dtype=float)
        offset = np.zeros_like(width)
        lower = np.full_like(width, -np.inf)
        upper = np.full_like(width, np.inf)
        # Only problems normalized for the least-squares optimizer reach this adapter.
        if cast("NormalizedLeastSquaresOptimizerConfig", problem.optimizer)["method"] == "trf":
            lower, upper = (np.array(bound, dtype=float) for bound in problem.bounds())
            bounded = np.isfinite(lower) & np.isfinite(upper) & (upper > lower)
            offset = np.where(bounded, lower, 0.0)
            width = np.where(bounded, upper - lower, width)
        return cls(offset=offset, width=width, lower=lower, upper=upper)

    def solver_bounds(self) -> tuple[FloatArray, FloatArray]:
        """Return the lower and upper bounds of ``u``."""
        return (self.lower - self.offset) / self.width, (self.upper - self.offset) / self.width

    def to_solver(self, vector: FloatArray) -> FloatArray:
        """Map an optimizer vector to ``u``, clipped so round-off never leaves the solver bounds."""
        lower, upper = self.solver_bounds()
        return np.clip((np.asarray(vector, dtype=float) - self.offset) / self.width, lower, upper)

    def to_problem(self, vector: FloatArray) -> FloatArray:
        """Map ``u`` to an optimizer vector, clipped so round-off never leaves the optimizer bounds."""
        return np.clip(self.offset + np.asarray(vector, dtype=float) * self.width, self.lower, self.upper)


def build_least_squares_kwargs(
    problem: OptimizationProblemProtocol,
    scaling: VariableScaling | None = None,
) -> dict[str, Any]:
    """Build SciPy ``least_squares`` keyword arguments for a problem.

    The ``jac`` callable is ``problem.residual_jacobian`` with the same
    solver-space bounds SciPy uses for its default finite differences
    (the scaled ``problem.bounds()`` for ``trf``; unbounded for ``lm``), so Jacobian
    probes neither record progress nor exceed the user-visible ``max_nfev`` budget.
    ``bounds`` is passed to SciPy only for ``trf``.

    Args:
        problem: Optimization problem with a normalized least-squares optimizer.
        scaling: Map between optimizer and solver vectors. ``None`` keeps SciPy in
            optimizer space, as the legacy compatibility ``optimize`` does.

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
    jacobian_bounds: tuple[FloatArray | float, FloatArray | float]
    if method == "trf":
        jacobian_bounds = scaling.solver_bounds() if scaling is not None else problem.bounds()
        kwargs["bounds"] = jacobian_bounds
    else:
        jacobian_bounds = (-np.inf, np.inf)
    to_problem = scaling.to_problem if scaling is not None else None
    kwargs["jac"] = lambda vector: problem.residual_jacobian(vector, jacobian_bounds, to_problem)
    return kwargs


class LeastSquaresSolver(SolverAdapter):
    """Run ``scipy.optimize.least_squares`` against an optimization problem.


    Implements the current SciPy least-squares optimization as a solver adapter.

    - Calls `scipy.optimize.least_squares(...)` on scaled variables `u` from `VariableScaling.for_problem(...)`: bounded `trf` variables are normalized by their bounds to `[0, 1]`, and `lm` variables (and `trf` variables without finite bounds) are divided by their natural units, so variables whose useful range is far below one, such as high-order asphere coefficients, still get meaningful finite-difference steps, trust regions and `xtol` tests.
    - Uses `OptimizationProblem.residual_objective(...)` on `VariableScaling.to_problem(u)` as the solver objective, so progress records optimizer-space vectors.
    - Passes SciPy `bounds` (the scaled bounds) only for bounded least-squares methods such as `trf`; omits the `bounds` argument for `lm`.
    - Passes `jac=` backed by `OptimizationProblem.residual_jacobian(...)` in the scaled space, which reproduces SciPy's default 2-point estimate without recording progress, so progress entries never exceed `max_nfev`. Config validation rejects `lm` budgets below 2 because MINPACK always evaluates one trial step after the initial point.
    - Returns a normalized result mapping with least-squares-specific metadata; `x` is mapped back to optimizer space:
      - `x`
      - `success`
      - `status`
      - `message`
      - `nfev`
      - `njev`
      - `cost`
      - `optimality`"""

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        scaling = VariableScaling.for_problem(self.problem)
        u0 = scaling.to_solver(self.problem.current_vector())
        self.problem._progress_reporter = progress_reporter
        try:
            result = least_squares(
                lambda vector: self.problem.residual_objective(scaling.to_problem(vector)),
                u0,
                **build_least_squares_kwargs(self.problem, scaling),
            )
            return {
                "x": scaling.to_problem(result.x),
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
