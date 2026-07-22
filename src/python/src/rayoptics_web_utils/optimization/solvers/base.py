"""# `python/src/rayoptics_web_utils/optimization/solvers/base.py`

## Public Surface

```python
class SolverAdapter(ABC):
    solve(progress_reporter: ProgressReporter | None = None) -> SolverResult
```

Base types for optimization solver adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rayoptics_web_utils.optimization._types import OptimizationProblemProtocol, ProgressReporter, SolverResult


class SolverAdapter(ABC):
    """Adapter that runs one optimization algorithm against a problem.

    ## Purpose

    Defines the internal solver-adapter contract used to keep algorithm-specific SciPy integration out of the optimization core.

    ## Key Behaviors

    - Accepts a prepared `OptimizationProblem`.
    - Returns a normalized solver result mapping consumed by `optimize_opm(...)`.
    - Uses a protocol-based dependency so solver adapters can depend on the typed problem contract rather than the concrete class."""

    def __init__(self, problem: OptimizationProblemProtocol):
        self.problem = problem

    @abstractmethod
    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        """Run the solver and return a normalized result mapping."""
