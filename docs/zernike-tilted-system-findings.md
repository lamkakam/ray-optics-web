# Zernike coordinates: historical tilted-system failures and current convention

## Current implementation

[`zernike.py`](../src/python/src/rayoptics_web_utils/zernike/zernike.py)
fits conventional Zernike polynomials in RayOptics' original normalized pupil
labels, `rg.grid[0]` and `rg.grid[1]`, for every field and for both finite and
afocal grids. `_normalized_pupil_grid` copies those labels and converts only
OPD from central-wavelength waves to traced-wavelength waves.
`_extract_exit_pupil_grid` remains a compatibility wrapper with this same
behavior; its name no longer describes coordinate extraction.

Finite coordinates and OPD with `x² + y² <= 1` define one sample set for the
fit, RMS, PV, and Strehl. Surviving samples are not recentered or rescaled to
fill the disk. An empty usable pupil raises a descriptive `ValueError`.
Aperture checking and the shared grid factory's vignetting handling remain in
place. Coefficients fit the original referenced OPD; metric RMS is the sampled
standard deviation, independent of term order, piston inclusion, or term count.

See [RayGrid and OPD](rayoptics-raygrid-opd.md) for the tracing path and
[image-reference conventions](image-reference-conventions.md) for reference
geometry, metric mean removal, and coefficient normalization assumptions.
This change does not reconstruct a physical exit-pupil plane or guarantee
numerical identity with Zemax or OSLO. Recomputed finite-system coefficients
can change, especially off axis; no stored-data migration is performed.

## Historical failure: paraxial-radius normalization

An earlier investigation of the tilted Houghton-Herschel 150 mm f/8 example
reported these on-axis results at 546.073 nm in Fringe ordering:

| Quantity | Historical reported value |
|----------|---------------------------|
| P-V WFE | 0.1303 waves |
| RMS WFE | 0.0548 waves |
| Strehl | 0.9719 |
| Z1 piston | -65066 waves |
| Z4 defocus | 53911 waves |
| Z9 primary spherical | -31603 waves |

That implementation extracted finite OPD preprocessing `p_coord` values and
divided them by the paraxial `fod.exp_radius`. A poor paraxial radius in a
significantly tilted system could reject most samples through the unit-disk
mask, leaving an ill-conditioned fit. A later implementation normalized by
the maximum sampled EIC radius, with a paraxial fallback near zero. That
avoided the particular radius failure but still changed the pupil labels.
Both coordinate schemes are now superseded.

The old note called RMS correct because it was computed directly from OPD.
That statement was too broad: the implementation preceding this correction
subtracted `coefficients[0]` before calculating RMS, so the result depended on
the fit and assumed piston was first. Historical metric values above are
observations, not validation of the current RMS definition. PV is unchanged
by subtraction of a constant; RMS requires subtraction of the sample mean.

## Why EIC displacements are not conventional pupil labels

In RayOptics 0.9.8 `raytr/waveabr.py`,
`wave_abr_pre_calc_finite_pup` forms `p_coord = eic_exp_pt - cr_exp_pt`.
Its four-item package contains `pre_opd`, `p_coord`, `b4_pt`, and `b4_dir`.
These are geometric data used to calculate OPD efficiently on refocus.
The EIC expansion point depends on the test ray and chief-ray geometry;
its transverse displacement is not the normalized input label assigned to
that ray, nor a reconstruction of every ray's intersection with one physical
exit-pupil plane. Dividing all displacements by their largest radius cannot
undo field-dependent distortion, shear, or an offset. Clipping can also change
that largest radius and hence every fitted coordinate.

The infinite-reference-sphere preprocessing path has a different six-item
package. Neither package supplies the labels used by the current fit.
`RayGrid` already preserves the input labels alongside its focused OPD.

## Historical OSLO comparison

The earlier Cooke Triplet investigation reported:

| Term | Input-label fit | EIC-coordinate fit | Reported OSLO reference |
|------|-----------------|--------------------|-------------------------|
| Z7 coma | +0.243 | +0.312 | +0.327 |
| Z11 spherical | -0.499 | -0.714 | -0.775 |
| Z12 secondary astigmatism | +0.396 | +0.765 | +0.820 |

These are historical observations, not evidence that EIC coordinates are a
superior conventional Zernike basis. Agreement in a few coefficients does not
establish agreement in pupil mapping, sampling, reference geometry, or fitting
conventions. The former EIC-specific magnitude tests have been replaced by
independent fits of the same traced wavefront in its normalized labels in
[`test_zernike.py`](../src/python/tests/rayoptics_web_utils/zernike/test_zernike.py).
Symmetry, ordering, wavelength, centroid, afocal, and tilted-system regressions
remain covered.

## Separate first-surface OPD warning

Correct pupil labels cannot repair an incorrect traced OPD. Preserve the dummy
planar air/reference surface before a first tilted or decentered optical
surface where required by the
[first-surface OPD warning](rayoptics-tilted-or-decentered-first-surface-opd.md).
Transverse ray-fan agreement alone does not validate OPD. The coordinate and
RMS corrections do not alter this topology issue or the reference geometry.
