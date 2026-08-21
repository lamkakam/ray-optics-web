# Exact Real-Ray Optical Specifications

This document is both an optics overview and a maintainer reference for
[`optical_specs.py`](../src/python/src/rayoptics_web_utils/optical_specs.py).
It describes the current behavior against the project's pinned
[RayOptics 0.9.8](../src/python/pyproject.toml); it does not propose a different
API or tracing model.

`field.isWideAngle === true` is the sole application-level opt-in for this
entire exact stack. Script generation uses `ExactOpticalModel` only for that
explicit opt-in. Opted-in Image Height uses `ExactImageHeightFieldSpec`, and
opted-in Object Height uses `ExactObjectHeightFieldSpec`; Object Angle retains
RayOptics' `FieldSpec` inside the exact model. A false or omitted flag generates
RayOptics' ordinary `OpticalModel` and `FieldSpec`, preserving native Object NA,
Image F/#, field conversion, and aiming behavior. The public exact classes
apply the same guard internally and delegate to their RayOptics superclasses
unless `is_wide_angle is True`.

The field editor and store preserve the explicit Object Height checkbox state.
Exact Object Height is finite-conjugate only: an infinite object conjugate has
no finite object-surface point whose height can be held fixed, so an opted-in
`("object", "height")` model raises `ExactSpecError` instead of silently
changing the specification or falling back to ordinary aiming.

When opted in, the module separates two jobs that RayOptics normally derives
from the same specification:

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

## Opted-in exact specifications

