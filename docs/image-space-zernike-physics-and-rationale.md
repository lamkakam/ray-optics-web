# Image-space Zernike analysis: implementation and optical background

This document describes the implemented image-space Zernike analysis, the
optical model behind it, its numerical and physical validation, and the limits
on interpreting its results. The analysis remains entirely client-side and
runs in the existing RayOptics/Pyodide worker architecture. The shared
[image-reference conventions](image-reference-conventions.md) apply to this and
the other optical analyses.

The UI exposes pupil *sampling space* separately from OPD reference geometry.
Entrance sampling uses normalized RayGrid input coordinates and uniform
finite-cell weights. Exit sampling preserves the projected physical
reference-sphere coordinates and area quadrature documented below. The default
is Entrance; afocal systems support Entrance only.

## Problem addressed

The previous finite-image path treated RayOptics' equally inclined chord (EIC)
`p_coord` intermediates as final exit-pupil coordinates and normalized them by
the largest sampled radius. Those values belong to the Hopkins OPD calculation;
they do not by themselves define the intended orthographic reference-sphere
projection. The sample-maximum normalization also made the fit scale depend on
grid density.

The original investigation showed that sample-maximum radius for the full-field
Sasian Triplet changed from about 6.509738 mm with 32 samples per axis to
6.626942 mm with 64 and 6.638557 mm with 128. At 64 samples per axis, the old
generic Fringe result reported about 1.041929 waves RMS, while the standard
deviation of the samples was about 1.040306 waves. These values are historical
evidence of grid dependence and fitted-piston coupling, not regression targets
for the projected-area implementation.

The replacement makes the reference sphere, projection frame, normalization
disk, transmitted support, integration measure, and coefficient convention
explicit. It preserves the validated polynomial evaluator and wavelength
conversion while rejecting finite EIC grids as a final sampling contract.

## Implemented behavior

Finite-image analysis now:

- builds the same physical reference sphere for both optical path difference
  (OPD) evaluation and image-space sampling;
- transforms the image reference, pupil reference, and outgoing rays into one
  global Cartesian frame, including tilted, folded, and curved image geometry;
- intersects every valid outgoing ray with the pupil-side cap of the reference
  sphere and orthographically projects the intersections;
- resolves a chief-ray-centred enclosing normalization circle on nested pupil
  grids while keeping the selected reference sphere fixed;
- integrates the transmitted footprint with projected-area weights, preserving
  sampled clipping, obscurations, and disconnected regions;
- detects duplicate or overlapping projected branches, orientation reversals,
  and singular mapped cells instead of fitting an ambiguous wavefront;
- fits the caller-selected coefficient list by weighted least squares and
  reports rank and conditioning information;
- calculates mean OPD, RMS wavefront error, peak-to-valley error, fit residual,
  support coverage, and coherent reference intensity from the accepted samples;
- returns the reference geometry, normalization, sampling, support, and
  convergence metadata through the Python, worker, and TypeScript interfaces;
- displays direct wavefront metrics, fit residual, pupil coverage, and
  `Approx. Strehl` alongside the coefficient table.

The existing chief-ray and centroid reference choices are preserved. Afocal
analysis remains a separate plane-wave path and does not use the finite
reference-sphere projection. No new runtime dependency, modification of the
installed RayOptics package, or general diffraction-engine rewrite was needed.

## Finite reference wavefront

For finite imaging, the ideal comparison wavefront is a sphere converging to
the selected image reference point. Let `Q` be that point and `P` be the
chief-ray exit-pupil reference supplied by RayOptics. The implemented sphere is

```text
R = |Q - P|
```

with centre `Q`, radius `R`, and the point `P` on its surface. OPD is the
optical-path departure from this sphere. An ideal wave matching the reference
therefore has no spatially varying OPD.

Both public image-reference choices use this construction:

- **Chief ray:** `Q` is the chief ray's image-surface intersection.
- **Centroid:** the shared wavefront builder begins at the geometric centroid
  and shifts the reference until the fitted transverse OPD slopes vanish in
  normalized input-pupil coordinates.

The centroid convention is not an exact projected-area minimum-variance or
best-focus solve. The analysis does not silently remove tilt or defocus, and a
change of reference geometry can change the coefficients without any change to
the lens itself. Changing centroid mode to a strictly geometric centroid would
be a separate migration shared with other wavefront analyses. `P` remains
RayOptics' Hopkins exit-pupil reference rather than a newly calculated
differential real exit pupil.

