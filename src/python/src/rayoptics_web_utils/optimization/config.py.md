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
- Validates variable and pickup target uniqueness and pickup graph acyclicity.
- Expands merit operands into one normalized sample per field/wavelength pair where applicable.
- Keeps validation logic independent from solver execution so future algorithms can reuse the same normalized config.
- Annotates `opm` as `rayoptics.environment.OpticalModel` and uses package-local typed dicts instead of generic `dict`.
