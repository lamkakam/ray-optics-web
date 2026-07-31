# Exact Real-Ray Optical Specifications

This document is both an optics overview and a maintainer reference for
[`optical_specs.py`](../src/python/src/rayoptics_web_utils/optical_specs.py).
It describes the current behavior against the project's pinned
[RayOptics 0.9.8](../src/python/pyproject.toml); it does not propose a different
API or tracing model.

The module separates two jobs that RayOptics normally derives from the same
specification:

- RayOptics keeps the requested pupil key and value and uses them to compute
  paraxial first-order data.
- `ExactOpticalModel` separately resolves the launch point and direction used
  by physical rays after every model update.

Paraxial quantities may therefore be used for reporting, for an entrance-pupil
plane, or for an initial search scale. They are never accepted as proof that an
exact physical constraint has been met.

## Coordinates and ray names

The nominal optical axis is +Z, from object space toward image space. +X and
+Y are the transverse axes, and every ray intersection and direction is
expressed in the local coordinates of its current interface. This matters for
tilted or decentered surfaces: an image-height target and a stop-centre
residual are both evaluated in their respective surface-local frames.

For relative pupil coordinate $(\xi,\eta)$:

- $(0,0)$ is the chief ray;
- $(0,1)$ is the +Y marginal ray;
- the directions used in angle calculations are normalized real-ray direction
  vectors, not paraxial slopes.

The +Y label identifies the launched pupil boundary. After refraction, that
ray's image-space Y direction need not remain positive.

## Supported exact specifications

| Specification | Physical constraint | Exact launch quantity | Final verification |
| --- | --- | --- | --- |
| Image-space geometric F-number, `("image", "f/#")` | $F/\#=1/(2\tan u')$, where $u'$ is the real image-space angle between the axial chief and +Y marginal rays | Object-space entrance-pupil diameter $D_o$, found by a scalar real-ray solve | Retrace both unclipped rays and compare $u'$ with $\arctan(1/[2(F/\#)])$ |
| Object-space numerical aperture, `("object", "NA")` | $\mathrm{NA}=n_o\sin u$, where $u$ is the real object-space chief-to-+Y angle | Chief-centred cone tangent $\tan u=\mathrm{NA}/\sqrt{n_o^2-\mathrm{NA}^2}$ | Retrace both unclipped rays and compare $n_o\sin u$ with the requested NA |
| Object-space entrance-pupil diameter, `("object", "epd")` | A normalized pupil radius of one represents $D_o/2$ | The supplied $D_o$ is used directly; no root solve or module-level range check is performed | No independent pupil residual; the launch is constructed at radius $D_o/2$, and an exact image-height chief is separately forward verified |
| Exact image height, `("image", "height")` | The chief ray must intersect the image profile at $[x,y,\operatorname{sag}(x,y)]$ and pass through the physical stop centre | A finite object point and direction, or an infinite-conjugate input-plane anchor and direction | A mandatory unclipped forward retrace must return to both the stop centre and requested image coordinate |

Other pupil keys are rejected by `ExactOpticalModel`, and
`ExactImageHeightFieldSpec` rejects any field key other than
`("image", "height")`.

## Pupil constraints

### Image-space geometric F-number

Let $u'$ be the unsigned angle between the last-segment directions of the
on-axis chief ray and the on-axis +Y marginal ray:

$$
u' = \cos^{-1}\!\left(\hat{\boldsymbol d}'_c \mathbin{\cdot}
\hat{\boldsymbol d}'_{+Y}\right).
$$

For a geometric cone with axial distance $l'$ and radius $r'$,
$\tan u'=r'/l'$. The diameter is $2r'$, so

$$
F/\# = \frac{l'}{2r'} = \frac{1}{2\tan u'}.
$$

The requested F-number is therefore converted to the target angle

$$
u'_{\mathrm{target}}=\arctan\!\left(\frac{1}{2(F/\#)}\right).
$$

The solver varies object-space EPD, not a paraxial ray slope. It begins at zero
EPD and requires the two axial rays to be coincident in angle there. It then
increases EPD in small steps until the first real-ray crossing of the target is
bracketed and applies a Brent solve inside that bracket. The current paraxial
entrance-pupil diameter only sets the continuation step scale.

No image-space refractive-index factor appears in this definition. This is the
module's **geometric angular F-number**. It is not a diffraction F-number, a
radiometric or transmission-weighted effective F-number, an image-space NA, or
a paraxial replacement for the real ray angle.

### Object-space numerical aperture

At the reference wavelength, let $n_o$ be the absolute refractive index of the
object-space gap and let $u$ be the unsigned angle between the first-segment
directions of the axial chief and +Y marginal rays. The physical definition is

$$
\mathrm{NA}=n_o\sin u.
$$

Writing $s=\sin u=\mathrm{NA}/n_o$ gives

$$
\tan u
=\frac{s}{\sqrt{1-s^2}}
=\frac{\mathrm{NA}}{\sqrt{n_o^2-\mathrm{NA}^2}}.
$$