The complete image-surface transform is applied to `Q`. This is required for a
tilted or folded image space, where adding an axial gap thickness cannot locate
the reference point correctly. On a curved image surface, its sag is part of
the three-dimensional reference point. The OPD calculation and projection are
checked to use spheres with the same radius.

## Reference-sphere projection

An outgoing ray line is written as

```text
S(t) = O + t d
```

where `O` is a point on the final outgoing segment and `d` is its direction.
The two intersections with the reference sphere satisfy

```text
|O + t d - Q|^2 = R^2
```

The selected root is the one on the hemisphere containing `P`. Positive and
negative `t` are both allowed, so real rays and virtual extensions follow the
same geometric rule. A traceable ray that cannot reach the selected cap is
reported as a geometry error rather than being treated as an aperture-blocked
sample.

The projection frame is right-handed. Its longitudinal axis is

```text
ez = (Q - P) / R
```

The transformed image x axis is projected normal to `ez` to form `ex`; a
deterministic Cartesian fallback is used if those directions are nearly
parallel. The third axis is `ey = ez x ex`, giving `ex x ey = ez` and a
right-handed angular sign. For a selected sphere intersection `S`, the
orthographic coordinates and normalized fit coordinates are

```text
x = (S - P) . ex          y = (S - P) . ey
u = x / a                 v = y / a
rho = sqrt(u*u + v*v)     theta = atan2(v, u)
```

where `a` is the enclosing-circle radius, not the reference-sphere radius `R`.
The transmitted footprint retains its projected shape within that circle; an
elliptical or clipped pupil is not stretched into a full disk. The quantities
`x/R` and `y/R` are transverse components of the sphere's radial unit vector;
they are not generally direction cosines of the aberrated outgoing ray.

## Projected-area quadrature

The fit and direct statistics use projected area `dx dy` as their integration
measure. Uniform input-pupil sampling does not generally remain uniform after
propagation and projection, especially in non-axisymmetric systems. Giving
every ray equal weight would instead measure the density of the original ray
grid.

Each connected input-grid cell is divided into two triangles in projected
coordinates. A triangle contributes only when all three vertices have valid
projected coordinates and finite OPD. One third of its absolute area is added
to each vertex, producing sample weights `A_i` and the numerical integral

```text
mean_A(f) = sum(A_i f_i) / sum(A_i)
```

This construction does not interpolate across sampled clipping or obscuration.
It remains a finite quadrature: a sufficiently narrow obstruction can be
missed, and a curved boundary is approximated by the resolved grid.

Before areas are accumulated, the mapping is checked for singular triangles,
local orientation reversals, duplicate projected points, and positive-area
overlap between any projected triangle interiors. Shared edges and vertices
between adjacent cells are allowed. These checks reject folds and disconnected
branches that occupy the same projected location, because the supported fit
requires a single-valued wavefront over the projected plane.

## Boundary and support convergence

The implementation retains forward tracing and refines the complete pupil grid
with nested resolutions of `2N - 1`, up to 129 samples per input axis by
default. The selected sphere remains fixed while the enclosing radius and
mapped support area are recomputed. Refinement stops when successive relative
changes are no greater than:

- 0.5% for the enclosing radius; and
- 2% for the projected support area.

The largest radius seen during refinement receives a relative `1e-10`
roundoff margin. The final accepted grid supplies the OPD samples, projected
coordinates, and area weights used in the fit. The result includes the final
resolution and a convergence flag; reaching the resolution cap does not imply
convergence. Radius and support-area convergence also do not independently
guarantee convergence of every high-order coefficient or sampled extremum.

Support coverage is reported as

```text
coverage = sum(A_i) / (pi a^2)
```

It is a geometric fraction of the normalization disk, not an optical
throughput or transmission measurement.

Selective adaptive boundary tracing and iterative aiming onto a regular
projected-pupil grid remain possible future optimizations. The implemented
nested-grid method is the current numerical contract.

## Weighted fit and coefficient convention

For OPD samples `W_i` in waves and design-matrix values `Z_ij`, the coefficients
solve

