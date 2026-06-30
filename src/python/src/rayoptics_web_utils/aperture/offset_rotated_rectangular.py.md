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
- The private coordinate helpers include inline comments describing the surface-origin global frame, aperture-centered rectangle-local frame, global-to-local transform, local-to-global transform, and rotated corner-vector calculation.
- `set_dimension(x, y)` preserves RayOptics-compatible direct resizing for non-equal values by assigning `abs(x)` to `x_half_width` and `abs(y)` to `y_half_width`.
- When `set_dimension(x, y)` is called with equal values, it treats `abs(x)` as a target radius from the surface origin to the farthest rotated, offset rectangle corner. It uniformly scales the current half widths so the existing half-width ratio is preserved.
- Equal-value `set_dimension` computes all four rotated corner vectors and solves for the scale where `max(||offset + scale * corner||)` reaches the target radius. If the target is at or inside the offset radius, the aperture clamps to zero size while leaving offsets and rotation unchanged.
- `apply_scale_factor(scale_factor)` is inherited from `Rectangular`, which scales offsets and half widths while leaving rotation unchanged.
