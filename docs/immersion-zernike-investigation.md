# Immersion objective Zernike investigation

The unchanged bundled US 9,645,380 Example 1 objective still rejects projected
pupil orientation reversals at both reported off-axis fields. No validated
numerical correction was established. Keep the geometry rejection and expose it
through the recoverable Zernike error dialog. These observations establish a
fold in the sampled mapping, but do not establish whether its ultimate cause is
physical pupil aberration or an upstream ray-launch/trace defect.

## Reproduction

Use `ExampleSystemList`'s **Superachromatic High NA Immersion Microscope Objective
with Tube Lens US#9,645,380 Example 1 (2013)**, passed unchanged through
`buildOpticalModelScript`. Initialize `rayoptics_web_utils` before importing
`rayoptics.environment`, and use the project's verified Python venv. Use the same
material registry, exact-spec imports, and aperture imports as the worker.

The prescription uses manual apertures, Object NA 1.3, exact Object Height,
maximum field 0.3125 mm, and relative fields `[0, Math.SQRT1_2, 1]`. The evaluated
heights are 0, `0.3125 * sqrt(0.5)` (approximately 0.2209708691207961 mm), and
0.3125 mm. The reference wavelength is 546.073 nm. The image reference is
`chief_ray`, the application's default in a fresh browser context; no saved user
preference was available in this fresh workspace. No prescription, aperture,
vignetting, image reference, or sampling convention was changed.

For each field/wavelength:

1. Call `make_ray_grid(opm, fi=fi, wavelength_nm=wl, num_rays=64,
   image_point="chief_ray")`.
2. Recover `reference_sphere_geometry_from_ray_grid(rg, opm)` once. Use
   `rg.raw_grid` for 64; for the finer grids, call
   `sample_valid_rays(opm, rg.fld, wl, rg.foc, resolution)` against that frozen
   sphere. The production refinement sequence is 64, 127, 129; 96 is an
   additional diagnostic grid.
3. Use `_project_raw_grid` and enumerate the same two connected triangles per
   cell as `projected_area_vertex_weights`. Count only triangles with three
   valid vertices, retaining the sign of half their 2-D cross product. Call
   the production weight validator unchanged, including overlap checks.
4. At 546.073 nm, additionally compute `_opd_for_frozen_reference`, inspect
   the complete ray packages of reversed triangles, and independently compare
   local-frame projection with global-frame projection. Inspect the sphere
   intersection residual, hemisphere cosine, and discriminant for every valid
   outgoing ray.

The browser reproduction is automated in `src/e2e/immersionZernike.spec.ts`.
It uses the real Pyodide worker, exercises both off-axis selections at the
reference wavelength, and recovers to on-axis results after each rejection.

## Sampling results at 546.073 nm

Areas below are signed projected triangle areas in mm². Positive orientation
is the majority in every grid. Every off-axis row failed the unchanged fold
validator; every on-axis row passed all projected-area geometry checks.

| Field index | Points per axis | Valid rays | Triangles | Reversed | Min area | Max area |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 64 | 3000 | 5790 | 0 | 13.123590 | 14.412388 |
| 0 | 96 | 6820 | 13322 | 0 | 5.560148 | 6.338682 |
| 0 | 127 | 11985 | 23550 | 0 | 3.103270 | 3.603473 |
| 0 | 129 | 12361 | 24296 | 0 | 3.014989 | 3.491727 |
| 1 | 64 | 3006 | 5802 | 10 | -2.832722 | 4.980816 |
| 1 | 96 | 6832 | 13345 | 44 | -1.901135 | 2.191471 |
| 1 | 127 | 12013 | 23606 | 108 | -1.678140 | 1.246149 |
| 1 | 129 | 12403 | 24379 | 118 | -1.581990 | 1.207458 |
| 2 | 64 | 3026 | 5841 | 46 | -4.990910 | 5.525225 |
| 2 | 96 | 6878 | 13436 | 156 | -3.505172 | 2.435516 |
| 2 | 127 | 12071 | 23721 | 273 | -2.366204 | 1.383370 |
| 2 | 129 | 12467 | 24505 | 299 | -2.714995 | 1.340606 |

Reversals persist through the existing 129-point limit, with signed areas far
above floating-point roundoff. Increasing resolution does not remove them.

## Offending rays, reference sphere, and transforms

At field index 1, the first reversed 64-grid triangle uses zero-based grid
indices `(17,4), (18,5), (17,5)`. Its projected vertices are approximately
`(-42.999974, -78.359405)`, `(-41.787163, -79.474671)`, and
`(-44.702778, -79.027442)` mm. At field index 2, the first reversed triangle
uses `(12,7), (13,8), (12,8)` and projects to
`(-60.801652, -67.517458)`, `(-60.109784, -68.263710)`, and
`(-62.898446, -67.473549)` mm. All six ray packages have 31 segments and reach
the image. They are not missing/aperture-blocked vertices accidentally bridged
by the triangulation.

All 3006 and 3026 valid rays respectively have finite OPD. The sphere radii
are 2943.319188871099 and 3099.678729380869 mm, identical to the corresponding
RayGrid OPD reference radii. Across all valid outgoing rays:

- Maximum sphere radial residual: `9.10e-13` mm for both fields.
- Minimum cosine to the pupil-side radial direction: 0.99945786 and 0.99945317.
- Minimum sphere discriminant divided by radius squared: 0.99999885 and
  0.99999843. These rays are well away from tangent intersections.
- Maximum difference between independently projecting in the last-surface
  local frame and the global frame: zero at the measured precision.
- Last-surface rotation determinant: 1 for both fields.

These checks found no sphere-root, near-tangency, non-finite-OPD, or coordinate
transform explanation for the reversals. They do not prove correctness of all
upstream exact ray launching or tracing.

## Other bundled wavelengths

Counts below are reversed triangles at 64 points per axis. Zero means that
this grid also passed the overlap validator; it does not promise that a full
adaptively refined Zernike fit succeeds at that wavelength.

| Wavelength (nm) | On-axis | Field sqrt(1/2) | Full field |
| --- | --- | --- | --- |
| 546.073 | 0 | 10 | 46 |
| 486.133 | 0 | 23 | 100 |
| 656.273 | 0 | 0 | 6 |
| 435.835 | 0 | 30 | 102 |
| 404.656 | 0 | 34 | 113 |
| 852.11 | 0 | 0 | 0 |
| 365.015 | 0 | 42 | 122 |

The failure is wavelength-dependent but is not exclusive to 546.073 nm.
The on-axis control passes geometry validation at every bundled wavelength.
No rays were discarded to force a fit, and no numerical implementation was
changed. Genuine fold, overlap, and singular-geometry controls remain intact.
