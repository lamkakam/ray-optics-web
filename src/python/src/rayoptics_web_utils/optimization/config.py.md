# `python/src/rayoptics_web_utils/optimization/config.py`

## Purpose

Normalizes and validates optimization config dictionaries for variables, pickups, operands, and optimizer settings before they are bound to an `OptimizationProblem`.

## Public Surface

```python
normalize_config(opm: OpticalModel, config: OptimizationConfig) -> NormalizedOptimizationConfig
normalize_optimizer_config(config: OptimizationConfig) -> NormalizedOptimizerConfig
normalize_variables(opm: OpticalModel, variables: list[VariableConfigInput]) -> list[VariableConfig]
normalize_pickups(opm: OpticalModel, pickups: list[PickupConfigInput], variable_targets: set[TargetKey]) -> list[PickupConfig]
normalize_merit_function(opm: OpticalModel, merit_function: MeritFunctionConfigInput) -> MeritFunctionConfig
pickup_order(pickups: list[PickupConfig]) -> list[PickupConfig]
```

## Key Behaviors

- Still accepts only `optimizer.kind == "least_squares"` in this refactor.
- Accepts least-squares methods `trf` and `lm`.
- Validates variable and pickup target uniqueness and pickup graph acyclicity.
- Expands merit operands into one normalized sample per field/wavelength pair where applicable, while preserving optional missing `target` for target-less operands such as `ray_fan`.
- Keeps validation logic independent from solver execution so future algorithms can reuse the same normalized config.
- Annotates `opm` as `rayoptics.environment.OpticalModel` and uses package-local typed dicts instead of generic `dict`.
- Requires `min` / `max` bounds only for bounded methods such as `trf`; `lm` variables may omit both bounds and normalization rejects only partial lm bound shapes.
- Validates the SciPy `lm` dimension rule after merit-function expansion, rejecting configs where the nominal residual count is smaller than the variable count. `ray_fan` contributes `42` nominal residuals per selected field/wavelength pair, matching the fixed-length padded residual vector used at runtime so frontend and backend validation stay aligned with solver behavior.
