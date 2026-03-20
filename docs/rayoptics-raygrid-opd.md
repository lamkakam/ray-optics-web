# RayGrid and OPD Implementation in rayoptics

Investigation of the `RayGrid` class and wavefront/OPD calculation in
rayoptics (v0.27.7). Key source files:

- `rayoptics/raytr/analyses.py` — `RayGrid` class (line 585)
- `rayoptics/raytr/waveabr.py` — OPD and reference sphere calculations
- `rayoptics/raytr/trace.py` — `trace_base`, `setup_pupil_coords`
- `rayoptics/raytr/opticalspec.py` — `ray_start_from_osp` (pupil → ray start)

## 1. Wavefront evaluation surface when `foc = 0`

**The wavefront is evaluated at the image surface** (the chief ray's
intersection with the last surface).

When `foc=0` and no explicit `image_pt_2d` is given, `calculate_reference_sphere`
(`waveabr.py:53-56`) computes:

```python
dist = foc / cr.ray[-1][mc.d][2]          # = 0 when foc = 0
image_pt = cr.ray[-1][mc.p] + dist * cr.ray[-1][mc.d]  # chief ray hit on image
```

`cr.ray[-1]` is the chief ray segment at the image interface, so `image_pt`
equals the chief ray's intersection point on the image plane. The reference
sphere is then centered on this point.

The `foc` parameter represents a defocus shift along the chief ray direction
from the nominal image point.

## 2. Surface on which pupil coordinates are defined

**Entrance pupil plane in object space** (not the stop surface directly).

`trace_base` (`trace.py:253`) accepts a `pupil` parameter with default
`pupil_type='rel pupil'` — normalized coordinates on the entrance pupil.
Inside `ray_start_from_osp` (`opticalspec.py:334-339`), for EPD-based specs:

```python
aim_pt = aim_info           # chief ray aim point at entrance pupil
obj2enp_dist = -(fod.obj_dist + z_enp)   # z_enp = fod.enp_dist
pt1 = np.array([eprad*pupil[0] + aim_pt[0],
                eprad*pupil[1] + aim_pt[1],
                fod.obj_dist + z_enp])    # z position of entrance pupil plane
```

The ray is aimed from the object point through a point on the entrance pupil
plane (at `z = obj_dist + enp_dist`), scaled by the entrance pupil radius.

The `aim_info` is computed by iterating the chief ray to hit the center of the
**stop surface** (`trace.py:628-639`), so the entrance pupil coordinates are
consistent with the aperture stop — but the grid coordinates themselves live
on the entrance pupil plane in object space.

For the `RayGrid` specifically, the grid range comes from
`fld.vignetting_bbox(pupil)` which produces vignetted relative pupil
coordinates in `[-1, 1]`.

## 3. OPD reference: chief ray

**Yes — OPD is always computed relative to the chief ray.**

The OPD formula for the finite-pupil case (`waveabr.py:303`):

```python
opd = -n_obj * e1 - ray_op + n_img * ekp + cr_op - n_img * ep
```

where:

| Term       | Meaning |
|------------|---------|
| `ray_op`   | Optical path of the test ray (EIC-based accumulation) |
| `cr_op`    | Optical path of the chief ray (EIC-based accumulation) |
| `e1`       | EIC distance at the 1st surface between test ray and chief ray |
| `ekp`      | EIC distance at the last surface between test ray and chief ray |
| `ep`       | Distance from exit pupil reference point to the reference sphere |
| `n_obj`    | Absolute refractive index in object space |
| `n_img`    | Absolute refractive index in image space |

The docstring confirms: _"Returns: opd: OPD of ray **wrt chief ray** at fld"_
(`waveabr.py:210`).

This follows the H. H. Hopkins formulation ("Calculation of the Aberrations
and Image Assessment for a General Optical System",
[doi:10.1080/713820605](https://doi.org/10.1080/713820605)), where wave
aberrations are referenced to the chief ray via equally inclined chords (EIC).
