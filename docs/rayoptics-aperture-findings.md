# RayOptics Aperture Findings

Investigation target: `rayoptics.elem.surface` from the project Python venv.

Observed package:

- `rayoptics 0.9.8`
- `src/python/.venv/lib/python3.12/site-packages/rayoptics/elem/surface.py`
- Related paths:
  - `rayoptics/optical/opticalmodel.py`
  - `rayoptics/raytr/raytrace.py`
  - `rayoptics/raytr/vigcalc.py`
  - `rayoptics/seq/interface.py`
  - `rayoptics/seq/sequential.py`
  - `rayoptics/elem/elements.py`

## Model

`Surface` stores two aperture lists:

```python
self.clear_apertures = clear_apertures if clear_apertures else []
self.edge_apertures = edge_apertures if edge_apertures else []
```

`clear_apertures` are optical clipping apertures. They are checked by ray
tracing through `Surface.point_inside()`.

`edge_apertures` are physical or drawing edge apertures. They are used by
`Surface.surface_od()` and `Surface.get_y_aperture_extent()`, which feed listed
surface `sd` values and element layout/render sizing.

## One Aperture Per Surface

The data model permits lists, but the practical usage is one clear aperture per
surface.

If several clear apertures are present, `Surface.point_inside()` combines them
with logical AND:

```python
is_inside = is_inside and ca.point_inside(x, y, fuzz)
```

So multiple clear apertures form an intersection, not a union.

However, `Surface.edge_pt_target()` only uses `clear_apertures[0]` and has a
source comment saying it is hard-wired to one aperture until more are needed.
The Zemax and CODE V readers also generally create or update the current, first,
or last aperture on a surface.

Conclusion: use one active `clear_aperture` per surface unless an explicit
intersection of multiple apertures is intended and ray aiming limitations are
acceptable.

## Dimensions

Aperture dimensions are absolute surface-local coordinates in the lens model's
length units. They are not normalized or relative values.

The ray tracer tests the surface intersection point `(x, y)` directly against
the aperture dimensions:

- `Circular(radius=r)` accepts `sqrt(x*x + y*y) <= r + fuzz`.
- `Rectangular(x_half_width=xh, y_half_width=yh)` accepts
  `abs(x) <= xh + fuzz and abs(y) <= yh + fuzz`.
- `Elliptical(x_half_width=xh, y_half_width=yh)` appears intended to use
  absolute semi-axes, but is incomplete in this venv.

Offsets are also absolute surface-local coordinates:

- `x_offset`
- `y_offset`

`Aperture.apply_scale_factor()` scales offsets, and each concrete aperture
scales its dimensions. That further confirms these are physical/model units.

## Circular

`Circular` is the most complete aperture class.

- Constructor argument: `radius`
- `dimension()` returns `(radius, radius)`
- `max_dimension()` returns `radius`
- `point_inside()` implements circular clipping
- `edge_pt_target()` returns a point at the circular boundary for ray aiming

For a circular clear aperture, `surface_od()` is the radius unless
`edge_apertures` are present.

## Rectangular

`Rectangular` is also usable for clipping.

- Constructor arguments: `x_half_width`, `y_half_width`
- These are half widths, not full widths.
- `dimension()` returns `(x_half_width, y_half_width)`
- `point_inside()` implements axis-aligned rectangular clipping
- `edge_pt_target()` returns
  `(x_half_width * rel_dir[0], y_half_width * rel_dir[1])`

`Rectangular` does not override `max_dimension()`, so it inherits the base
calculation:

```python
sqrt(x_half_width*x_half_width + y_half_width*y_half_width)
```

That means `surface_od()` for a rectangular aperture is the corner radius, not
the larger of the two half widths.

## Elliptical

`Elliptical` is incomplete in the installed venv.

It defines:

- `x_half_width`
- `y_half_width`
- `dimension()`
- `set_dimension()`
- `apply_scale_factor()`

It does not define:

- `point_inside()`
- `edge_pt_target()`

As a result, `Surface(clear_apertures=[Elliptical(...)])` calls the base
`Aperture.point_inside()` stub, which returns `None`. In boolean ray clipping,
that is treated as blocked.

