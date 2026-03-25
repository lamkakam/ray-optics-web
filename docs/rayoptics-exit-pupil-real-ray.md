# Exit Pupil Radius via Real Ray Tracing in RayOptics

## Summary

RayOptics has **no dedicated function** that computes exit pupil radius from real ray tracing. The package computes exit pupil size exclusively via paraxial (first-order) approximation.

## Paraxial Exit Pupil (built-in)

**File:** `rayoptics/parax/firstorder.py`

```python
fod.exp_radius = abs(fod.opt_inv / (n_k * pr_ray[-1][slp]))
```

- `fod.opt_inv` — optical invariant
- `n_k` — refractive index in image space
- `pr_ray[-1][slp]` — chief ray slope at the last interface

This is what `fod.exp_radius` returns and is a paraxial quantity. It does not account for pupil aberrations.

## Relevant Real-Ray Functions

### `transfer_to_exit_pupil(interface, ray_seg, exp_dst_parax)`

**File:** `rayoptics/raytr/waveabr.py:80`

Propagates a traced ray segment (exiting the last real interface) to the exit pupil plane.

```python
b4_pt, b4_dir = transform_after_surface(interface, ray_seg)
h = b4_pt[1]   # y-coordinate after surface transform
u = b4_dir[1]  # y-component of direction cosines

if abs(u) < 1e-14:
    exp_dst = exp_dst_parax  # fallback to paraxial distance
else:
    exp_dst = -h / u         # real-ray intercept distance

exp_pt = b4_pt + exp_dst * b4_dir
```

Returns `(exp_pt, exp_dir, exp_dst, interface, b4_pt, b4_dir)`. The `exp_pt` is the 3D point where the ray intersects the exit pupil plane — **not** a radius.

### `trace_chief_ray(opt_model, fld, wvl, foc)`

**File:** `rayoptics/raytr/trace.py:513`

Traces the chief ray and extracts its exit pupil segment via `transfer_to_exit_pupil`.

```python
cr, cr_exp_seg = trace_chief_ray(opt_model, fld, wvl, foc)
# cr_exp_seg = (exp_pt, exp_dir, exp_dst, ifc, b4_pt, b4_dir)
```

## Computing Exit Pupil Radius from Real Rays

To obtain a real-ray exit pupil radius (accounting for pupil spherical aberration), trace manually:

```python
from rayoptics.raytr.trace import trace_chief_ray, trace_ray
from rayoptics.raytr.waveabr import transfer_to_exit_pupil

# 1. Trace chief ray and marginal ray (pupil coord y=1.0) for the same field/wavelength
cr, cr_exp_seg = trace_chief_ray(opt_model, fld, wvl, foc)
# ... trace marginal ray at pupil (0, 1.0) and call transfer_to_exit_pupil on its last segment

# 2. Extract exit pupil intersection points
exp_pt_chief    = cr_exp_seg[0]   # 3D point on exit pupil plane
exp_pt_marginal = marginal_exp_seg[0]

# 3. Radial distance = real-ray exit pupil radius
exp_radius_real = abs(exp_pt_marginal[1] - exp_pt_chief[1])
```

This gives the **real-ray exit pupil radius** for a given field point, which differs from the paraxial value when pupil spherical aberration or vignetting is present (e.g., tilted systems, wide-angle systems).

## Notes

- `transfer_to_exit_pupil` is used internally by the wavefront aberration module (`waveabr.py`) to normalize pupil coordinates for OPD calculations.
- `fod.exp_dist` (paraxial exit pupil distance) is passed as the fallback `exp_dst_parax` when the ray direction is nearly zero — use the paraxial distance as the reference plane location.
- For on-axis, unaberrated systems, the real-ray and paraxial values will agree closely. Differences emerge in tilted, decentered, or wide-angle systems.
