---
name: rayoptics-tilted-decentered-opd
description: Guidance for rayoptics OPD, wavefront, ray fan, or first-surface tilted or decentered system work
---

# Rayoptics Tilted/Decentered OPD

Use this skill when implementing, debugging, or reviewing code involving
rayoptics OPD, wavefront, ray fan, Zernike, first-surface tilted or decentered systems.

## Required Context

Read `docs/rayoptics-tilted-or-decentered-first-surface-opd.md` before changing code
that builds or analyzes tilted/folded rayoptics systems with wavefront output.

The short version: in rayoptics 0.9.8, a tilted/decentered surface as the first
physical surface after the object can produce unrealistic OPD fans unless a dummy
planar air surface with no tilt or decenter is inserted immediately before it.

## Rules

- Ask to preserve or add a dummy planar air/reference surface with no tilt or decenter
  before the first tilted or decentered surface when OPD,
  wavefront, ray fan OPD, or Zernike data.
- Do not remove such a dummy surface as a harmless-looking simplification unless
  OPD/wavefront behavior has been explicitly verified without it.
- Do not treat transverse ray fan agreement as proof that OPD is valid.
  Transverse ray fans can match while OPD is wrong by hundreds of waves.
- Prefer topology-preserving fixes over compensating for the resulting OPD
  residual after the fact.

## Reference

See `docs/rayoptics-tilted-or-decentered-first-surface-opd.md` for the detailed
investigation, including the rayoptics 0.9.8 `first_surf == last_surf`
bookkeeping issue and the observed OPD fan difference of about `6.6` waves
with the dummy surface versus about `525` waves without it.