Conclusion: do not use `Elliptical` for actual ray clipping in this venv unless
it is patched or wrapped with a real ellipse membership test and edge target.

## Rotation

`Aperture` stores a `rotation` value, but `Aperture.tform()` only subtracts
`x_offset` and `y_offset`:

```python
x -= self.x_offset
y -= self.y_offset
return x, y
```

No rotation is applied for clipping. `bounding_box()` also ignores rotation.

Conclusion: rectangular and elliptical apertures are effectively axis-aligned in
this installed version.

## `edge_apertures`

`edge_apertures` are not optical clipping limits.

`Surface.surface_od()` uses this priority:

1. If `edge_apertures` exist, use the maximum `edge_aperture.max_dimension()`.
2. Else if `clear_apertures` exist, use the maximum
   `clear_aperture.max_dimension()`.
3. Else use `max_aperture`.

`Surface.get_y_aperture_extent()` has the same priority:

1. If `edge_apertures` exist, use their bounding boxes.
2. Else if `clear_apertures` exist, use their bounding boxes.
3. Else use `[-max_aperture, max_aperture]`.

Element update methods then derive layout size from these APIs. For example,
`Element.update_size()` sets:

```python
self.sd = max(self.s1.surface_od(), self.s2.surface_od())
```

So `edge_apertures` are best understood as mechanical/display edge apertures,
while `clear_apertures` are optical pass apertures.

## Clear Aperture Larger Than Edge Aperture

If a clear aperture is larger than the edge aperture, RayOptics allows an
inconsistent state.

Example behavior observed in the venv:

```python
s = Surface(
    clear_apertures=[Circular(5)],
    edge_apertures=[Circular(3)],
)
```

Results:

- `s.surface_od()` is `3`.
- `s.get_y_aperture_extent()` is `[-3, 3]`.
- `s.point_inside(4, 0)` is `True`.

So the surface is listed and drawn as radius 3, but ray clipping still passes a
ray at radius 4 because `point_inside()` ignores `edge_apertures`.

Practical rule: keep `edge_apertures` at least as large as `clear_apertures`.

## Clear Aperture Larger Than `sd`

The meaning depends on which path produced `sd`.

If no explicit `clear_apertures` exist, `Interface.point_inside()` falls back to
`max_aperture`, which is the usual `sd` value:

```python
sqrt(x*x + y*y) <= self.max_aperture + fuzz
```

If explicit `clear_apertures` exist, `Surface.point_inside()` ignores
`max_aperture` and uses the clear aperture list instead.

Calling `Surface.set_max_aperture(max_ap)` sets `max_aperture` and also resizes
any existing clear apertures:

```python
for ap in self.clear_apertures:
    ap.set_dimension(max_ap, max_ap)
```

So if `sd` is applied through `set_max_aperture()`, existing clear apertures are
mutated to match it. But if a larger clear aperture is assigned after that, or
otherwise exists independently, ray clipping follows the larger clear aperture.

## Interaction With `do_apertures`

`opm['seq_model'].do_apertures` is handled during model updates, not during the
ray-trace aperture check itself.

The update chain is:

```python
OpticalModel.update_optical_properties()
SequentialModel.update_optical_properties()
SequentialModel.set_clear_apertures()
Surface.set_max_aperture(max_ap)
```

`OpticalModel.update_optical_properties()` calls
`self['seq_model'].update_optical_properties(**kwargs)`. The sequential model
then does:

```python
if self.do_apertures:
    if len(self.ifcs) > 2:
        self.set_clear_apertures()
```

`SequentialModel.set_clear_apertures()` traces boundary rays, computes the
largest radial ray coordinate at each interface, and calls:

```python
s.set_max_aperture(max_ap)
```

On `Surface`, that call updates `max_aperture` and resizes every existing
`clear_aperture`:

```python
super().set_max_aperture(max_ap)
for ap in self.clear_apertures:
    ap.set_dimension(max_ap, max_ap)
```

It does not update `edge_apertures`.