```text
minimize over c: sum_i A_i (W_i - sum_j Z_ij c_j)^2
```

The implementation passes rows multiplied by `sqrt(A_i)` to NumPy's
QR/SVD-backed least-squares solver rather than forming normal equations. It
validates term parity and order, finite coordinates and OPD, non-negative
finite weights, sample sufficiency, matrix rank, and numerical conditioning. A
rank-deficient fit or condition number above `1e12` is rejected. Duplicate
terms are rejected and caller ordering is preserved.

Unnormalized coefficients follow the existing ATMOS/OSLO convention. The
reported RMS-normalized value is

```text
c_rms = c / sqrt((2 - delta(m, 0)) (n + 1))
```

This is the unit-disk normalization convention. On clipped, obscured, or other
partial support, the modes are generally not orthogonal under the actual
measure. Consequently, coefficient root-sum-square is not substituted for the
measured wavefront RMS, and changing the requested coefficient list can
redistribute fitted values on partial support.

## Reported wavefront metrics

All direct metrics use the same accepted OPD samples and quadrature weights.

| Quantity | Definition and interpretation |
| --- | --- |
| Weighted mean OPD | `mu = mean_A(W)`; the sampled piston reference. |
| RMS wavefront error | `sqrt(mean_A((W - mu)^2))`; independent of the requested coefficient list and fitted piston. |
| Peak-to-valley error | `max(W) - min(W)` over accepted samples; sensitive to unresolved extrema. |
| Fit residual RMS | `sqrt(mean_A((W - Zc)^2))`; the part left by the requested expansion. |
| Pupil coverage | Projected support area divided by the enclosing-disk area. |
| Condition number | Numerical sensitivity of the weighted coefficient fit. |

The UI labels the existing `strehl_ratio` payload field as `Approx. Strehl`.
It is calculated as

```text
I_ref = |mean_A(exp(i 2 pi W))|^2
```

This is the coherent scalar intensity at the selected reference point,
normalized to the zero-phase result on the same support and assuming uniform
amplitude. Constant piston does not change it. It is not a search for peak
Strehl and does not include apodization, polarization, coating transmission, or
other ray-energy weights.

## Result contract and client-side integration

The Python result keeps the coefficient arrays and established summary fields
and adds enough metadata to make the calculation reproducible without sending
the full per-ray grid. For a finite result, this includes:

- reference kind, system length unit, sphere centre, pupil point, radius, and
  right-handed frame axes;
- normalization kind and radius;
- sampling measure, projected support area, support coverage, and accepted
  sample count;
- final boundary resolution and convergence status; and
- weighted mean OPD, fit residual RMS, fit rank, condition number, and the
  amplitude assumption behind the coherent-intensity estimate.

The worker converts the frontend-selected Noll or generic Fringe ordering into
an explicit ordered `(n, m)` list before calling Python. Python is therefore
independent of frontend indexing names, and the selected order is preserved in
the returned coefficients. The typed worker and hook interfaces transport the
expanded JSON-safe result to the modal. The UI continues to show both
unnormalized and RMS-normalized coefficients and now adds the direct RMS and
P-V errors, fit residual, coverage, and `Approx. Strehl` summary values.

The implementation remains within the singleton Pyodide web worker, so optical
computation stays off the browser's main thread and no backend service is
introduced. The packaged Python wheel and its pinned worker URL were advanced
together so the browser loads the matching implementation.

## Wavelength and afocal behavior

Each result uses the requested wavelength for ray tracing, chief-ray aiming,
refractive indices, and conversion of OPD from system length units to waves.
Scaling phase alone cannot correct geometry traced at a different wavelength.

Afocal systems retain the existing plane-wave reference and normalized
input-pupil grid. Their samples have uniform cell weights, and their coverage
is the fraction of finite OPD samples inside the sampled unit disk. The finite
sphere geometry, projected-area claims, and convergence procedure do not apply
to that path.

## Physical and numerical validation

The implementation was developed against behavioral tests and independent
geometric or analytic expectations rather than snapshots of its own output.
The validation covers:

- a non-axis-aligned reference sphere, pupil-side root selection, virtual ray
  extensions, and covariance under rigid rotation and translation;
- an ideal converging spherical wave, which produces zero non-piston OPD;
- exact area recovery for a linear elliptical mapping and exclusion of a
  sampled central obstruction;
