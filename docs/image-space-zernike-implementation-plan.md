# Image-space Zernike implementation plan

## Status and intended outcome

Implemented on the image-space Zernike feature branch. This document remains the
physical contract and acceptance record for the implementation.

Implement a physically explicit, numerically convergent image-space wavefront
Zernike analysis for finite imaging systems. Support the existing chief-ray and
centroid reference choices without requiring minimum-RMS wavefront optimization
on the image surface. Remain entirely client-side and compatible with Pyodide.

The expansion must specify its reference sphere, projected pupil coordinates,
normalization disk, sampling measure, and coefficient convention. It need not
reproduce OSLO coefficients. OSLO comparison is supporting evidence only when
prescription, aperture, wavelength, reference, coordinates, and term set match.

## Scope and constraints

- Preserve the polynomial evaluator and wavelength conversion where validated.
- Replace the interpretation of RayOptics intermediate EIC `p_coord` values as
  final pupil coordinates.
- Introduce projected-pupil area weights and independently calculated metrics.
- Keep public `chief_ray` and `centroid` choices. Do not silently change shared
  centroid semantics for wavefront maps, PSF, MTF, fans, or optimization.
- Retain afocal behavior as a separate documented path. Do not apply finite
  sphere geometry to afocal systems or claim to validate their physics here.
- Do not change prescriptions or focus to obtain agreement with OSLO.
- Do not introduce minimum-RMS fitting, automatic tilt/defocus removal, new
  dependencies, or a general diffraction-engine rewrite as part of this task.
- Do not edit installed RayOptics or generated source files directly.

## Required preparation

1. Read the applicable `AGENTS.md` files and inspect the working tree. Work on a
   feature branch and preserve unrelated changes.
2. Read the optics-conventions, rayoptics-headless-python,
   rayoptics-tilted-decentered-opd, and commands-for-development skills. Read
   frontend-coding-standard if TypeScript changes are needed. Before any Next.js
   code changes, read the relevant installed Next.js guides required by AGENTS.md.
3. Before inspecting or executing Python work, activate and verify the venv:

   ```bash
   source /home/kakamlam/ray-optics-web/src/python/.venv/bin/activate
   which pip
   which pip3
   which python
   which python3
   ```

4. Read embedded specifications and implementation in:
   - `src/python/src/rayoptics_web_utils/zernike/zernike.py`
   - `src/python/src/rayoptics_web_utils/raygrid/raygrid.py`
   - `src/python/src/rayoptics_web_utils/raygrid/opd_reference.py`
   - `src/python/src/rayoptics_web_utils/_finite_opd.py`
   - Relevant afocal helpers, Zernike tests, shared model fixtures, and consumers.
   - `src/features/lens-editor/lib/zernikeData.ts` and corresponding payload types.
   - Installed RayOptics `raytr/waveabr.py`, `raytr/analyses.py`, ray tracing,
     pupil/reference setup, and coordinate transform implementations.
5. Read `docs/image-reference-conventions.md` and
   `docs/rayoptics-tilted-or-decentered-first-surface-opd.md`. Preserve existing
   dummy reference surfaces in tilted/folded fixtures. Never compensate for
   upstream invalid OPD by manipulating a Zernike fit.
6. Initialize the headless environment before GUI-transitive RayOptics imports.
   Use the project's venv for every Python command.

## Optical contract to establish first

### Reference point and sphere

Use the actual reference geometry selected by the shared wavefront builder.
Chief-ray mode centers the sphere at the chief-ray image intersection.

The existing centroid wavefront mode starts at the geometric centroid and then
solves for zero fitted phase slopes in input-pupil coordinates. Preserve this
behavior in the initial implementation, and describe it accurately; do not call
it an exact minimum-variance solve or a purely geometric centroid. A future
change to a strictly geometric centroid would require an explicit, separate
shared-reference migration. Neither convention invalidates Zernike analysis.

Let `Q` be the chosen sphere center, `P` the chief-ray pupil reference point,
and `R = norm(Q - P)`. Transform all points and outgoing directions into one
Cartesian coordinate frame before constructing this geometry. Do not assume
adding the last gap thickness handles general tilted/folded image transforms.

Initially reuse RayOptics' pupil reference point when its geometry is valid, and
record that convention. It is not automatically OSLO's differential real exit
pupil. Reject invalid radii or unsupported geometry explicitly.

### Coordinates on the reference sphere

Intersect each outgoing ray (or its appropriate extension) with the actual
reference sphere. Select the pupil-side intersection continuously connected to
`P` for the chief ray. Handle real and virtual geometry through a documented
branch rule; do not choose roots by an unexplained sign or smallest distance.

