"""Adapt explicit SciPy L-BFGS-B runs to glass optimization problems."""

from __future__ import annotations

import math

import numpy as np
from scipy.optimize import minimize

from rayoptics_web_utils.optimization._types import FloatArray, ProgressReporter, SolverResult


GLASS_OBJECTIVE_PENALTY = 1e10


class LBFGSBSolver:
    """Run one bounded or unbounded continuous glass-candidate refinement.

    This adapter is intentionally absent from ``optimize_opm``'s solver registry.
    It always selects ``L-BFGS-B``, passes optional per-variable bounds, forwards
    ``maxiter`` and ``tol`` explicitly, and converts failed or non-finite objective
    evaluations to the glass-expert penalty.
    """

    def __init__(self, problem, maxiter: int, tol: float):
        self.problem = problem
        self.maxiter = maxiter
        self.tol = tol

    def objective(self, vector: FloatArray) -> float:
        """Return finite scalar merit or the glass-expert penalty."""
        try:
            merit = float(self.problem.glass_scalar_objective(vector))
        except Exception:
            return GLASS_OBJECTIVE_PENALTY
        if not math.isfinite(merit):
            return GLASS_OBJECTIVE_PENALTY
        return merit

    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        """Run one local refinement and apply the returned optimizer vector."""
        x0 = self.problem.current_vector()
        self.problem._progress_reporter = progress_reporter
        try:
            if len(self.problem.variables) == 0:
                merit = self.objective(x0)
                self.problem.apply_vector(x0)
                return {
                    "x": np.array(x0, dtype=float, copy=True),
                    "fun": float(merit),
                    "success": True,
                    "status": 0,
                    "message": "No continuous variables supplied",
                    "nfev": 1,
                    "nit": 0,
                }

            result = minimize(
                self.objective,
                x0,
                method="L-BFGS-B",
                bounds=self.problem.scipy_bounds(),
                options={"maxiter": self.maxiter},
                tol=self.tol,
            )
            self.problem.apply_vector(result.x)
            return {
                "x": np.array(result.x, dtype=float, copy=True),
                "fun": float(result.fun) if math.isfinite(float(result.fun)) else GLASS_OBJECTIVE_PENALTY,
                "success": bool(result.success),
                "status": int(result.status),
                "message": str(result.message),
                "nfev": int(result.nfev),
                "nit": int(result.nit),
            }
        finally:
            self.problem._progress_reporter = None
