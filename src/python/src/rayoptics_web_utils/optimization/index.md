# `optimization/`

Operand-based optimization helpers for RayOptics optical models.

## Modules

- [_types.py](./_types.py) — Shared typed dicts, aliases, and protocols for optimization configs and reports
- [optimization.py](./optimization.py) — Public optimization facade and solver dispatch
- [config.py](./config.py) — Config normalization and validation
- [targets.py](./targets.py) — Mutable target access and state snapshots
- [operands.py](./operands.py) — Merit operand evaluators
- [problem.py](./problem.py) — Algorithm-agnostic optimization problem core
- [progress.py](./progress.py) — Solver-independent progress tracking
- [solvers/base.py](./solvers/base.py) — Solver adapter contract
- [solvers/least_squares.py](./solvers/least_squares.py) — SciPy least-squares adapter
- [solvers/differential_evolution.py](./solvers/differential_evolution.py) — SciPy differential-evolution adapter
