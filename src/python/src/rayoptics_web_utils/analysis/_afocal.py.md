# `python/src/rayoptics_web_utils/analysis/_afocal.py`

## Purpose

Provides the shared image-space-afocal calculations used by angular ray, pupil, wavefront, diffraction, field-curvature, astigmatism, and longitudinal-aberration analyses. An afocal system forms its image at infinity, so these calculations describe image-space rays by direction angle and vergence rather than by a finite image-plane intercept. Wavefront error is consequently referenced to a plane wave at an estimated exit-pupil plane rather than to a spherical reference wave converging on a finite image point.

This module does not define a separate public result model. It returns NumPy values, traced ray packages, a two-value diameter tuple, scalar vergence, or a `SimpleNamespace` compatible with the finite-conjugate `RayGrid` consumers.

## Symbols, coordinate systems, and units

- `opm` is the RayOptics optical model. `fld` is a field specification and `fi` is its index in `optical_spec.field_of_view.fields`.
- A normalized pupil coordinate is `p = (p_x, p_y)`. Axis index `0` is sagittal and axis index `1` is tangential throughout this module. Pupil coordinates are dimensionless; `-1` and `+1` select opposite normalized clear-pupil boundaries after RayOptics vignetting is applied.
- A traced ray segment contains a point **r** in system length units and a direction **d**. Directions used here are normalized to unit length. `ray[-2]` is the segment immediately after the last physical optical surface and immediately before the artificial image gap; this is the module's output segment.
- **d_ref** is the unit reference direction. It is either the chief-ray output direction or the normalized, unweighted arithmetic mean of all valid sampled output directions. **d_c** denotes the chief-ray direction even when **d_ref** is the angular-centroid direction.
- **e_s** and **e_t** are the unit sagittal and tangential transverse axes. They are mutually orthogonal and normal to **d_ref**. Vector components along either axis are projections formed with a dot product.
- `n_obj` and `n_img` are the absolute refractive indices of the first and last sequential-model gaps at `wavelength_nm`. Taking the absolute value prevents a signed-index representation from reversing optical-path and vergence conventions.
- `h` is a sampled ray's signed transverse height relative to the chief ray at the exit-pupil plane, in system length units. `u` is a signed angular ray slope in radians, calculated with `atan2` relative to **d_ref** rather than by a small-angle approximation.
- OPL and OPD are optical path length and optical path difference. `afocal_opd` returns OPD in system length units. `make_afocal_ray_grid` divides it by the central wavelength expressed in the same system units, producing waves.
- Wavelength arguments are in nanometres. `opm.nm_to_sys_units(...)` converts a wavelength to the model's system length unit.
- Angular coordinates are returned in arcseconds using `ARCSEC_PER_RADIAN = 206264.806247`.
- Output vergence is returned in inverse metres, or diopters (`D`). `_system_units_per_metre` converts inverse system length to inverse metres using `1`, `100`, `1000`, or `39.37007874015748` system units per metre for `m`, `cm`, `mm`, or `in`, respectively.

## Afocal selection and ray extraction

### `is_afocal_image_space(opm)`

Afocal mode is selected only when the model has an `optical_spec` and `optical_spec.conjugate_type("image") == "infinite"`. A missing optical specification returns `False`; the function does not infer afocal behavior from focal length, ray angles, or the last gap thickness.

### `_unit(vector)`

Converts the input to a floating-point NumPy array and divides it by its Euclidean norm. A zero-length direction, a non-finite norm, or a norm made non-finite by non-finite components raises `ValueError`. All direction comparisons, averages, and transverse bases therefore operate on unit vectors.

### `output_segment(ray_pkg)`

Returns the point and normalized direction from `ray_pkg[mc.ray][-2]`. Selecting the penultimate segment deliberately excludes the artificial final image gap used by the sequential model. The returned point is copied into a floating-point array, while the direction is validated and normalized by `_unit`.