- rejection of singular cells, orientation reversals, duplicate points, and
  overlapping disconnected branches while accepting disjoint triangles whose
  bounding boxes happen to overlap;
- recovery of known coefficient mixtures from nonuniform samples and
  projected-area weights, with explicit rejection of invalid, rank-deficient,
  or negatively weighted fits;
- invariance of physical RMS to coefficient-list length and piston position,
  plus rotation covariance of sine/cosine coefficient pairs;
- an offset clipped aperture whose partial support remains inside the enclosing
  circle;
- wavelength-dependent ray aiming, refractive-index use, and conversion from
  system length units to waves;
- complete global transforms for tilted image geometry and restored surface sag
  for curved image references;
- finite and afocal routing, including afocal coverage with blocked disk
  samples; and
- on-axis and full-field Sasian Triplet fits for both chief-ray and centroid
  references at 9, 17, and 33 samples per axis with a separately resolved,
  fixed normalization radius. Projected area, RMS, and defocus convergence all
  improve with refinement.

A tilted Houghton-Herschel fixture provides an additional optical regression.
Its dummy planar reference surface is retained so the test exercises valid OPD
topology rather than the known RayOptics first-surface bookkeeping artifact.

Together, these checks establish that the coordinates lie on the constructed
sphere; OPD and sampling share their reference, frame, wavelength, and units;
area and normalization convergence are independent of the coefficient solve;
direct RMS does not depend on the requested list; and unsupported geometry is
reported rather than silently folded into a fit.

## Scope and interpretation limits

This implementation does not redefine the reference conventions used by
wavefront maps, PSF, MTF, ray fans, or optimization. It does not add automatic
best focus, minimum-RMS reference optimization, optical amplitude transport,
or a program-specific coefficient ordering. It also does not alter an optical
prescription or focus merely to match another program.

Comparisons with another optical program require the same prescription,
wavelength, field, aperture, reference point, focus, axes, normalization disk,
integration measure, and requested coefficient list. A coefficient difference
by itself does not identify which of those conventions differs.

In particular, the reference OSLO screenshot used during investigation applies
minimum-RMS reference geometry and a special 37-term list whose final radial
term is `(12, 0)`. The application's generic 37-term Fringe sequence ends in
`(6, 6)`. Exact numerical agreement is therefore not an acceptance condition;
an explicit matching list and complete analysis settings are required for a
meaningful comparison.

Valid projection also cannot repair invalid upstream optical paths. RayOptics
models affected by the documented
[first-surface tilted/decentered OPD behavior](rayoptics-tilted-or-decentered-first-surface-opd.md)
must retain a dummy planar air/reference surface before the first tilted or
decentered physical surface. Agreement between transverse ray fans is not
evidence that the OPD is valid.

## Implementation map

- [Projected pupil geometry and quadrature](../src/python/src/rayoptics_web_utils/zernike/projected_pupil.py)
  constructs the sphere frame, ray intersections, projected-area integration,
  overlap validation, and nested refinement.
- [Zernike fitting and metrics](../src/python/src/rayoptics_web_utils/zernike/zernike.py)
  performs the weighted fit and emits direct metrics plus reference and support
  metadata.
- [RayGrid reference construction](../src/python/src/rayoptics_web_utils/raygrid/raygrid.py)
  keeps wavelength-specific OPD evaluation and the selected finite reference
  sphere consistent.
- [Worker API](../src/workers/pyodide.worker.ts),
  [frontend payload types](../src/features/lens-editor/types/zernikeData.ts), and
  [the Zernike results modal](../src/features/lens-editor/components/ZernikeTermsModal/ZernikeTermsModal.tsx)
  transport and display the expanded result contract.

## Optical references

- [OSLO Optics Reference: image-space sampling and wavefront analysis](https://lambdares.com/hubfs/Support/support/OSLOOpticsReference_Sep21.pdf#page=179)
- [Wyant and Creath: Basic Wavefront Aberration Theory for Optical Metrology](https://wp.optics.arizona.edu/jcwyant/wp-content/uploads/sites/13/2016/08/Zernikes.pdf)
- RayOptics' installed wavefront implementation and its cited Hopkins equally
  inclined chord reference define the upstream OPD tuple and sign conventions
used by this integration.
