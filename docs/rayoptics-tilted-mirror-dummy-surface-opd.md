# Rayoptics Tilted Mirror Dummy Surface OPD Behavior

This note records a rayoptics 0.9.8 behavior observed while investigating
tilted and folded mirror systems on branch `fix/example-tilted-systems`.

## Reproduction Context

- Project branch: `fix/example-tilted-systems`
- Python environment: project venv under `src/python/.venv`
- rayoptics version: `0.9.8`
- System comparison: physically equivalent tilted powered mirror systems, one
  with a dummy planar air surface before the mirror and one without it

The dummy-surface version inserts a planar air/reference surface immediately
before the first physical mirror, for example:

```python
sm.add_surface([0, 0, "air"], sd=125)
```

The no-dummy version removes that reference surface so the tilted powered
mirror is the first physical surface in the sequential model.

## Observed Behavior

The two systems are physically equivalent for transverse ray tracing:

- Transverse ray fans match.
- The ray intersections and geometric fan behavior are consistent.

The OPD fan is not equivalent:

| System topology | Tangential OPD fan scale |
|-----------------|--------------------------|
| Dummy planar air surface before mirror | about `6.6` waves |
| Tilted powered mirror as first physical surface | about `525` waves |

The roughly `525` wave result is not a physically meaningful wavefront
difference for the equivalent system. It is a rayoptics OPD bookkeeping
artifact caused by the sequence topology.

## Root Cause

rayoptics OPD bookkeeping is sensitive to the sequential model topology used
for the first traced surface.

In rayoptics 0.9.8, `raytrace.trace()` defaults to:

```python
first_surf = 1
```

For a model where the only relevant physical surface is also the first traced
mirror, `first_surf == last_surf`. In that topology, the traced optical path
term `ray_op` is not accumulated in the way expected by the wave aberration
calculation.

`waveabr.wave_abr_full_calc_finite_pup()` still uses `ray[1]` as the
object-side equally inclined chord (EIC) reference. With no dummy reference
surface before the tilted powered mirror, that object-side EIC reference and
the missing `ray_op` accumulation leave a large residual OPD.

The result is a large OPD fan even though the transverse ray fan remains
apparently correct.

## Practical Guidance

When OPD, wavefront, ray fan OPD, Zernike, or other wave-aberration data are
required for a system whose first physical surface is powered, tilted,
decentered, or reflective, insert a dummy planar air/reference surface
immediately before that surface.

This is especially important for:

- Tilted powered mirrors
- Folded mirror systems
- First-surface reflective systems
- Decentered first physical surfaces
- Any topology where the first traced surface can also be the final or only
  OPD-relevant surface

Do not treat agreement in transverse ray fans as proof that OPD or wavefront
data are valid. Transverse ray tracing can match while OPD bookkeeping is still
wrong for the sequence topology.

## Implementation Implication

Code that builds rayoptics prescriptions for tilted or folded systems should
preserve an existing dummy planar air surface before the first powered,
decentered, tilted, or reflective surface when wavefront output is used.

If such a system does not have a dummy reference surface and OPD data are
required, add one explicitly rather than simplifying it away as an apparently
redundant zero-power air gap.