| Specification | Physical constraint | Exact launch quantity | Final verification |
| --- | --- | --- | --- |
| Image-space geometric F-number, `("image", "f/#")` | $F/\mathrm{number}=1/(2\tan u')$, where $u'$ is the real image-space angle between the axial chief and +Y marginal rays | Object-space entrance-pupil diameter $D_o$, found by a scalar real-ray solve | Retrace both unclipped rays and compare $u'$ with $\arctan(1/[2(F/\mathrm{number})])$ |
| Object-space numerical aperture, `("object", "NA")` | $\mathrm{NA}=n_o\sin u$, where $u$ is the real object-space chief-to-+Y angle | Chief-centred direction-sine disk with $\sin u_\rho=\rho\,\mathrm{NA}/n_o$ | Retrace both unclipped rays and compare the marginal value $n_o\sin u_1$ with the requested NA |
| Object-space entrance-pupil diameter, `("object", "epd")` | A normalized pupil radius of one represents $D_o/2$ | The supplied $D_o$ is used directly; no root solve or module-level range check is performed | No independent pupil residual; the launch is constructed at radius $D_o/2$, and an exact height-field chief is separately forward verified |
| Exact finite Object Height, `("object", "height")` | Every pupil ray starts at the requested object-local point $[x_v,y_v,0]$, and the chief passes through the local stop centre | Only the chief direction tangents $(t_x,t_y)$ are solved; the object point never moves | A mandatory complete unclipped forward trace must preserve the object point and hit the local stop centre |
| Exact image height, `("image", "height")` | The chief ray must intersect the image profile at $[x,y,\mathrm{sag}(x,y)]$ and pass through the physical stop centre | RayOptics' native real-image-height launch when supported, otherwise or after strict refinement a finite object point/direction or infinite-conjugate input-plane anchor/direction | A mandatory unclipped forward retrace must return to both the stop centre and requested image coordinate |

Other pupil keys are rejected by an opted-in `ExactOpticalModel`, and an
opted-in exact field class rejects any field key other than its documented
height key. `ExactObjectHeightFieldSpec` also rejects an infinite object
conjugate. Without the opt-in, those classes do not impose these constraints
and instead delegate.

## Pupil constraints

### Image-space geometric F-number

Let $u'$ be the unsigned angle between the last-segment directions of the
on-axis chief ray and the on-axis +Y marginal ray:

$$
u' = \arccos\left(\hat{\boldsymbol d}'_c \mathbin{\cdot}
\hat{\boldsymbol d}'_{+Y}\right).
$$

For a geometric cone with axial distance $l'$ and radius $r'$,
$\tan u'=r'/l'$. The diameter is $2r'$, so

$$
F/\mathrm{number} = \frac{l'}{2r'} = \frac{1}{2\tan u'}.
$$

The requested F-number is therefore converted to the target angle

$$
u'_{\mathrm{target}}=\arctan\left(\frac{1}{2(F/\mathrm{number})}\right).
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
object-space gap and let $u_1$ be the unsigned angle between the first-segment
directions of the axial chief and +Y marginal rays. The physical definition is

$$
\mathrm{NA}=n_o\sin u_1.
$$

For normalized pupil radius
$\rho=\sqrt{\xi^2+\eta^2}$, RayOptics' normalized-pupil convention requires
linear sampling in direction sine:

$$
\sin u_\rho=\rho\frac{\mathrm{NA}}{n_o},
\qquad 0\leq\rho\leq1.
$$

This direction-sine rule is important at high NA. Multiplying the marginal
ray's tangent by $\rho$ produces the correct boundary angle but oversamples
every interior radius. Treating NA itself as an angle or slope is also invalid
outside the small-angle, unit-index limit. The implementation requires
$0\leq\mathrm{NA}<n_o$; equality is the grazing, non-propagating limit.

Samples with $\rho>1$ lie outside the normalized angular pupil and raise
RayOptics' blocked-ray exception. Square wavefront grids consequently retain
their normal shape while their four outside-disk corners become blocked/NaN
samples instead of attempting non-physical longitudinal direction cosines.

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
\mathrm{normalize}\left(\boldsymbol X_o
-(\boldsymbol X_o\mathbin{\cdot}\boldsymbol c)\boldsymbol c\right),
\qquad
\boldsymbol e_y=\mathrm{normalize}(\boldsymbol c\times\boldsymbol e_x).
$$

Object-local +Y is used as the projection seed only if the chief ray is
parallel to object-local +X. Define $s=\mathrm{NA}/n_o$ and
$\rho^2=\xi^2+\eta^2$. An object-NA ray inside the unit disk is then launched
as

$$
\boldsymbol d(\xi,\eta)=
\sqrt{1-s^2\rho^2}\,\boldsymbol c
+s\left(\xi\boldsymbol e_x+\eta\boldsymbol e_y\right).
$$

The longitudinal and transverse components make this a unit direction by
construction. Thus every radius is linear in direction sine, and $(0,1)$
makes exactly the requested angle with the chief direction even for an
off-axis chief ray.

### Object EPD at finite and infinite conjugates

Let $D_o$ be either a requested object EPD or the EPD resolved from image-space
F-number.

For a finite-conjugate exact height launch, let
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
\boldsymbol d=\mathrm{normalize}(\boldsymbol q-\boldsymbol p_c).
$$

The paraxial data locates the pupil plane, but its origin is replaced by the
real chief-ray intercept $\boldsymbol q_c$. Crucially, every EPD ray starts at
the same exact field point $\boldsymbol p_c$; changing pupil position changes
only its direction. A chief direction with effectively zero Z component cannot
reach this plane and is rejected.

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

For exact finite Object Height, Object NA uses the same fixed object point and
the chief-centred angular basis above. Image F/# first resolves its physical
object EPD and then uses the finite EPD construction. Thus Object EPD, Object
NA, and Image F/# all preserve the requested object point for every pupil ray.

## Wavelength-specific finite OPD indices

RayOptics' cached `FirstOrderData` describes the configured reference
wavelength. Its finite wave-aberration equations also read `n_obj` and `n_img`
from that object, so passing it unchanged to an F- or C-line trace would reuse
the reference-wavelength boundary indices.

Before finite OPD evaluation, the application makes a shallow copy of the
cached first-order data and replaces only those two fields:

$$
n_{\mathrm{obj}}(\lambda)
=\mathrm{first\ gap.medium.rindex}(\lambda),
\qquad
n_{\mathrm{img}}(\lambda)
=\mathrm{last\ gap.medium.rindex}(\lambda).
$$

OPD fans pass that copy to `wave_abr_full_calc`. Finite wavefront grids use a
`RayGrid` subclass that exposes the same copy through a temporary read-only
model view during build and refocus, then restores the original model on the
returned grid. This covers wavefront maps and every downstream RayGrid
consumer without mutating cached paraxial data or changing the public grid
interface. The afocal plane-wave OPD path is unchanged because it already
evaluates both boundary media directly at the traced wavelength.

## Exact finite Object Height fields

### Fixed point and direction-only solve

`ExactObjectHeightFieldSpec` reads absolute `Field.xv` and `Field.yv`, so
relative samples already include the configured maximum height. It fixes the
object-interface-local launch point at

$$
\boldsymbol p_o=[x_v,\ y_v,\ 0].
$$

Only the chief direction varies. With `z_dir` taken from the first sequential
path entry, the two numerical unknowns are tangents

$$
\boldsymbol d(t_x,t_y)=
\mathrm{normalize}([t_x,\ t_y,\ z_{\mathrm{dir}}]).
$$

Let $(c_{s,x},c_{s,y})$ be the first clear aperture's offsets at the physical
stop, or $(0,0)$ when no clear aperture exists. A candidate is traced from the
fixed object point only through the stop. Because RayOptics stores each segment
in its current interface frame, the solved residual is directly

$$
\boldsymbol r_s(t_x,t_y)=
\begin{bmatrix}
p_{s,x}(t_x,t_y)-c_{s,x}\\
p_{s,y}(t_x,t_y)-c_{s,y}
\end{bmatrix}.
$$

No global-frame approximation or paraxial entrance-pupil target appears in
this chief solve. A physically decentered or tilted stop is therefore handled
by its transformed local intercept, while an aperture offset remains a local
centre offset.

### Continuation, symmetry, and final verification

The axial object point is solved and cached first, including when it is absent
from the configured field list. Each distinct requested coordinate then
continues independently from that axial tangent along a straight coordinate
interpolation. Every continuation has at least eight subdivisions, and more
are added until the Euclidean object-height increment is at most 0.1 model
units. Intermediate numerical evaluations and continuation points trace only
through the stop.

For a centred Y-only object point with zero stop-X centre and zero starting
X tangent, an initially zero stop-X residual identifies meridional symmetry.
The solver then varies only $t_y$, restores $t_x=0$, and still verifies the
full two-component residual. General X/Y fields, aperture offsets, or broken
symmetry retain the two-dimensional solve.

Only a requested coordinate's final solved launch is traced through the
complete sequential model, with clipping disabled. That trace must begin at
the exact $\boldsymbol p_o$ and meet the local stop centre within the project
tolerance. A post-stop missed surface or total internal reflection is therefore
a specification failure even though the stop-only root converged.

Finite conjugacy is a physical part of this contract, not a numerical
limitation. At an infinite object conjugate, `Object Height` does not name a
finite point on the object interface; an angular field or an image-height
constraint is the meaningful alternative. The exact class consequently raises
a clear error rather than inventing an input-plane anchor or changing field
type.

## Exact image-height fields

### The target is a point on the image profile

`ExactImageHeightFieldSpec` reads `Field.xv` and `Field.yv`. These are absolute
field coordinates: for a relative field they already include multiplication by
the maximum field value. A sample $(x,y)$ means the image-surface-local point

$$
\boldsymbol p_i=[x,\ y,\ \mathrm{sag}(x,y)].
$$

Consequently, image height is not a request for the paraxial image plane or
for a flat $z=0$ target on a curved image surface. The profile's own sag
function supplies Z in the model's length units.

### Native-first solve and strict verification

For an infinite-conjugate model with a flat image and a centred, non-decentered
stop, each distinct configured coordinate first calls RayOptics 0.9.8's
`eval_real_image_ht`. The returned object launch and scalar real-entrance-pupil
distance are forward traced with aperture checks disabled. If both the stop
and image residuals already meet the project's `1e-9` tolerance, that native
solution is accepted without invoking the extension solver.

If a traceable native result misses the stricter project tolerance, its
forward image-segment direction seeds a reverse refinement. Trace failures
remain hard errors; they do not cause a paraxial or approximate fallback. The
native evaluator is injected only as an optional constructor dependency for
isolated tests, and the public class/schema names remain unchanged.

Finite conjugates, curved image profiles, offset or physically decentered
stops, and continuation use the extension solve through the physical stop
centre. The chief ray is known by two physical constraints: its image point
and its stop intercept. Optical reversibility recovers the otherwise unknown
object launch:

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
direction for the parallel input bundle. The caller-supplied wide-angle flag
makes RayOptics use that launch directly instead of trying to intersect a
remote object surface; Image Height no longer turns that flag on automatically.

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

For Object Height, every distinct requested coordinate continues from the
cached axial solution. There are at least eight subdivisions per coordinate,
with more added so no step exceeds 0.1 model units. Only the final requested
coordinate receives a complete verification and analysis cache; intermediate
continuation points trace through the stop and supply only the next tangent.

For image-height geometries that require the extension, the axial target is
solved and cached first even when the user did not request an axial sample.
Requested fields are sorted by radial distance $\sqrt{x^2+y^2}$. Each new
target continues from the preceding solved coordinate and tangent along a
straight interpolation. There are at least eight subdivisions, with more
added so a continuation interval is no longer than 0.1 model units. Supported
native coordinates are evaluated directly once per distinct coordinate;
continuation is entered only for an extension geometry or strict refinement.

Any missed profile or total internal reflection along that continuation is a
physical loss of the branch, not a reason to jump to a paraxial answer.

### Meridional symmetry is solved in one dimension

In a centred system, a Y-only object or image target, a stop centre with zero X
offset, and a zero sagittal starting tangent define a ray in the Y-Z
meridional plane.
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
the final F-number angle, object NA, forward Object Height point and stop
residuals, reverse image-height stop residual, and forward image-height stop
and image residuals. For a zero target residual, the effective requirement is
the $10^{-9}$ absolute tolerance.

## Apertures, vignetting, updates, and failures

Specification rays are unvignetted and unclipped. Pupil traces explicitly use
`apply_vignetting=False` and `check_apertures=False`; reverse and verification
traces also disable aperture checks. Surface intersections, refraction,
reflection, missed profiles, and total internal reflection remain active.

For opted-in models, this ordering avoids a circular dependency: an old or
undersized aperture must not prevent the ray needed to define the requested
pupil or field from being found. The exact ray defines the requested bundle
first. Vignetting can then measure clipping, and, when
`seq_model.do_apertures` is enabled, `ExactOpticalModel.update_model()`
recalculates clear apertures after resolving the exact pupil. See
[`rayoptics-aperture-findings.md`](./rayoptics-aperture-findings.md) for how
RayOptics 0.9.8 distinguishes clear apertures, edge apertures, `max_aperture`,
automatic aperture sizing, and vignetting.

Final script generation wraps vignetting in the Ronchi-envelope helper and
injects `set_vig_respecting_exact_pupil` for exact models. For wide-angle
Object NA, that helper aperture-checks each cardinal radius-one ray. A passing
boundary sets the corresponding vignetting factor to zero because radius one
already represents the complete requested NA; it never asks RayOptics to find
a larger pupil. A blocked boundary retains RayOptics' existing bisection, whose
first move is inward and whose subsequent samples remain at or below radius
one. Other pupil modes and non-opted-in models delegate unchanged to
RayOptics' native `set_vig`. This vignetting rule does not relax the general
trace rule above: arbitrary Object-NA analysis samples with $\rho>1$ remain
blocked.

Exact state is update-scoped:

- `ExactOpticalModel.update_model()` clears the resolved EPD and NA direction
  sine, then performs the normal RayOptics update. It resolves the requested
  pupil and performs the final automatic-aperture pass only when wide-angle
  mode is explicitly enabled.
- Both exact field classes clear their launch maps and analysis caches from
  `update_model()`. For an opted-in exact height field,
  `ExactOpticalSpecs.update_optical_properties()` first refreshes RayOptics'
  current first-order data with ordinary aiming disabled, then resolves every
  requested coordinate against that current data.
- Launches are cached both by field identity and by absolute $(x,y)$
  coordinate. Duplicate coordinates share a solution. Each configured field
  receives a complete `chief_ray` package, so later analysis does not repeat
  entrance-pupil aiming for the same configured chief. Exact Image Height also
  retains its compatible scalar `aim_info`; Object Height needs no scalar
  wide-angle entrance-pupil surrogate because all supported pupil launches use
  its solved point and chief direction directly. The strict forward-verification
  trace covers the complete raw path, including dummy object and image gaps,
  but its optical-path total is not copied into the cached package. The
  verified launch is retraced once with RayOptics' standard trace wrapper,
  which excludes those dummy gaps from optical-path bookkeeping just like every
  analysis ray. This keeps the reference-wavelength chief-ray OPD at zero
  without repeating aiming. An ad hoc exact field can continue from the cached
  axial solution. No cache survives the next model update.

Geometry, material, wavelength, stop, or field edits therefore take effect
when the caller invokes `update_model()`; stale exact launches are not retained
through that update.

Without wide-angle opt-in, delegation to RayOptics is the final intended
behavior. With the opt-in, launch dispatch may temporarily delegate while
`super().update_model()` builds its first-order scaffolding; the subsequent
exact resolution must succeed. Invalid values, unsupported keys, a missing
real-ray branch, missed surfaces, total internal reflection, solver failure,
or a final residual outside tolerance raises `ExactSpecError` (or its
trace/convergence subclass) and aborts the update. The opted-in path never
substitutes a paraxial launch as its final physical result.
