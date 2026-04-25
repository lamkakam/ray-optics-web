# `python/src/rayoptics_web_utils/optimization/solvers/differential_evolution.py`

## Purpose

Implements SciPy differential evolution as a solver adapter for scalar-merit optimization problems.

## Public Surface

```python
class DifferentialEvolutionSolver(SolverAdapter):
    solve(progress_reporter: ProgressReporter | None = None) -> SolverResult
```

## Key Behaviors

- Calls `scipy.optimize.differential_evolution(...)`.
- Uses `OptimizationProblem.scalar_objective(...)` as the solver objective.
- Converts `OptimizationProblem.bounds()` into SciPy's per-dimension `(min, max)` sequence.
- Supports the SciPy 1.14.1-compatible DE options:
  - `strategy`
  - `max_nfev` as the public/internal function-evaluation budget; the adapter translates it into SciPy's generation-count `maxiter` using `popsize * variable_count`
  - `popsize`
  - `tol`
  - `mutation`
  - `recombination`
  - `seed`
  - `polish` (defaults to `False` so the configured evaluation budget is not extended by an extra local-search phase)
  - `init`
  - `atol`
- Leaves unsupported SciPy features such as `workers`, `vectorized`, `updating`, `constraints`, `integrality`, `callback`, and `x0` out of scope for this adapter.
- Returns a normalized result mapping with:
  - `x`
  - `success`
  - `status` (uses SciPy's value when present, otherwise falls back to `1` for success and `0` for failure)
  - `message`
  - `nfev`
  - `nit`