### `_chief_ray_pkg(opm, fld, wavelength_nm)`

Calls `trace.setup_pupil_coords` with the model's current focus/defocus value and returns the chief ray package from the setup result. The same traced chief ray is used as the angular reference when requested, as the OPD reference ray, and as the origin for exit-pupil and vergence comparisons.

### `_raw_grid(opm, fld, wavelength_nm, num_rays)`

Obtains the field's vignetting-aware pupil bounding box from `fld.vignetting_bbox(...)`, then calls `trace_ray_grid` over that box with `num_rays` samples per dimension. Aperture checking, application of vignetting, and `append_if_none=True` are enabled. Consequently, the grid retains a regular pupil layout even when a ray is blocked or fails: its package position is present as `None` rather than being removed.

### `_trace_pkg(opm, pupil, fld, wavelength_nm)`

Traces one normalized-pupil ray with aperture checking and vignetting enabled. `trace.trace_safe` is asked for a summary ray error. The helper returns `None` whenever `result.err` is present and otherwise returns `result.pkg`; consumers translate that failure either to `NaN`, a zero diameter when an opposite pair is incomplete, or another documented fallback.

## Angular reference and coordinates

### `reference_direction(opm, fi, wavelength_nm, image_point="chief_ray", num_rays=21, grid=None)`

First validates `image_point` with the shared image-point validator and always traces the field's chief ray. For `image_point == "chief_ray"`, it returns the chief-ray output direction and chief ray package.

For the angular-centroid option, it uses the supplied raw grid or creates a vignetting-aware `num_rays` grid. It ignores `None` ray packages, extracts and normalizes every remaining output direction, and retains only finite directions. The centroid is

```text
d_ref = unit((1 / N) sum_i d_i).
```

This is an unweighted angular centroid: every valid sampled ray contributes one normalized direction regardless of pupil-cell area, intensity, or apodization. The mean is normalized only after averaging. If no valid directions remain, the function raises `ValueError`. It returns **d_ref** together with the chief ray package; choosing the centroid does not replace the chief ray used for OPD referencing.

### `transverse_axes(reference)`

Builds a deterministic right-handed transverse basis by Gram–Schmidt projection. With unit reference **d_ref**, the preferred seed is the global x axis **x** = `(1, 0, 0)`:

```text
e_s' = x - (x · d_ref) d_ref
e_s  = unit(e_s')
e_t  = unit(d_ref × e_s).
```

If `||e_s'|| < 1e-12`, the reference is too nearly parallel to global x for a stable subtraction, so global y `(0, 1, 0)` is used as the seed. `_unit` validates the input reference and both resulting axes. The returned order is `(sagittal, tangential)`.

### `angular_coordinates(direction, reference, axes=None)`

Normalizes the ray and reference directions and either constructs the transverse basis or uses the supplied axes. For each transverse axis **e**, it calculates the signed direction angle

```text
theta_e = atan2(d · e, d · d_ref)
angle_e_arcsec = 206264.806247 theta_e.
```

The shared denominator preserves the correct quadrant and remains meaningful outside the paraxial small-angle limit. The result is the NumPy pair `[sagittal_angle, tangential_angle]` in arcseconds.

## Exit-pupil plane

### `exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=None)`

Estimates where neighboring chief rays cross the nominal chief ray. If no chief package is supplied, it traces one. For each field coordinate (`xv`, then `yv`), it makes shallow copies of the field and perturbs that coordinate by `+eps` and `-eps`, where `eps = 1e-4`. Central differences give the variation of the output point and direction:

```text
dp = (r_plus - r_minus) / (2 eps)
dd = (d_plus - d_minus) / (2 eps).
```

Only components perpendicular to the central chief direction **d_c** locate the crossing:

```text
dd_perp = dd - (dd · d_c) d_c
dp_perp = dp - (dp · d_c) d_c
z = -(dp_perp · dd_perp) / (dd_perp · dd_perp).
```

