---
name: rayoptics-tilted-mirror-opd
description: Guidance for rayoptics OPD, wavefront, ray fan, tilted mirror, folded system, dummy surface, or first-surface reflective system work
---

# Rayoptics Tilted Mirror OPD

Use this skill when implementing, debugging, or reviewing code involving
rayoptics OPD, wavefront, ray fan, Zernike, tilted mirrors, folded systems,
dummy surfaces, or first-surface reflective systems.

## Required Context

Read `docs/rayoptics-tilted-mirror-dummy-surface-opd.md` before changing code
that builds or analyzes tilted/folded rayoptics systems with wavefront output.

The short version: in rayoptics 0.9.8, a tilted powered mirror as the first
physical surface can produce unrealistic OPD fans unless a dummy planar air
surface is inserted immediately before it.

## Rules

- Preserve or add a dummy planar air/reference surface before the first
  powered, decentered, tilted, or reflective physical surface when OPD,
  wavefront, ray fan OPD, or Zernike data are required.
- Do not remove such a dummy surface as a harmless-looking simplification unless
  OPD/wavefront behavior has been explicitly verified without it.
- Do not treat transverse ray fan agreement as proof that OPD is valid.
  Transverse ray fans can match while OPD is wrong by hundreds of waves.
- Prefer topology-preserving fixes over compensating for the resulting OPD
  residual after the fact.

## Python Environment

Before running Python scripts under `src/python/`, activate the project venv:

```bash
source <project-root>/src/python/.venv/bin/activate
which pip
which pip3
which python
which python3
```

Confirm all four commands resolve inside `src/python/.venv` before running the
Python command.

## Reference

See `docs/rayoptics-tilted-mirror-dummy-surface-opd.md` for the detailed
investigation, including the rayoptics 0.9.8 `first_surf == last_surf`
bookkeeping issue and the observed OPD fan difference of about `6.6` waves
with the dummy surface versus about `525` waves without it.