This conversion is important outside the small-angle, unit-index limit:
`tan(NA)` and `NA` are not valid general launch slopes. The implementation
requires $0\leq\mathrm{NA}<n_o$; equality would produce a grazing,
non-propagating limit with an infinite tangent.

The index is `abs(seq_model.rndx[0][reference_wvl])`. Taking the absolute value
removes RayOptics propagation-sign bookkeeping while retaining the physical
medium index. The same central/reference wavelength is used for the
verification trace.

### Chief-centred launch axes

For a unit chief direction $\boldsymbol c$, the angular cone and the
infinite-conjugate EPD launch use a transverse orthonormal basis. Starting from
object-local +X,

$$
\boldsymbol e_x=
\operatorname{normalize}\!\left(\boldsymbol X_o
-(\boldsymbol X_o\mathbin{\cdot}\boldsymbol c)\boldsymbol c\right),
\qquad
\boldsymbol e_y=\operatorname{normalize}(\boldsymbol c\times\boldsymbol e_x).
$$

Object-local +Y is used as the projection seed only if the chief ray is
parallel to object-local +X. An object-NA ray is then launched as

$$
\boldsymbol d(\xi,\eta)=
\operatorname{normalize}\!\left[
\boldsymbol c+\tan u\left(\xi\boldsymbol e_x+\eta\boldsymbol e_y\right)
\right].
$$

Thus $(0,1)$ makes exactly the requested angle with the chief direction even
for an off-axis chief ray.

### Object EPD at finite and infinite conjugates

Let $D_o$ be either a requested object EPD or the EPD resolved from image-space
F-number.

For a finite-conjugate launch (and the ordinary `FieldSpec` path), let
$\boldsymbol p_c$ and $\boldsymbol c$ be the object point and chief direction,
and let

$$
z_{\mathrm{EP}}=\mathrm{obj\_dist}+\mathrm{enp\_dist}
$$

be RayOptics' current first-order entrance-pupil plane. The real chief ray is
intersected with that plane:

$$
\boldsymbol q_c=\boldsymbol p_c+
\frac{z_{\mathrm{EP}}-p_{c,z}}{c_z}\boldsymbol c.
$$

The normalized pupil sample targets

$$
\boldsymbol q(\xi,\eta)=\boldsymbol q_c+
\frac{D_o}{2}(\xi\boldsymbol X_o+\eta\boldsymbol Y_o),
\qquad
\boldsymbol d=\operatorname{normalize}(\boldsymbol q-\boldsymbol p_c).
$$

The paraxial data locates the pupil plane, but its origin is replaced by the
real chief-ray intercept $\boldsymbol q_c$ and the resulting ray is traced
through every physical surface. A chief direction with effectively zero Z
component cannot reach this plane and is rejected.

An exact image-height field at infinite conjugate represents a collimated
bundle instead. If $\boldsymbol p_c$ is the recovered chief-ray anchor on the
input reference plane, its EPD rays are

$$
\boldsymbol p(\xi,\eta)=\boldsymbol p_c+
\frac{D_o}{2}(\xi\boldsymbol e_x+\eta\boldsymbol e_y),
\qquad \boldsymbol d(\xi,\eta)=\boldsymbol c.
$$

This is a true chief-centred cross-section perpendicular to the propagation
direction. A direct object-EPD specification with an ordinary RayOptics
`FieldSpec` continues to use RayOptics' native EPD launch; the special
infinite-conjugate construction is needed when the chief itself came from the
exact reverse image-height solve.

## Exact image-height fields

### The target is a point on the image profile

`ExactImageHeightFieldSpec` reads `Field.xv` and `Field.yv`. These are absolute
field coordinates: for a relative field they already include multiplication by
the maximum field value. A sample $(x,y)$ means the image-surface-local point

$$
\boldsymbol p_i=[x,\ y,\ \operatorname{sag}(x,y)].
$$

Consequently, image height is not a request for the paraxial image plane or
for a flat $z=0$ target on a curved image surface. The profile's own sag
function supplies Z in the model's length units.

### Reverse solve through the physical stop centre

The chief ray is known by two physical constraints: its image point and its
stop intercept. The implementation uses optical reversibility to recover the
otherwise unknown object launch:

1. Start at $\boldsymbol p_i$ and trace the sequential model in reverse at the
   central wavelength.
2. Parameterize the reverse direction by two tangents and solve until its
   stop-surface intersection has the requested local X/Y centre.
3. Reverse the recovered object-side direction to obtain a forward launch.
4. Forward trace that launch and require it to hit both the stop centre and
   the requested image coordinate.

The physical stop is `seq_model.stop_surface`, or surface 1 when RayOptics has
no explicit stop. Its centre is the `(x_offset, y_offset)` of the first clear
aperture on that surface; without a clear aperture it is `(0, 0)`. This makes
decentered stop constraints explicit. The stop radius is deliberately not part
of the solve.

