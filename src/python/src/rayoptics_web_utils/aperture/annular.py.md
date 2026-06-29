# `python/src/rayoptics_web_utils/aperture/annular.py`

## Purpose

Provides `Annular`, a RayOptics `Aperture` subclass for circular clear apertures with a circular central obstruction.

## Exports

```python
class Annular(Aperture): ...
```

## Behavior

- Constructor accepts `radius`, `obstruction_radius`, `x_offset`, `y_offset`, and `rotation`.
- `obstruction_radius` must be greater than `0` and smaller than `radius`; invalid construction or resizing raises `ValueError`.
- `dimension()` returns `(radius, radius)` and `max_dimension()` returns `radius`.
- `point_inside(x, y, fuzz)` applies the inherited offset transform, then accepts points between `obstruction_radius` and `radius`.
- `edge_pt_target(rel_dir)` targets the outer radius and includes `x_offset` / `y_offset`.
- `apply_scale_factor(scale_factor)` scales offsets, outer radius, and obstruction radius.