Define `ez = (Q - P) / R`. Construct transverse orthonormal axes `ex`, `ey` from
the model's transformed reference axes, with a deterministic fallback when the
preferred axis is nearly parallel to `ez`. Document handedness and angular sign.

For sphere intersection `S`, define:

```text
x = dot(S - P, ex)
y = dot(S - P, ey)
u = x / a
v = y / a
rho = sqrt(u*u + v*v)
theta = atan2(v, u)
```

This is orthographic projection of the pupil-side reference-sphere cap. `x/R`
and `y/R` are transverse components of its radial unit vector, not generally the
aberrated ray's direction cosines. The fitting measure is projected area
`dx dy`, not sphere surface area or solid angle.

Verify that the OPD supplied by Hopkins calculation refers to this same sphere,
including branch and sign conventions. Derive the connection from the installed
implementation. Do not obtain sphere intersections by guessing a correction to
`p_coord`. Validate OPD against independent analytic optical-path examples before
trusting fitted coefficients.

Only support a single-valued projected pupil mapping. Detect folds, overlapping
branches, and projection singularities; report unsupported geometry rather than
silently averaging different wavefront branches.

### Normalization aperture

Resolve the transmitted footprint boundary separately from the fitting grid,
using adaptive ray tracing and explicit geometric tolerances. Account for
aperture clipping, holes, and failed traces; do not infer every boundary from
the nominal stop edge alone or assume all footprints are star-shaped.

Use a chief-ray-centered enclosing reference circle as the documented automatic
normalization convention. Refine the boundary estimate until its maximum
projected radius converges, then freeze radius `a` while refining the fit.
Recompute it when the optical model, wavelength, field, or reference changes.
Keep any numerical enclosure margin explicit and below the geometric tolerance.

Preserve clipped or noncircular support inside that disk. Do not stretch an
ellipse to a circle or invent OPD values outside the transmitted footprint.
The coefficients on partial support are least-squares coefficients on that
support, not independent full-disk orthogonal aberration contributions.

## Implementation sequence: tests before behavior changes

For each stage, write a behavioral test, observe failure for the intended reason,
then implement and run focused checks. Do not replace independent physical
oracles with snapshots of the new implementation.

### Stage 1: reference-sphere geometry

- Add a narrowly scoped internal geometry helper with explicit frame and unit
  contracts; choose its final location after inspecting shared consumers.
- Validate ray-sphere intersection, pupil-side root continuity, chief-ray origin,
  axis orientation, virtual extensions, and rigid coordinate transformations.
- Include a non-axis-aligned sphere and a folded/tilted fixture with valid OPD
  topology. Require reconstructed points to satisfy the sphere equation.
- Use an ideal converging spherical wavefront to check zero non-piston OPD.
- Keep geometry failures distinguishable from aperture-blocked samples.

### Stage 2: footprint, area weights, and convergence

- Retain forward tracing initially. Map connected input-pupil cells into the
  projected pupil and integrate their mapped area using a consistent
  triangulation/quadrature scheme.
- Refine cells near the transmission boundary and wherever mapping curvature
  makes an area estimate inaccurate. Trace additional points as needed; do not
  triangulate across blocked regions, holes, or disconnected components.
- Detect mapping reversals/singularities before taking absolute areas, which
  would otherwise conceal folds. Merge duplicate sample contributions safely.
- Store coordinates, OPD, positive area weights, validity/support, and reference
  metadata together so downstream masks cannot diverge.
- Validate weights against analytic circular/elliptical mappings and clipped
  support. Verify boundary radius, area, coefficients, and RMS converge
  independently as sampling increases.
- Iterative aiming onto a regular projected-pupil grid is an optional future
  optimization, not a prerequisite or a second mandatory implementation.

### Stage 3: weighted fitting and metrics

- Extend the fitting contract to accept weights. Solve
  `lstsq(sqrt(A) * Z, sqrt(A) * W)` using QR/SVD, not normal equations.
- Validate term parity/order, finite coordinates/OPD, positive finite weights,
  sufficient samples, rank, and numerical conditioning. Locate piston by `(0,0)`
  rather than assuming the first caller-supplied term is piston.
- Recover synthetic mixtures of known modes using nonuniform samples and valid
  projected-area quadrature. Test clipped support without asserting full-disk
  orthogonality there.
- Calculate weighted mean, standard deviation, PV, and fit residual directly
  from the same accepted samples. RMS is `sqrt(mean_A((W - mean_A(W))**2))`;
  never substitute a fitted piston coefficient for the sampled mean.
- Keep normalization conversion `c / sqrt((2-delta(m,0))*(n+1))`. Describe it as
  unit-disk RMS normalization; do not claim coefficient RSS equals measured RMS
  on partial/nonuniform support or when truncation residual is significant.
- Require metrics independent of the requested Zernike term list, except fit
  residual and coefficient-derived quantities themselves.