Therefore, if all three of `sd`, `clear_apertures`, and `edge_apertures` exist
and `do_apertures` is `True`, the next optical model update can overwrite the
existing clear aperture dimensions with the boundary-ray-derived `max_ap`.
After that update:

- Ray clipping uses the resized `clear_apertures`.
- `max_aperture` stores the same recalculated scalar aperture.
- `edge_apertures` remain unchanged.
- `surface_od()` and `get_y_aperture_extent()` still prefer
  `edge_apertures`, so listed/rendered surface size can still differ from the
  actual ray-clipping aperture.

Example behavior observed in the venv with the exact method that
`do_apertures=True` eventually calls:

```python
s = Surface(
    max_ap=2,
    clear_apertures=[Circular(5)],
    edge_apertures=[Circular(3)],
)

s.set_max_aperture(7)
```

Results:

- Before the call, `max_aperture` is `2`, clear radius is `5`, edge radius is
  `3`, `surface_od()` is `3`, and `point_inside(4, 0)` is `True`.
- After the call, `max_aperture` is `7`, clear radius is `7`, edge radius is
  still `3`, `surface_od()` is still `3`, `point_inside(6, 0)` is `True`, and
  `point_inside(8, 0)` is `False`.

So `do_apertures=True` can make the actual optical pass aperture disagree with
the displayed/listed aperture whenever an `edge_aperture` is present. In that
state, the actual clipping aperture is the recalculated clear aperture, not
`sd` and not the edge aperture.

`set_clear_apertures()` traces its boundary rays without passing
`check_apertures=True`, so it is not constrained by the current
`clear_apertures`, `edge_apertures`, or `sd` clipping state while deriving the
new scalar aperture. It is a recalculation from the optical specification's
boundary rays.

The Zemax and CODE V importers account for this by setting
`sm.do_apertures = False` when imported clear aperture records exist. Otherwise,
a later model update could resize imported clear apertures.

## Interaction With `set_vig(opm)`

`set_vig(opm)` is implemented in `rayoptics.raytr.vigcalc`. It computes field
vignetting by tracing boundary rays with:

```python
check_apertures=True
```

That path calls `Surface.point_inside()`. Therefore:

- `set_vig(opm)` uses `clear_apertures` for clipping.
- `set_vig(opm)` does not use `edge_apertures` as clipping boundaries.
- `set_vig(opm)` does not shrink clear apertures to `sd`.
- If a clear aperture is larger than `sd`, `set_vig(opm)` treats the larger
  clear aperture as the pass aperture.

If no explicit clear aperture exists, the fallback `max_aperture`/`sd` clipping
path applies.

## Related Operations

`set_ape(opm)` is the inverse operation from vignetting to clear apertures. It
traces boundary rays and calls `ifc.set_max_aperture(max_ap)`. On `Surface`,
that also resizes existing clear apertures. It does not resize
`edge_apertures`.

`set_pupil(opm)` uses:

```python
stop_radius = sm.ifcs[sm.stop_surface].surface_od()
```

Because `surface_od()` prefers `edge_apertures`, the stop radius used by
`set_pupil(opm)` can come from an edge aperture even though subsequent aperture
checking still uses clear apertures. A mismatched stop `edge_aperture` and
`clear_aperture` can therefore produce inconsistent pupil/vignetting behavior.

## Practical Recommendations

Use one clear aperture per surface for normal modeling.

Use:

- `Circular(radius=...)` for circular pass apertures.
- `Rectangular(x_half_width=..., y_half_width=...)` for axis-aligned rectangular
  pass apertures.

Avoid `Elliptical` for clipping in this venv unless it is fixed.

Use `edge_apertures` only when the mechanical or rendered surface edge differs
from the optical clear aperture.

If preserving imported or user-authored clear apertures matters, keep
`do_apertures` disabled for that model.

Keep the hierarchy physically consistent:

```text
edge aperture >= clear aperture >= traced ray bundle
```

For stop surfaces, avoid mismatches between `edge_apertures`,
`clear_apertures`, and `max_aperture` because `set_pupil(opm)` and
`set_vig(opm)` read different APIs.