For a finite object, the final reverse segment supplies the object-surface
intersection point. Negating its reverse direction produces the forward chief
launch.

For an infinite object, a point at the nominal object surface is not a useful
representation of a collimated ray. The implementation instead takes the
reverse segment at the first physical surface, negates its direction,
back-projects it to that surface's local vertex plane, and transforms the point
and direction into the input coordinate frame. The result is an anchor and a
direction for the parallel input bundle. Infinite exact image-height fields
are marked wide-angle so RayOptics uses that launch directly instead of trying
to intersect a remote object surface.

Forward verification is mandatory even after the reverse solver reports
success. The image profile intersection itself supplies the target Z, so the
explicit final comparison uses image X/Y together with stop X/Y.

## Numerical design choices

### Continuation stays on a reachable real-ray branch

A nonlinear optical system can have multiple mathematical roots, and a distant
field or large pupil jump can move a local solver to another branch. The
implementation therefore approaches solutions continuously.

For image F-number, EPD increases from zero in at most 256 steps. The first
sign-changing interval is used, which favors the first continuously reachable
real-ray solution rather than an arbitrary later root.

For image height, the axial target is solved and cached first even when the
user did not request an axial sample. Requested fields are sorted by radial
distance $\sqrt{x^2+y^2}$. Each new target continues from the preceding solved
coordinate and tangent along a straight interpolation. There are at least
eight subdivisions, with more added so a continuation interval is no longer
than 0.1 model units.

Any missed profile or total internal reflection along that continuation is a
physical loss of the branch, not a reason to jump to a paraxial answer.

### Meridional symmetry is solved in one dimension

In a centred system, a Y-only image target, a stop centre with zero X offset,
and a zero sagittal starting tangent define a ray in the Y-Z meridional plane.
On that symmetric subspace the sagittal residual is identically zero. Keeping
it as a second equation for the one physical degree of freedom can present a
singular numerical Jacobian.

The implementation detects this case and solves only stop-Y versus the
tangential direction. It then restores a zero sagittal tangent and still
checks the full two-component stop residual. General X/Y targets and offset
stops retain the two-dimensional solve.

### Solver convergence is not physical acceptance

The scalar Brent solve uses root tolerances of $10^{-12}$. The default vector
least-squares solve uses `xtol`, `ftol`, and `gtol` of $10^{-12}$ and at most
400 function evaluations. These values govern the numerical algorithms, but a
solver's success flag alone is insufficient.

Every solved physical residual uses

$$
|a-b|\leq 10^{-9}+10^{-9}|b|,
$$

component by component. This combined absolute/relative check is applied to
the final F-number angle, object NA, reverse stop residual, forward stop
residual, and forward image coordinate. For a zero target residual, the
effective requirement is the $10^{-9}$ absolute tolerance.

## Apertures, vignetting, updates, and failures

Specification rays are unvignetted and unclipped. Pupil traces explicitly use
`apply_vignetting=False` and `check_apertures=False`; reverse and verification
traces also disable aperture checks. Surface intersections, refraction,
reflection, missed profiles, and total internal reflection remain active.

This ordering avoids a circular dependency: an old or undersized aperture
must not prevent the ray needed to define the requested pupil or field from
being found. The exact ray defines the requested bundle first. Vignetting can
then measure clipping, and, when `seq_model.do_apertures` is enabled,
`ExactOpticalModel.update_model()` recalculates clear apertures after resolving
the exact pupil. See
[`rayoptics-aperture-findings.md`](./rayoptics-aperture-findings.md) for how
RayOptics 0.9.8 distinguishes clear apertures, edge apertures, `max_aperture`,
automatic aperture sizing, and vignetting.

Exact state is update-scoped:

- `ExactOpticalModel.update_model()` clears the resolved EPD and NA tangent,
  performs the normal RayOptics update, resolves the requested pupil again,
  and only then performs the final automatic-aperture pass.
- `ExactImageHeightFieldSpec.update_model()` clears its launch maps and solves
  every requested coordinate again. Exact image-height fields temporarily
  disable RayOptics' paraxial chief-ray aiming while first-order properties are
  refreshed.
- Launches are cached both by field identity and by absolute $(x,y)$
  coordinate. Duplicate coordinates share a solution, and an ad hoc field can
  continue from the cached axial solution. No cache survives the next model
  update.

Geometry, material, wavelength, stop, or field edits therefore take effect
when the caller invokes `update_model()`; stale exact launches are not retained
through that update.

Before the exact pupil state exists, launch dispatch may delegate to RayOptics
while `super().update_model()` builds its first-order scaffolding. This is not a
failure fallback. The subsequent exact resolution must succeed. Invalid
values, unsupported keys, a missing real-ray branch, missed surfaces, total
internal reflection, solver failure, or a final residual outside tolerance
raises `ExactSpecError` (or its trace/convergence subclass) and aborts the
update. A paraxial launch is never substituted as the final physical result.
