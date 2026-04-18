# `python/src/rayoptics_web_utils/optimization/config.py`

## Purpose

Normalizes and validates optimization config dictionaries for variables, pickups, operands, and optimizer settings before they are bound to an `OptimizationProblem`.

## Public Surface

```python
normalize_config(opm, config: dict) -> dict
normalize_optimizer_config(config: dict) -> dict
normalize_variables(opm, variables: list[dict]) -> list[dict]
normalize_pickups(opm, pickups: list[dict], variable_targets: set[tuple]) -> list[dict]
normalize_merit_function(opm, merit_function: dict) -> dict
pickup_order(pickups: list[dict]) -> list[dict]
```

## Key Behaviors

- Still accepts only `optimizer.kind == "least_squares"` in this refactor.
- Validates variable and pickup target uniqueness and pickup graph acyclicity.
- Expands merit operands into one normalized sample per field/wavelength pair where applicable.
- Keeps validation logic independent from solver execution so future algorithms can reuse the same normalized config.