### Stage 4: integrate without reference drift

- Replace finite `_extract_exit_pupil_grid` behavior through the new sample
  contract. Preserve wavelength-correct OPD indices and conversion to waves.
- Ensure OPD, coordinates, and boundary all use the final chosen reference
  sphere, including the shared centroid mode's final reference.
- Preserve existing response fields where their meaning remains valid; add
  reference radius/frame, sampling measure, support coverage, fit residual,
  and conditioning metadata as appropriate. Avoid large per-ray payloads.
- Audit TypeScript types, worker transport, UI wording, and optimization callers
  for changed RMS semantics or assumptions. Update only affected behavior.
- Keep afocal routing covered by regression tests without reinterpreting its
  existing pupil geometry as a finite reference sphere.
- Audit `strehl_ratio`: a simple phase mean is a reference-point intensity
  estimate under explicit amplitude assumptions, not necessarily peak Strehl.
  Do not silently change a shared Strehl helper or equate geometric area weights
  with optical amplitude weights. If a validated diffraction consumer cannot
  supply it, document the existing approximation and its scope separately.
- Preserve generic Fringe ordering. The screenshot's special final radial term
  `(12,0)` differs from the current generic 37th term `(6,6)`. Use an explicit
  OSLO term list for diagnostics; adding an OSLO ordering option is out of scope.

### Stage 5: optical regression and documentation

- Exercise Sasian Triplet at d-line on axis and at 20 degrees, using both
  references and at least three sampling resolutions with fixed normalization.
- Add a valid tilted/decentered system, a clipped pupil, and a wavelength/unit
  conversion case. Reuse existing suitable fixtures and preserve dummy surfaces.
- Verify rotation covariance of sine/cosine pairs and invariance of physical
  RMS. Verify translations do not introduce artificial phase terms.
- Define numerical tolerances from analytic errors and convergence evidence;
  do not choose tolerances to preserve previous incidental coefficients.
- Replace existing magnitude expectations tied to EIC coordinates only after
  independent geometry/OPD tests justify the new contract.
- Update embedded documentation at changed declarations and relevant shared
  reference documentation. Update sidecars only for applicable JS/shell or
  generated contracts, following AGENTS.md.

## Baseline evidence and comparison limits

The preceding read-only investigation used installed RayOptics 0.9.8 and the
`sasian_triplet_autoaperture` fixture at 587.562 nm and full field. The old
sample-maximum normalization radius changed from about 6.509738 mm at 32 samples
per axis to 6.626942 mm at 64 and 6.638557 mm at 128. These are evidence of grid
dependence, not desired values for the new geometry.

At 64 samples per axis with the current generic Fringe list, old reported RMS
was about 1.041929 waves, versus sample standard deviation 1.040306 waves.
This demonstrates the fitted-piston issue; neither number is a target for the
new projected-area measure.

The supplied OSLO screenshot reports minimum-RMS reference geometry and a
special 37-term list. It cannot establish an exact regression oracle without
the complete OSLO prescription and analysis settings. Nonzero differences in
tilt, piston, or other coefficients are not by themselves evidence of a bug.

## Verification and acceptance

Run focused Python tests throughout, then the required project checks:

```bash
bash scripts/run-python-tests.sh
npm run type-check
npm run lint
npm run test
npm run build
git diff --check
```

Run relevant browser tests when UI or worker integration behavior changes.
Preserve headless collection checks; do not install GUI dependencies to make
imports succeed. No application checks are required merely to save this plan.

Accept the implementation only when:

- Coordinates correspond to explicitly constructed reference-sphere points.
- OPD and pupil geometry share the same reference, frame, wavelength, and units.
- Radius and area weights converge independently of the polynomial fit.
- Synthetic and optical checks validate weighted fitting and direct RMS.
- Partial support and unsupported geometry produce honest metadata/errors.
- Chief-ray/centroid behavior and afocal compatibility remain documented.
- Required checks pass, and browser/Pyodide performance remains practical.

Report any unresolved physical limitation explicitly. Do not advertise exact
OSLO equivalence or minimum-RMS behavior. Follow repository commit/PR rules if
publication is requested; never push to main.

## Optical references

- [OSLO Optics Reference, image-space sampling and wavefront analysis](https://lambdares.com/hubfs/Support/support/OSLOOpticsReference_Sep21.pdf#page=179)
- [Wyant and Creath, Basic Wavefront Aberration Theory for Optical Metrology](https://wp.optics.arizona.edu/jcwyant/wp-content/uploads/sites/13/2016/08/Zernikes.pdf)
- Installed RayOptics wavefront source and its cited Hopkins equally inclined
  chord reference; inspect the installed implementation before relying on its
  internal tuple layout or coordinate conventions.