The value `z` is appended only when `dd_perp · dd_perp > 1e-20`. The accepted sagittal and tangential estimates are averaged. If neither field perturbation provides usable differential angular power, the distance falls back to `0`, placing the plane at the chief-ray output point. The returned plane point is `r_c + z d_c`, and the second return value is **d_c**.

This helper locates the point using the chief ray. Callers that support an angular-centroid image point use **d_ref**, not necessarily **d_c**, as the actual plane normal for intersections and OPD propagation.

### `_plane_distance(point, direction, plane_point, plane_normal)`

Returns the signed geometric distance `s` along a ray to a plane:

```text
s = ((plane_point - point) · plane_normal) / (direction · plane_normal).
```

Positive distance is along the ray direction and negative distance is behind the supplied point. If `|direction · plane_normal| < 1e-15`, the ray is treated as parallel to the plane and `ValueError` is raised instead of amplifying the nearly zero denominator.

## Plane-wave optical path difference

### `afocal_opd(opm, ray_pkg, chief_pkg, plane_point, reference_direction, wavelength_nm)`

Forms the sampled-ray OPD relative to the chief ray at a plane through `plane_point` normal to **d_ref**. Both rays start their image-space propagation from the output segment before the artificial final gap. Let:

- `e1` be the object-space equally inclined chord (EIC) distance between the sampled ray `(ray[1].point, ray[0].direction)` and the corresponding chief-ray data;
- `e1_c` be the same EIC operation with the chief ray supplied on both sides;
- `OPL_r` and `OPL_c` be `ray_pkg[mc.op]` and `chief_pkg[mc.op]`, the traced optical path lengths through the physical system;
- `s_r` and `s_c` be the sampled and chief geometric propagation distances from their output segments to the exit-pupil plane; and
- `n_obj` and `n_img` be the absolute object- and image-space refractive indices.

The chief optical path is

```text
chief_opl = OPL_c + n_img s_c + n_obj e1_c,
```

and the returned value is

```text
OPD = chief_opl - (n_obj e1 + OPL_r + n_img s_r).
```

Thus positive OPD means the chief-ray optical path is longer than the sampled-ray optical path under this convention. Object-space EIC and the extra image-space propagation are multiplied by their respective refractive indices. The traced OPL supplies the optical path through the modeled physical train, while explicit propagation begins at `ray[-2]`; the artificial last image gap is not added to the afocal OPD.

No local fallback catches a parallel intersection or invalid direction: `_unit` and `_plane_distance` errors propagate because an OPD cannot be defined reliably for those data.

### `make_afocal_ray_grid(opm, fi, wavelength_nm, num_rays=64, image_point="chief_ray")`

Creates one vignetting-aware raw grid and reuses it for the angular-centroid calculation when that reference is requested. It estimates the exit-pupil point from the chief ray, converts the model's central spectral wavelength to system length units, and allocates a floating-point array of shape `(3, num_rays, num_rays)`:

- channel `0` stores the returned normalized `pupil_x` coordinate at every raw-grid position;
- channel `1` stores `pupil_y`;
- channel `2` stores plane-wave OPD divided by the central wavelength in system units.

The entire OPD channel is initialized to `NaN`. Valid ray packages overwrite their cells; blocked or failed `None` packages remain `NaN`, preserving the pupil mask and regular array shape. Note that `wavelength_nm` selects the wavelength used to trace and calculate OPD, but the stored wave count is initially normalized by `optical_spec.spectral_region.central_wvl`. Downstream polychromatic consumers rescale it to waves at the requested wavelength.

The returned `SimpleNamespace` contains `grid`, `raw_grid`, `reference_direction`, `chief_ray_pkg`, and `exit_pupil_point` so existing RayGrid-based consumers can use the afocal result without an API or shape change.

## Pupil scale and output vergence

