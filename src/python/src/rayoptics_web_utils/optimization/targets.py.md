# `python/src/rayoptics_web_utils/optimization/targets.py`

## Purpose

Owns the mutable target access layer for optimization variables and pickups, including asphere materialization, target-key helpers, state snapshotting, and radius/curvature transforms.

## Public Surface

```python
snapshot_state(opm: OpticalModel, variable_configs: list[VariableConfig], pickup_configs: list[PickupConfig]) -> dict[TargetKey, SnapshotEntry]
restore_state(opm: OpticalModel, snapshot: dict[TargetKey, SnapshotEntry]) -> None
target_key(entry: MutableTarget) -> TargetKey
entry_from_target_key(key: TargetKey) -> TargetConfig
read_target_value(opm: OpticalModel, entry: MutableTarget) -> float
write_target_value(opm: OpticalModel, entry: MutableTarget, value: float) -> None
radius_to_curvature(radius: float) -> float
curvature_to_radius(curvature: float) -> float
```

## Key Behaviors

- Preserves the current public radius-based config/report contract.
- Keeps internal curvature transforms isolated to radius variables.
- Ensures spherical surfaces can be materialized into supported asphere profiles when referenced by asphere targets.
- Uses package-local typed aliases for target descriptors and snapshot keys instead of bare tuples and dicts.
- Snapshot/restore preserves the full original target descriptor for each mutable target, including `asphere_kind`, so rollback after solver failures can restore asphere values safely.
