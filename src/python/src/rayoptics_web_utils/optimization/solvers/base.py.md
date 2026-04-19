# `python/src/rayoptics_web_utils/optimization/solvers/base.py`

## Purpose

Defines the internal solver-adapter contract used to keep algorithm-specific SciPy integration out of the optimization core.

## Public Surface

```python
class SolverAdapter(ABC):
    solve(progress_reporter: ProgressReporter | None = None) -> SolverResult
```

## Key Behaviors

- Accepts a prepared `OptimizationProblem`.
- Returns a normalized solver result mapping consumed by `optimize_opm(...)`.
- Uses a protocol-based dependency so solver adapters can depend on the typed problem contract rather than the concrete class.
