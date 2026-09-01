# Image-reference conventions

Ray Optics Web preserves the public `image_point="chief_ray" | "centroid"`
choice while distinguishing geometric centroids from wavefront references.

## Geometric analyses

Finite spot diagrams use the arithmetic mean of valid local image-surface ray
positions. A polychromatic spot has one centroid across all configured
wavelengths: each valid ray carries its wavelength's spectral weight. This
keeps wavelength-dependent lateral colour visible. Ray-aberration fans instead
use a separate centroid for each wavelength and share that wavelength's
reference between sagittal and tangential fans.

For an afocal image conjugate, the corresponding geometric quantity is the
normalized weighted mean output direction. Angular results are reported in
arcseconds; finite positions use the model's system length unit.

## Wavefront analyses

A finite centroid wavefront begins at the geometric centroid and fits a shifted
and tilted reference sphere. The transverse sphere centre is solved so the
weighted OPD fit has zero sagittal and tangential pupil slopes. An afocal
centroid wavefront analogously fits the normal of a plane-wave reference with
two transverse angular parameters.

OPD fans use that centroid-fitted geometry while retaining RayOptics' fan
piston convention: the chief ray at normalized pupil coordinate zero has zero
OPD in both sagittal and tangential fans. Two-dimensional wavefront-grid
consumers instead remove the valid-cell mean after fixing the reference
geometry. That zero-mean grid convention remains shared by wavefront maps,
diffraction PSF and MTF, Strehl, Zernike, and wavefront optimization.

Monochromatic OPD-fan geometry fits the selected wavelength. An all-wavelength
OPD fan fits reference geometry at the configured primary wavelength and
reuses that geometry for every wavelength, while refractive indices, traced
optical paths, and conversion to waves remain wavelength-specific.

## Sampling and rejected rays

Pupil cells are uniformly weighted. Sampling is uniform inside the field's
`vignetting_bbox`; because that box already incorporates the field vignetting
transformation, traced samples disable a second vignetting application.
Aperture checking remains enabled. Blocked rays, failed traces, non-finite
samples, and rays that cannot be projected onto the requested reference are
excluded. A centroid fails explicitly when no positively weighted valid rays
remain, and a wavefront fit also requires at least three non-collinear rays.

Spectral weights and aperture throughput are included. Apodization,
polarization, coating transmission, and other ray-energy weights are not
currently modeled.

## Curved image surfaces

Finite reference points are complete local three-dimensional points. At
transverse centroid `(x, y)` and focus shift `focus`, the axial coordinate is
`image_profile.sag(x, y) + focus`; it is not replaced by `focus`. This avoids
introducing artificial defocus on curved image surfaces.

## Optical references

- [Standard Spot Diagram](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v25101/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Standard_Spot_Diagram.html)
- [Optical Path Difference](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v251/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Optical_Path_Difference.html)
- [Optimization Function Reference Points](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v251/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Optimization_Function_Reference_Points.html)
