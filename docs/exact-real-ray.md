# Exact Real-Ray Optical Specifications

## Summary and workflow
`optical_specs.py` extends RayOptics so that certain **wide-angle optical specifications are enforced using real ray tracing rather than paraxial approximations**.

Its main job is to make statements such as:

* “the object-space NA is exactly 0.5,”
* “the image-space F-number is exactly F/2,”
* “this field point is exactly at object height `(x, y)`,” or
* “this chief ray must land exactly at image height `(x, y)`”

mean something **physically true for the traced optical system**, rather than merely true in first-order/paraxial optics.

It does that by numerically solving for ray launch positions/directions, tracing them through the actual surfaces, and verifying the requested geometry to roughly `1e-9` tolerance.

The functionality is deliberately opt-in: it activates only when the field-of-view object's `is_wide_angle` attribute is **exactly `True`**. Otherwise it largely delegates to normal RayOptics behaviour.

---

### The problem it is solving

Normal first-order optics can describe an optical system using quantities such as entrance pupil diameter, F/#, NA and field height.

That works well near the optical axis.

For large fields and strongly nonlinear systems, though, the paraxial interpretation can diverge from what an actual ray does.

For example, suppose you ask for image-space `F/2`.

Paraxially, RayOptics can derive a pupil diameter corresponding to F/2. But if the lens is fast or strongly aberrated, the **actual angle** between the chief ray and marginal ray at the image may not correspond precisely to F/2.

This file changes the interpretation to roughly:

> Find the physical ray bundle whose **real traced rays** satisfy F/2.

The same philosophy is applied to NA and exact field heights.

---

### The main pieces

There are four especially important components:

| Component                    | Purpose                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `ExactOpticalModel`          | Controls when the exact calculations happen and resolves physical pupil specifications.       |
| `ExactOpticalSpecs`          | Converts normalized pupil coordinates into physically correct ray launches.                   |
| `ExactObjectHeightFieldSpec` | Keeps an exact finite object point fixed and solves the chief-ray direction through the stop. |
| `ExactImageHeightFieldSpec`  | Solves a chief ray that goes through the stop and lands at an exact image-surface location.   |

There is also custom vignetting logic in `set_vig_respecting_exact_pupil()` and a collection of numerical/trace-validation helpers.

---

### 1. `ExactOpticalModel`

This is the top-level extension of RayOptics' `OpticalModel`.

It maintains two important resolved quantities:

```python
self._resolved_object_epd
self._resolved_object_na_direction_sine
```

These are distinct from the user's requested optical-spec values.

That separation is important: the original requested `("image", "f/#")`, for example, remains available to RayOptics for first-order reporting, while this module independently calculates the **physical object-side beam required to produce it**.

Its `update_model()` flow is essentially:

```text
clear previous exact pupil solution
        ↓
run normal RayOptics update_model()
        ↓
is exact/wide-angle mode enabled?
        ↓ yes
resolve requested pupil using real rays
        ↓
recalculate clear apertures if needed
```

---

#### Resolving image-space F/#

For:

```python
pupil.key == ("image", "f/#")
```

the code converts the requested F-number into a target marginal-ray angle:

