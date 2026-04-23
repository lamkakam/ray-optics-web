# `python/src/rayoptics_web_utils/optimization/problem.py`

## Purpose

Provides the algorithm-agnostic `OptimizationProblem` core used by optimization solver adapters. It owns config normalization, variable/pickup application, operand evaluation, merit computation, and progress tracking, but does not call any SciPy solver directly.

## Public Surface

```python
class OptimizationProblem:
    current_vector() -> FloatArray
    bounds() -> tuple[FloatArray, FloatArray]
    apply_vector(values) -> list[PickupReportEntry]
    evaluate(values=None) -> ProblemEvaluation
    residual_objective(vector) -> FloatArray
    scalar_objective(vector) -> float
    variable_state() -> list[VariableStateEntry]
    penalty_residual_vector() -> np.ndarray
```

## Key Behaviors

- Normalizes the incoming config with `config.normalize_config(...)`.
- Keeps variables in radius-based external units while translating radius optimization internally to curvature space.
- Keeps variable-state report entries aligned with the normalized config shape, so `min` / `max` appear only for bounded variables.
- Applies variables, then pickups in dependency order, then calls `opm.update_model()`.
- Evaluates all normalized merit operands and returns the same report shape consumed by the existing public API.
- Expands vector-valued operand outputs into one residual report entry per returned sample, so target-less operands such as `ray_fan` can contribute many least-squares residuals from one normalized field/wavelength selection.
- Exposes both residual-vector and scalar-merit objective methods so future solvers can choose the representation they need.
- For targeted scalar operands, weighted residuals remain `total_weight * (actual - target)`. For target-less vector operands, weighted residuals are `total_weight * sample_value`.
- The penalty residual vector length matches the nominal expanded residual dimension. For `ray_fan`, that means `42` entries per normalized field/wavelength sample so least-squares finite differencing sees a stable residual shape.
- Records progress only when the evaluated optimizer vector changes materially.
- Uses `OpticalModel` plus package-local typed config/report aliases for all internal mappings.

## Dependencies

- `config.py`
- `operands.py`
- `progress.py`
- `targets.py`
