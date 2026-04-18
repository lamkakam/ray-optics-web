# `python/src/rayoptics_web_utils/optimization/problem.py`

## Purpose

Provides the algorithm-agnostic `OptimizationProblem` core used by optimization solver adapters. It owns config normalization, variable/pickup application, operand evaluation, merit computation, and progress tracking, but does not call any SciPy solver directly.

## Public Surface

```python
class OptimizationProblem:
    current_vector() -> np.ndarray
    bounds() -> tuple[np.ndarray, np.ndarray]
    apply_vector(values) -> list[dict]
    evaluate(values=None) -> dict
    residual_objective(vector) -> np.ndarray
    scalar_objective(vector) -> float
    variable_state() -> list[dict]
    penalty_residual_vector() -> np.ndarray
```

## Key Behaviors

- Normalizes the incoming config with `config.normalize_config(...)`.
- Keeps variables in radius-based external units while translating radius optimization internally to curvature space.
- Applies variables, then pickups in dependency order, then calls `opm.update_model()`.
- Evaluates all normalized merit operands and returns the same report shape consumed by the existing public API.
- Exposes both residual-vector and scalar-merit objective methods so future solvers can choose the representation they need.
- Records progress only when the evaluated optimizer vector changes materially.

## Dependencies

- `config.py`
- `operands.py`
- `progress.py`
- `targets.py`
