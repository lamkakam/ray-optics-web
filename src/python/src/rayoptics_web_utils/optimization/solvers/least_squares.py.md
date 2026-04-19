# `python/src/rayoptics_web_utils/optimization/solvers/least_squares.py`

## Purpose

Implements the current SciPy least-squares optimization as a solver adapter.

## Public Surface

```python
class LeastSquaresSolver(SolverAdapter):
    solve(progress_reporter: ProgressReporter | None = None) -> SolverResult
```

## Key Behaviors

- Calls `scipy.optimize.least_squares(...)`.
- Uses `OptimizationProblem.residual_objective(...)` as the solver objective.
- Returns a normalized result mapping with:
  - `x`
  - `success`
  - `status`
  - `message`
  - `nfev`
  - `njev`
  - `cost`
  - `optimality`
