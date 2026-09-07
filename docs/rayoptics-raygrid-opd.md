# RayGrid and OPD implementation

This description follows the inspected RayOptics **0.9.8** source installed in
the project venv, together with the web application's shared grid factory.
Relevant upstream symbols (paths relative to the installed `rayoptics` package):

- `raytr/analyses.py`: `RayGrid`, `trace_wavefront`, `focus_wavefront`
- `raytr/waveabr.py`: `calculate_reference_sphere`, `wave_abr_pre_calc_finite_pup`, `wave_abr_calc`
- `raytr/trace.py`: `setup_pupil_coords`, `trace_base`
- `raytr/opticalspec.py`: `ray_start_from_osp`

## Image point and wavefront reference

For finite image space, the image point defines the **center of the reference
sphere**. It is not a statement that OPD is evaluated on the image surface.
Wave aberration compares optical paths using the exit-side reference sphere
and chief-ray/EIC construction. The image surface locates the sphere center;
the reference sphere supplies the wavefront comparison geometry.

With `foc=0` and no image-point override, `calculate_reference_sphere` takes
the chief ray's local image-surface intersection as the image point. With a
focus shift it uses:

```python
dist = foc / cr.ray[-1][mc.d][2]
image_pt = cr.ray[-1][mc.p] + dist * cr.ray[-1][mc.d]
```

Thus `foc` is an axial z shift; the corresponding travel distance along the
chief ray is `dist`. The sphere radius and direction use the vector between
the exit-pupil chief-ray point and the image point expressed relative to the
final optical surface.

The web application's centroid mode starts from the geometric centroid and
solves a shifted reference sphere for zero fitted transverse OPD slopes,
retaining image-surface sag and focus. Afocal mode uses a plane-wave reference
instead. These are different wavefront references from simply centering a
geometric spot diagram. See
[image-reference conventions](image-reference-conventions.md).

## Normalized pupil labels and sampling

For relative-pupil tracing, RayOptics interprets normalized pupil coordinates
through the optical specification and ray aiming. For ordinary object-space
EPD specifications, the input labels scale the entrance-pupil radius around
the chief-ray aim point. This is not a universal claim that every pupil
specification uses a physical entrance-pupil-plane position; angular and
wide-angle specifications have their own ray-start mappings.

`analyses.trace_wavefront` obtains the field's `vignetting_bbox` and traces a
regular rectangular grid with `num_rays` samples along each axis. The box
reflects field vignetting; it need not be the complete `[-1, 1]²` square or a
full disk. The web factory enables aperture checks and disables a second
vignetting transformation (`apply_vignetting=False`). Blocked or failed rays
remain invalid cells. Surviving samples retain their original labels and are
not expanded to fill the unit disk.

`trace_wavefront` returns `(raw_grid, upd_grid)`; `upd_grid` holds per-ray
OPD preprocessing packages. `focus_wavefront` reuses those packages and
returns pupil x, pupil y, and OPD. `RayGrid.update_data` arranges the result as
`rg.grid` with shape `(3, num_rays, num_rays)`.

## OPD calculation and units

The upstream finite OPD calculation uses chief-ray optical paths and equally
inclined chords (EIC). For the full finite-pupil calculation:

```python
opd = -n_obj * e1 - ray_op + n_img * ekp + cr_op - n_img * ep
```

`e1` and `ekp` are object- and image-side EIC distances, `ray_op` and `cr_op`
are the traced test-ray and chief-ray optical paths, and `ep` accounts for
the reference sphere. The refractive indices are absolute object- and
image-space indices. EIC bookkeeping does not make the intermediate
`p_coord` displacement a conventional normalized Zernike pupil coordinate.

Upstream `focus_wavefront` divides physical OPD by
`opm.nm_to_sys_units(central_wvl)`, even when tracing another wavelength.
Consequently `rg.grid[2]` is in **central-wavelength waves**. The web factory's
finite model view supplies object- and image-space refractive indices at the
traced wavelength without mutating cached first-order data. Its centroid and
afocal outputs retain the same central-wavelength wave units.

The shared web factory is
[`make_ray_grid`](../src/python/src/rayoptics_web_utils/raygrid/raygrid.py).
Chief-ray mode preserves the default reference; centroid mode adjusts the
reference geometry and removes valid-grid mean piston. The underlying use of
chief-ray path data should not be confused with an assertion that all returned
wavefronts retain the default chief-ray reference geometry or piston.

## Conventional Zernike path

[`zernike.py`](../src/python/src/rayoptics_web_utils/zernike/zernike.py) copies
`rg.grid[0:2]` and scales only OPD by
`nm_to_sys_units(central_wvl) / nm_to_sys_units(traced_wvl)`.
Every field, finite or afocal, is fitted using these original normalized labels.
There is no EIC-coordinate extraction or maximum-radius normalization.

Fitting and RMS, PV, and monochromatic Strehl share finite coordinates and OPD
inside `x² + y² <= 1`. RMS removes that sample set's mean; coefficient fitting
retains the referenced OPD. The full-disk assumptions for interpreting
normalized coefficients as independent RMS contributions are documented in
[image-reference conventions](image-reference-conventions.md).
No numerical identity with Zemax or OSLO is implied.

The separate
[first tilted/decentered surface OPD warning](rayoptics-tilted-or-decentered-first-surface-opd.md)
still applies. Correct coordinates cannot compensate for invalid traced OPD.
