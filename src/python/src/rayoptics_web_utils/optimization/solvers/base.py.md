# `python/src/rayoptics_web_utils/optimization/solvers/base.py`

## Purpose

Defines the internal solver-adapter contract used to keep algorithm-specific SciPy integration out of the optimization core.

## Public Surface

```python
class SolverAdapter(ABC):
    solve(progress_reporter=None) -> dict
```

## Key Behaviors

- Accepts a prepared `OptimizationProblem`.
- Returns a normalized solver result mapping consumed by `optimize_opm(...)`.