### `projected_exit_pupil_diameters(opm, fi, wavelength_nm, image_point="chief_ray")`

Finds sagittal and tangential clear-pupil diameters projected onto the plane normal to **d_ref**. For each axis, it traces the two normalized boundary pupils with coordinates `-1` and `+1` on that axis and zero on the other. Each valid ray is intersected with the exit-pupil plane, and its signed coordinate is

```text
q = ((r + s d) - plane_point) · e_axis.
```

When both boundary rays succeed, the diameter is `|q_plus - q_minus|` in system length units. If either boundary ray fails, that axis's diameter is `0.0`. These projected diameters provide the sagittal and tangential pupil scales used to convert the sampled Fourier-domain diffraction result into angular PSF and angular spatial-frequency/MTF coordinates.

### `_system_units_per_metre(opm)`

Lowercases `opm.system_spec.dimensions` and looks it up in the fixed `m`, `cm`, `mm`, and `in` conversion table. Multiplying an inverse-system-unit quantity by this value produces inverse metres. An unsupported unit string raises `KeyError`; there is no guessed conversion.

### `output_vergence(opm, fld, wavelength_nm, pupil, axis)`

Computes finite-pupil output vergence relative to the chief ray, using the chief output direction as **d_ref**. It intersects both rays with the chief-derived exit-pupil plane and projects their separation onto the requested transverse axis:

```text
h = (r_ray_at_pupil - r_chief_at_pupil) · e_axis.
```

It calculates exact signed slopes for the sampled and chief rays:

```text
u_ray   = atan2(d_ray · e_axis, d_ray · d_ref)
u_chief = atan2(d_chief · e_axis, d_chief · d_ref)
```

and returns

```text
L = -n_img (u_ray - u_chief) / h
vergence_D = L * system_units_per_metre.
```

The minus sign establishes positive vergence for downstream convergence: a positive-height ray converging toward the chief ray has a smaller slope and therefore positive `L`. A failed sampled ray returns `NaN`. If `|h| < 1e-15`, the result is `0.0` to avoid division by an unresolved pupil height. Otherwise the value is converted from inverse system length to inverse metres.

### `differential_output_vergence(opm, fld, wavelength_nm, axis)`

Samples the paraxial limit by calling `output_vergence` at a single small positive pupil displacement: `pupil[axis] = +1e-4`, with the other coordinate zero. This is a difference relative to the chief ray at pupil coordinate zero; it is not a symmetric `+/-` differential-pupil calculation. Axis `0` supplies sagittal vergence and axis `1` supplies tangential vergence.

## Analysis consumers

- Ray fans use `is_afocal_image_space`, `reference_direction`, `output_segment`, and `angular_coordinates` so fan ordinates are output angles in arcseconds.
- Spot diagrams use the same angular reference and coordinate transform, producing sagittal/tangential angular spots instead of finite-plane intercepts.
- Geometric PSF uses chief-referenced angular coordinates of valid rays as its afocal point cloud.
- OPD fans call `afocal_opd` with the shared exit-pupil plane and divide the system-length result by the traced wavelength expressed in system units.
- Wavefront maps obtain the pupil/OPD layout from `make_afocal_ray_grid` and rescale its central-wavelength wave values for the selected wavelength.
- Diffraction PSF and diffraction MTF use that same afocal OPD grid as phase input. They use `projected_exit_pupil_diameters` to set the sagittal/tangential angular sampling or spatial-frequency scale.
- Field curves call `differential_output_vergence` on both axes. The separate sagittal and tangential results are the afocal field-curvature and astigmatism quantities in diopters.
- Longitudinal spherical aberration calls `output_vergence` for tangential pupil samples, reporting longitudinal variation as output vergence rather than finite image displacement.
- Other RayGrid consumers, including wavelength-dependent Strehl calculations, inherit the same central-wavelength normalization, blocked-ray `NaN` mask, and plane-wave OPD convention through `make_afocal_ray_grid`.
