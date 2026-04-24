# `optimization/`

Operand-based optimization helpers for RayOptics optical models.

## Modules

- [_types.py](./_types.py.md) — Shared typed dicts, aliases, and protocols for optimization configs and reports
- [optimization.py](./optimization.py.md) — Public optimization facade and solver dispatch
- [config.py](./config.py.md) — Config normalization and validation
- [targets.py](./targets.py.md) — Mutable target access and state snapshots
- [operands.py](./operands.py.md) — Merit operand evaluators
- [problem.py](./problem.py.md) — Algorithm-agnostic optimization problem core
- [progress.py](./progress.py.md) — Solver-independent progress tracking
- [solvers/base.py](./solvers/base.py.md) — Solver adapter contract
- [solvers/least_squares.py](./solvers/least_squares.py.md) — SciPy least-squares adapter
- [solvers/differential_evolution.py](./solvers/differential_evolution.py.md) — SciPy differential-evolution adapter
