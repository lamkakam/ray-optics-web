# Image-space Zernike analysis: physics and rationale

This note explains the changes in [PR #252](https://redirect.github.com/lamkakam/ray-optics-web/pull/252).
It describes the implemented finite-image analysis, its physical assumptions,
and how to interpret the results. The [implementation plan](image-space-zernike-implementation-plan.md)
records the engineering contract; [image-reference conventions](image-reference-conventions.md)
describes references shared with other analyses.

## Why the pupil coordinates matter

A Zernike expansion describes optical path difference (OPD) as a function of
position within a specified pupil. Its coefficients depend on more than the
traced optical paths: the reference wavefront, coordinate axes, normalization
radius, transmitted region, and integration measure all define the result.

Previously, finite-image analysis treated intermediate coordinates from
RayOptics' equally inclined chord (EIC) wave-aberration calculation as final
exit-pupil coordinates. Those intermediate quantities do not establish the
required physical projection for tilted, decentered, clipped, or obscured pupils.
Normalizing them by the largest sampled radius also allowed the coordinate
scale to change with sampling density.

PR #252 explicitly constructs the reference sphere, intersects outgoing rays
with it, and projects those intersections into a transverse plane. It then fits
the wavefront using the area represented by each projected sample. This makes
the geometry and the meaning of the average explicit.

## The reference wavefront

For finite imaging, an ideal spherical wave converging to the selected image
point provides the reference. OPD measures optical-path departure from that
reference; an ideal matching wavefront has no spatially varying OPD.

Let `Q` be the selected image reference point, `P` the chief-ray exit-pupil
reference supplied by RayOptics, and `R = |Q - P|`. The reference sphere has
centre `Q`, radius `R`, and passes through `P`.

Both points and all outgoing rays are transformed into the same global
Cartesian frame. The complete image-surface transform matters: adding an axial
gap thickness alone cannot represent a tilted or folded image space. Curved
image surfaces also require the full reference point, including surface sag.
The OPD calculation and pupil projection must describe the same sphere.

The two public reference choices remain:

- **Chief ray:** the sphere centre is the chief-ray image intersection.
- **Centroid:** the shared wavefront builder starts from the geometric centroid
  and solves for a reference with zero fitted transverse OPD slopes in
  input-pupil coordinates. The resulting sphere is then used by Zernike analysis.

The centroid convention is not an exact minimization of projected-area wavefront
variance. This PR does not optimize focus or silently remove tilt and defocus.
Changing reference geometry can change coefficients without changing the lens.
Also, `P` is the existing RayOptics Hopkins pupil reference, not a newly computed
differential real exit pupil.

## From rays to projected pupil coordinates

An outgoing ray line is `S(t) = O + t d`, where `d` is a unit direction. Its
intersection with the sphere satisfies:

```text
|O + t d - Q|² = R²
```

The implementation compares the two roots using their alignment with `P - Q`
and selects the most pupil-side intersection, requiring it to lie in that
hemisphere. Both positive and negative `t` are allowed. Thus a virtual extension
uses the same geometric branch convention as a real intersection. A traceable
ray that cannot reach the selected cap produces a geometry error.

Define `ez = (Q - P) / R`. The transformed image x axis is projected normal to
`ez` to obtain `ex`, with a deterministic fallback if it is nearly parallel.
Then `ey = ez × ex`, so `ex × ey = ez`. For a sphere intersection `S`:

```text
x = (S - P) · ex          y = (S - P) · ey
u = x / a                v = y / a
rho = sqrt(u² + v²)      theta = atan2(v, u)
```

Here `a` is the normalization-disk radius, distinct from sphere radius `R`.
This is an orthographic projection of the sphere cap. Quantities `x/R` and
`y/R` are transverse components of the sphere's radial unit vector; they are
not generally the actual aberrated ray's direction cosines.

The normalization disk is centred at the chief-ray pupil reference and encloses
the sampled transmitted footprint. An elliptical or clipped footprint keeps
its shape inside this circle. Stretching an ellipse into a disk would change
the spatial meaning of the polynomial modes.

## Why projected-area weights are necessary

Uniform sampling at the input pupil need not remain uniform after projection
into image space. Equal weighting would give extra influence to regions where
projected rays happen to be denser. The chosen measure is projected area
`dx dy`, rather than sphere surface area, solid angle, or ray count.

Connected input-grid cells are split into triangles. Each accepted projected
triangle contributes one third of its area to each vertex. The accumulated
vertex weights `A_i` approximate integrals over the transmitted footprint:

```text
mean_A(f) = sum(A_i f_i) / sum(A_i)
```

Only triangles with three valid vertices contribute. This preserves sampled
clipping and holes instead of filling the pupil with invented OPD values.
Finite sampling can still miss a narrow obstruction or approximate a curved
boundary poorly, so these weights remain numerical quadrature estimates.

Orientation reversals, singular cells, and overlapping projected triangle
interiors are rejected. Taking absolute areas without these checks could hide a
fold, where multiple ray branches occupy the same projected location and a
single-valued wavefront fit is no longer the supported model.

Nested grids refine both the enclosing radius and mapped support area while
the reference sphere stays fixed. The defaults compare successive relative
changes against 0.5% for radius and 2% for area, with a maximum resolution of
129 samples per input axis. The enclosing radius receives a relative `1e-10`
roundoff margin. Convergence status is reported; reaching the sampling cap
does not establish convergence. These criteria also do not independently
guarantee convergence of every high-order coefficient or sampled extremum.

## What the Zernike fit solves

With OPD samples `W_i` in waves and polynomial values `Z_ij`, the coefficients
solve the weighted least-squares problem:

```text
minimize over c:  sum_i A_i (W_i - sum_j Z_ij c_j)²
```

The implementation solves the system with rows multiplied by `sqrt(A_i)`
using NumPy's least-squares solver. It checks sample sufficiency, rank, and
conditioning; forming normal equations would unnecessarily worsen numerical
conditioning.

Terms are explicit `(n, m)` pairs. Positive `m` uses `cos(m theta)`, negative
`m` uses `sin(|m| theta)`, and zero uses the radial polynomial alone. Caller
ordering is preserved. The unit-disk RMS-normalized coefficient is:

```text
c_rms = c / sqrt((2 - delta(m, 0)) (n + 1))
```

On a complete, uniformly weighted unit disk, the normalized modes are
orthogonal. On clipped or obscured support they generally are not. Coefficients
remain useful least-squares descriptors there, but their squared sum is not
the measured wavefront variance. Changing the requested terms can redistribute
coefficients on partial support.

## Interpreting the reported metrics

The wavefront statistics use the same accepted samples and area weights:

| Quantity | Definition and interpretation |
| --- | --- |
| Mean OPD | `mu = mean_A(W)`; a sampled piston reference. |
| RMS wavefront error | `sqrt(mean_A((W - mu)²))`; independent of the requested terms and fitted piston. |
| Peak-to-valley | `max(W) - min(W)` over accepted samples; unresolved extrema can change with refinement. |
| Fit residual RMS | `sqrt(mean_A((W - Zc)²))`; the error left by the requested polynomial expansion. |
| Pupil coverage | `sum(A_i) / (pi a²)`; geometric support relative to the enclosing disk, not optical throughput. |
| Condition number | Sensitivity of the weighted fit; large values indicate poorly distinguishable coefficient combinations. |

Subtracting a fitted piston is not a substitute for subtracting `mu`, especially
when the requested basis lacks piston or the pupil is incomplete. Direct sample
statistics prevent the reported physical RMS from changing merely because the
user changes the term list.

The field historically named `strehl_ratio` is presented as coherent reference
intensity:

```text
I_ref = |mean_A(exp(i 2 pi W))|²
```

This is a scalar, uniform-amplitude estimate normalized to the zero-phase result
on the same support. Constant piston does not change it. It evaluates the
selected reference point; it does not search for peak Strehl or include coating
transmission, polarization, or apodization. Area weights alone are not a model
of optical amplitude transport.

## Wavelengths, scope, and comparison limits

OPD in system length units is divided by the traced wavelength in the same
units to obtain waves. Wavelength-specific chief-ray aiming and refractive
indices are necessary as well: rescaling phase cannot correct geometry traced
with the wrong wavelength reference.

Afocal analysis retains its separate plane-wave reference and normalized
input-pupil sampling path. The finite reference-sphere construction and its
validation claims do not extend to that path. Shared wavefront-map, PSF, MTF,
and optimization conventions are not redefined by this Zernike change.

Comparisons with OSLO or another optical program must match the prescription,
wavelength, field, aperture, reference point, focus, axes, normalization disk,
integration measure, and term list. In particular, a minimum-RMS reference and
a special 37-term list are not equivalent to the current reference choices and
generic Fringe ordering. Coefficient differences alone do not establish an error.

Finally, valid projection cannot repair invalid upstream optical paths. The
documented [first-surface tilted/decentered OPD issue](rayoptics-tilted-or-decentered-first-surface-opd.md)
still requires preserving the dummy reference surface in affected RayOptics
models. Agreement of transverse ray fans does not prove OPD validity.

## Implementation map

- [Projected pupil geometry and quadrature](../src/python/src/rayoptics_web_utils/zernike/projected_pupil.py):
  sphere construction, branch selection, projection, area integration, and refinement.
- [Zernike fitting and metrics](../src/python/src/rayoptics_web_utils/zernike/zernike.py):
  weighted fit, normalization, direct statistics, and reference intensity.
- [RayGrid](../src/python/src/rayoptics_web_utils/raygrid/raygrid.py):
  reference metadata and wavelength-aware wavefront-grid integration.
