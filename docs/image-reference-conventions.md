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
diffraction PSF and MTF, Strehl, and wavefront optimization. Zernike analysis
uses the same fixed reference geometry and calculates its sampled mean and
standard deviation directly from its own projected-area quadrature.

Finite Zernike analysis constructs the selected sphere in the model's global
Cartesian frame. Its centre is the complete transformed image point. Its pupil
reference is RayOptics' chief-ray exit-pupil point; this is a documented reuse
of RayOptics' finite Hopkins geometry and is not claimed to be a differential
real exit pupil. The sphere radius is the distance between those points. OPD is
evaluated against that same sphere, including tilted or folded image transforms.

Each outgoing ray line is intersected with the hemisphere containing the pupil
reference. Positive and negative ray parameters use the same hemisphere rule,
so real and virtual extensions do not select roots by an unexplained sign. The
sphere cap is orthographically projected onto right-handed transverse axes with
`ex × ey = ez`, where `ez` points from the pupil reference to the sphere centre.
The projected coordinates divided by sphere radius are transverse components
of the sphere's radial unit vector; they are not generally aberrated-ray
direction cosines.
The automatic normalization disk is a chief-ray-centred enclosing circle. Its
radius is resolved on nested pupil grids while the sphere is frozen.

Connected input-pupil cells are triangulated in projected coordinates. Only
fully transmitted triangles contribute, preserving clipping and holes; local
orientation reversals or singular cells are rejected as unsupported folded
pupil geometry. Vertex weights integrate projected area `dx dy`. Zernike
coefficients are therefore weighted least-squares coefficients on the actual
transmitted support within the disk. On partial support they are not independent
full-disk orthogonal aberration contributions.

Reported Zernike RMS is the projected-area-weighted standard deviation of the
accepted OPD samples, and P-V is calculated directly from those samples. These
metrics do not depend on the requested polynomial list or the fitted piston.
Fit residual and design-matrix conditioning are reported separately. Dividing
unnormalized coefficients by `sqrt((2-delta(m,0))*(n+1))` is a unit-disk RMS
normalization convention; coefficient RSS is not substituted for measured RMS.
The reported reference intensity is `|mean(exp(i*2*pi*W))|^2` under a uniform
scalar-amplitude assumption at the selected reference point. It is not a search
for peak Strehl and does not model coating, polarization, or apodization weights.

Afocal Zernike analysis remains a separate plane-wave path using its existing
normalized input-pupil cells. Finite reference-sphere geometry and its validation
claims do not apply to the afocal path.

Monochromatic OPD-fan geometry fits the selected wavelength. An all-wavelength
OPD fan fits reference geometry at the configured primary wavelength and
reuses that geometry for every wavelength, while refractive indices, traced
optical paths, and conversion to waves remain wavelength-specific.

## Sampling and rejected rays

Shared geometric and centroid-reference builders weight input-pupil cells
uniformly. Their sampling is uniform inside the field's
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