$$
\theta_{\rm target}
=
\tan^{-1}\left(\frac{1}{2F/\#}\right)
$$

It then varies the **object-space entrance pupil diameter** until the actual traced image-space angle matches that target.

Conceptually:

```text
requested F/#
    ↓
target real image-space angle
    ↓
try an object-space pupil diameter
    ↓
trace axial chief ray
trace +Y marginal ray
    ↓
measure angle between them at image
    ↓
adjust pupil diameter
    ↓
repeat until angle is correct
```

The search has two phases.

First it gradually increases EPD until it brackets the required solution.

Then it uses SciPy's Brent root solver:

```python
root_scalar(..., method="brentq")
```

with very tight numerical tolerances.

So the resulting:

```python
_resolved_object_epd
```

is the **physical object-space pupil diameter that actually produces the requested image F/#**.

---

### 2. Exact Object NA

For:

```python
("object", "NA")
```

the relationship used is the normal physical one:

$$
NA = n\sin\theta
$$

Therefore the code calculates:

$$
\sin\theta = \frac{NA}{n}
$$

That value is stored as:

```python
_resolved_object_na_direction_sine
```

where `n` is the refractive index in object space at the **reference wavelength**.

It then traces both the axial chief ray and a unit-radius marginal ray and independently checks that:

```python
actual_na = object_index * math.sin(actual_angle)
```

matches the requested NA.

So this isn't merely calculating `NA/n` and trusting it; it verifies that the actual generated ray geometry has that NA.

---

### 3. `ExactOpticalSpecs`: turning pupil coordinates into real rays

Once the pupil has been physically resolved, `ExactOpticalSpecs.ray_start_from_osp()` changes how RayOptics constructs rays.

For ordinary operation it delegates to RayOptics.

For exact wide-angle operation it has special handling for:

```python
("object", "NA")
("image", "f/#")
("object", "epd")
```

---

#### Exact Object NA pupil

For Object NA, the user normally supplies a normalized pupil coordinate such as:

```text
(0, 0)      chief ray
(0, 1)      +Y edge
(1, 0)      +X edge
(0.5, 0.5)  intermediate pupil sample
```

This implementation interprets that normalized pupil as a **unit disk in direction-sine space**.

It builds two axes perpendicular to the chief ray:

```text
               Ylocal
                 ↑
                 |
        pupil    •----→ Xlocal
                 |
                 |
              chief-ray direction
```

and constructs the new ray direction as:

$$
\mathbf d =
\sqrt{1-s^2r^2}\,\mathbf d_{\rm chief}
+
s(p_x\mathbf x+p_y\mathbf y)
$$

where:

* \(s = NA/n\),
* \(r^2=p_x^2+p_y^2\),
* `p_x`, `p_y` are normalized pupil coordinates.

This has a useful consequence: **equal normalized pupil radii correspond to equal fractions of the physical NA**.

Coordinates outside the unit pupil disk are rejected with `TraceRayBlockedError`, rather than silently extending the pupil.

---

### 4. Exact Object Height

`ExactObjectHeightFieldSpec` handles specifications like:

```python
("object", "height")
```

for a finite object conjugate.

Its fundamental constraint is:

> Do not move the requested object point. Change only the launch direction so the chief ray passes through the physical stop centre.

Suppose the requested object point is:

$$
(x_o,y_o,0)
$$

The solver parameterizes the direction approximately as:

```python
normalize([tx, ty, z_direction])
```

and adjusts `tx` and `ty`.

Each trial ray is traced only as far as the stop.

The residual supplied to SciPy is:

$$
\begin{bmatrix}
x_{\rm ray,stop}-x_{\rm stop}\\
y_{\rm ray,stop}-y_{\rm stop}
\end{bmatrix}
$$

The numerical solver minimizes that residual until the ray crosses the stop centre.

---

#### Why it uses continuation

Jumping directly from the axial field to a very large object height can give a nonlinear solver a terrible starting point.

So it uses **continuation**.

Instead of solving:

```text
height 0 ───────────────────────→ height 20
```

it does roughly:

```text
0 → 0.1 → 0.2 → 0.3 → ... → 20
```

using the previous ray direction as the next initial guess.

The configured maximum height step is:

```python
_MAX_HEIGHT_CONTINUATION_STEP = 0.1
```

and it always uses at least eight continuation subdivisions.

This makes difficult wide-field chief-ray solves much more robust.

---

#### Special meridional handling

There is a useful numerical detail here.

For a centred optical system and a Y-only field point, the correct chief ray should remain in the Y-Z plane:

```text
x = 0
```

Trying to solve both X and Y can produce a singular numerical Jacobian because the X residual is identically zero.

The code detects that situation and reduces the solve to **one variable** instead of two.

That's what the comments about a “centred meridional” solve mean.

---

#### Verification

After solving using the partial path to the stop, it does not simply trust the numerical result.

It traces the ray through the **entire optical system** and checks that:

1. the requested object point stayed unchanged; and
2. the ray crossed the stop centre.

Only then is the chief ray cached.

---

### 5. Exact Image Height

`ExactImageHeightFieldSpec` solves the complementary problem.

Here the requirement is:

> The ray must pass through the physical stop centre **and terminate at this exact local point on the image surface**.

The implementation is more complicated because the easiest way to impose an exact image point is often to trace **backwards**.

Conceptually:

```text
requested image point
        ↓
launch reverse ray from image
        ↓
adjust its direction
        ↓
make reverse ray pass through stop centre
        ↓
recover equivalent forward object launch
        ↓
trace forward again
        ↓
verify both stop and image point
```

---

#### Curved image surfaces

An “image height” `(x, y)` does not necessarily mean:

```python
[x, y, 0]
```

because the image surface may be curved.

So `_image_surface_point()` evaluates the image surface's sag:

```python
sag = image_interface.profile.sag(x, y)
```

and targets:

```python
[x, y, sag]
```

instead.

That is an important reason why solving actual geometry rather than assuming a flat paraxial image plane matters.

---

### 6. Native RayOptics shortcut

The image-height implementation doesn't reinvent everything.

For a relatively simple geometry:

* infinite object conjugate,
* flat image surface,
* centred stop,
* no stop decenter,

it first calls RayOptics' existing:

```python
eval_real_image_ht()
```

But it then **strictly verifies** that result.

If the native solution really does hit both the physical stop centre and requested image coordinate to the required tolerance, it keeps it.

Otherwise, it falls back to this module's more general reverse-ray numerical solve.

So the strategy is:

```text
Use RayOptics' fast/native solution when valid
              ↓
         verify it
        ↙          ↘
    valid          not exact
      ↓                ↓
   cache it      refine numerically
```

---

### 7. Caching

Both exact field implementations maintain caches indexed by the **absolute field coordinate**.

For example, Object Height stores:

```python
_coordinate_launches
_coordinate_tangents
_coordinate_chief_rays
```

while Image Height additionally stores:

```python
_coordinate_aim_info
```

This serves two purposes.

First, expensive nonlinear ray solves don't need to be repeated.

Second, RayOptics analysis routines sometimes create copies of `Field` objects whose normal aiming cache has been cleared.

`_prepare_analysis_field()` detects this and restores an appropriate exact solution before RayOptics can revert to its normal wide-angle entrance-pupil aiming logic.

---

### 8. Why chief rays are traced twice

A subtle part is `_cache_verified_chief_ray()`.

For verification, the module uses:

```python
raytrace.trace_raw(...)
```

because it wants to inspect the complete physical ray path precisely.

But RayOptics' normal optical-path-difference calculations have their own convention for dummy object/image gaps.

Therefore, once a geometry has been verified, the code retraces **the same already-solved launch** through RayOptics' standard tracing wrapper before putting it into the analysis cache.

The distinction is:

```text
trace_raw()
    → used to prove geometry is correct

raytrace.trace()
    → used to create RayOptics-compatible OPD cache
```

It is **not** re-solving the chief ray during the second trace.

---

### 9. Vignetting

`set_vig_respecting_exact_pupil()` fixes another subtle issue specific to exact Object NA.

For exact NA, normalized pupil radius `1` means:

> this is the actual requested physical edge of the angular cone.

Therefore RayOptics must not search **outside** that radius looking for some larger physical aperture.

The code tests the four cardinal edge rays first:

```text
        +Y
         •
         |
-X •-----+-----• +X
         |
         •
        -Y
```

If an edge ray passes through the actual apertures, its vignetting is exactly zero.

If it is blocked, RayOptics' existing bisection algorithm searches **inward** to find the surviving pupil boundary.

For other pupil modes it simply calls normal RayOptics `set_vig()`.

---

### 10. Apertures are intentionally ignored during specification solving

During the numerical solves, most ray traces use:

```python
check_apertures=False
```

This is intentional.

The question during specification resolution is:

> Does the mathematical optical system admit the required ray?

rather than:

> Does some mechanical aperture happen to clip it?

Physical clipping is handled later by vignetting.

It therefore separates two concepts cleanly:

```text
exact specification solving
    = determine required geometrical ray

vignetting
    = determine whether apertures physically pass that ray
```

---

### 11. Error handling is deliberately strict

There is no “try exact, then silently fall back to paraxial” behaviour once exact mode is requested.

The file defines:

```python
ExactSpecError
ExactSpecTraceError
ExactSpecConvergenceError
```

Failures such as:

* total internal reflection,
* missing a surface,
* impossible target geometry,
* numerical non-convergence,
* invalid F/#,
* impossible NA,

become explicit exact-spec errors.

That is a good property for this kind of functionality because silently reverting to an approximate ray would mean the program was claiming to satisfy a physical constraint that it actually did not.

---

### 12. Numerical accuracy

The final physical tests use:

```python
EXACT_SPEC_RELATIVE_TOLERANCE = 1e-9
EXACT_SPEC_ABSOLUTE_TOLERANCE = 1e-9
```

while the internal nonlinear solvers use tighter `1e-12`-scale convergence settings.

That distinction makes sense:

```text
solver tolerance   ≈ 1e-12
       ↓
final physical acceptance ≈ 1e-9
```

The solver is pushed tighter than the actual contract being verified.

---

### The overall architecture

The entire module can be thought of as this pipeline:

```text
                User optical specification
                         │
          ┌──────────────┴──────────────┐
          │                             │
       Field spec                    Pupil spec
          │                             │
  Object / Image Height        Object NA / Image F/#
          │                             │
          ↓                             ↓
solve exact chief ray       solve exact pupil geometry
through physical stop       using traced marginal rays
          │                             │
          └──────────────┬──────────────┘
                         ↓
                  verified launch
                         ↓
                full real-ray trace
                         ↓
           strict 1e-9 geometry check
                         ↓
           RayOptics-compatible cache
                         ↓
              normal analysis code
```

So it isn't a replacement ray tracer.

**It is an exact-specification and aiming layer around RayOptics' existing ray tracer.**

---

### In one sentence

`optical_specs.py` makes wide-angle RayOptics specifications **physically enforceable constraints**: it numerically finds the real chief/marginal rays that satisfy the requested field, stop, NA or F/# geometry, verifies them, and then feeds those verified rays back into the normal RayOptics analysis system.

If you're modifying this code, the most useful next step would be to trace one concrete example—say **Image F/# = 2**—through:

```text
update_model()
    ↓
_resolve_image_f_number()
    ↓
ray_start_from_osp()
    ↓
trace_base()
```

because that shows how the classes cooperate end-to-end.

---

## Technical reference

The preceding section introduces the motivation and end-to-end workflow. This
reference documents the precise current behavior of
[`optical_specs.py`](../src/python/src/rayoptics_web_utils/optical_specs.py)
against the project's pinned
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

### Coordinates and ray names

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

### Opted-in exact specifications

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

### Pupil constraints

#### Image-space geometric F-number

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

#### Object-space numerical aperture

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

#### Chief-centred launch axes

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

#### Object EPD at finite and infinite conjugates

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

### Wavelength-specific finite OPD indices

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

### Exact finite Object Height fields

#### Fixed point and direction-only solve

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

#### Continuation, symmetry, and final verification

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

### Exact image-height fields

#### The target is a point on the image profile

`ExactImageHeightFieldSpec` reads `Field.xv` and `Field.yv`. These are absolute
field coordinates: for a relative field they already include multiplication by
the maximum field value. A sample $(x,y)$ means the image-surface-local point

$$
\boldsymbol p_i=[x,\ y,\ \mathrm{sag}(x,y)].
$$

Consequently, image height is not a request for the paraxial image plane or
for a flat $z=0$ target on a curved image surface. The profile's own sag
function supplies Z in the model's length units.

#### Native-first solve and strict verification

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

### Numerical design choices

#### Continuation stays on a reachable real-ray branch

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

#### Meridional symmetry is solved in one dimension

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

#### Solver convergence is not physical acceptance

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

### Apertures, vignetting, updates, and failures

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
  axial solution. Afocal exit-pupil analysis deliberately updates shallow
  field copies after perturbing their coordinates, clearing inherited
  `aim_info`, `chief_ray`, and `ref_sphere` values. Before generic RayOptics
  pupil setup, the afocal chief-ray helper detects the internal preparation
  capability on `ExactOpticalSpecs`; that hook resolves the perturbed coordinate
  through the configured exact height field and attaches its newly verified
  chief-ray cache. Plain `OpticalSpecs` and exact models using ordinary field
  specifications retain native aiming. No cache survives the next model update.

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
