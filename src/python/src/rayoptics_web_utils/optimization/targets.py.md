# `python/src/rayoptics_web_utils/optimization/targets.py`

## Purpose

Owns the mutable target access layer for optimization variables and pickups, including asphere materialization, target-key helpers, state snapshotting, and radius/curvature transforms.

## Public Surface

```python
snapshot_state(opm, variable_configs: list[dict], pickup_configs: list[dict]) -> dict[tuple, float]
restore_state(opm, snapshot: dict[tuple, float]) -> None
target_key(entry: dict) -> tuple
entry_from_target_key(key: tuple) -> dict
read_target_value(opm, entry: dict) -> float
write_target_value(opm, entry: dict, value: float) -> None
radius_to_curvature(radius: float) -> float
curvature_to_radius(curvature: float) -> float
```

## Key Behaviors

- Preserves the current public radius-based config/report contract.
- Keeps internal curvature transforms isolated to radius variables.
- Ensures spherical surfaces can be materialized into supported asphere profiles when referenced by asphere targets.
