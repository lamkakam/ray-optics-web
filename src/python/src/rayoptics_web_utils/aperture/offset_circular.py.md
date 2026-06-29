# `python/src/rayoptics_web_utils/aperture/offset_circular.py`

## Purpose

Provides `OffsetCircular`, a small RayOptics `Circular` subclass for circular apertures whose ray-aiming edge target must include `x_offset` and `y_offset`.

RayOptics `Circular.point_inside()` already applies the aperture transform and remains correct for offset apertures. Its `edge_pt_target()` ignores offsets, so this subclass overrides only that method.

## Exports

```python
class OffsetCircular(Circular): ...
```

## Behavior

- Inherits construction, offset storage, transforms, and `point_inside()` from `rayoptics.elem.surface.Circular`.
- `edge_pt_target(rel_dir)` returns a two-item list:
  - `x_offset + radius * rel_dir[0]`
  - `y_offset + radius * rel_dir[1]`
- Expects `rel_dir` to provide at least two numeric entries, matching the base class contract.
