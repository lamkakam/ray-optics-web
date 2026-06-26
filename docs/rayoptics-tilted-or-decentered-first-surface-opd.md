# Rayoptics Tilted or Decentered First Surface OPD Behavior

This note records a rayoptics 0.9.8 behavior observed while investigating
optical systems with the first surface after the object tilted or decentered.

## Reproduction Context

- rayoptics version: `0.9.8`
- System comparison: physically equivalent tilted systems, one
  without a dummy planar air surface with no tilt or decenter before the titled mirror and one with it


### Scripts for an optical system with the first surface tilted
In this example, the tilted surface (mirroe) is the first physical surface in the sequential model:

```python
### common config
opm = OpticalModel()
sm  = opm['seq_model']
osp = opm['optical_spec']
pm  = opm['parax_model']

opm.system_spec.dimensions = 'mm'

osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=250)
osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=0.5, flds=[0,1], is_relative=True)
osp['wvls'] = WvlSpec([(546.073, 1)], ref_wl=0)

opm.radius_mode = True
sm.do_apertures = False
### end of common config


sm.gaps[0].thi=10000000000
sm.gaps[0].medium = decode_medium("air")

### first surface is tilted
sm.add_surface([-2000, -1000, "REFL"], sd=125)
sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=-2000, cc=-1)
sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=0.13, beta=0, gamma=0, x=0, y=0)
###

sm.ifcs[-1].profile.r = 0

opm.update_model()
set_vig(opm)

```

### Scripts for the same system but with a dummy air surface added before tilted surface
The dummy-surface version inserts a planar air/reference surface immediately
before the first physical surface (mirror in this example):

```python
sm.gaps[0].thi=10000000000
sm.gaps[0].medium = decode_medium("air")

### dummy surface added before the tilted surface
sm.add_surface([0, 0, "air"], sd=125)
###

### tilted surface
sm.add_surface([-2000, -1000, "REFL"], sd=125)
sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=-2000, cc=-1)
sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=0.13, beta=0, gamma=0, x=0, y=0)
###

sm.ifcs[-1].profile.r = 0

opm.update_model()
set_vig(opm)

```

## Observed Behavior

The two systems are physically equivalent for transverse ray tracing:

- Transverse ray fans match.
- The ray intersections and geometric fan behavior are consistent.

Nevertheless, the OPD fan is not equivalent:

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

- Tilted surfaces
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
preserve an existing dummy planar air surface before the first decentered or
tilted surface when wavefront output is used.

If such a system does not have a dummy reference surface and OPD data are
required, add one explicitly rather than simplifying it away as an apparently
redundant zero-power air gap.
