# `python/src/rayoptics_web_utils/aperture/offset_rotated_rectangular.py`

## Purpose

Provides `OffsetRotatedRectangular`, a RayOptics `Rectangular` subclass for rectangular apertures whose point containment and ray-aiming edge targets must account for both offsets and rotation.

## Exports

```python
class OffsetRotatedRectangular(Rectangular): ...
```

## Behavior

- Constructor behavior is inherited from `rayoptics.elem.surface.Rectangular`; accepted keyword arguments include `x_half_width`, `y_half_width`, `x_offset`, `y_offset`, and `rotation`.
- `rotation` is interpreted in degrees.
- `point_inside(x, y, fuzz)` subtracts `x_offset` and `y_offset`, inverse-rotates the point into the rectangle's local coordinates, and checks against `x_half_width` and `y_half_width` with fuzz.
- `edge_pt_target(rel_dir)` computes the local edge target from the half widths, rotates it into global coordinates, and then adds offsets.
- `apply_scale_factor(scale_factor)` is inherited from `Rectangular`, which scales offsets and half widths while leaving rotation unchanged.
