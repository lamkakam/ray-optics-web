# `python/src/rayoptics_web_utils/focusing.py`

## Purpose

Provides four public functions to find the optimal image distance (`sm.gaps[-1].thi`) by
minimizing an image-quality metric. All four mutate `opm` in place.

## Public API

```python
focus_by_mono_rms_spot(opm, field_indices=None, num_rays=21, bounds=(-5.0, 5.0))
focus_by_mono_strehl(opm, field_indices=None, num_rays=21, bounds=(-5.0, 5.0))
focus_by_poly_rms_spot(opm, field_indices=None, num_rays=21, bounds=(-5.0, 5.0))
focus_by_poly_strehl(opm, field_indices=None, num_rays=21, bounds=(-5.0, 5.0))
```

All return `{'delta_thi': float, 'metric_value': float}`:
- `delta_thi`: focus shift applied to `sm.gaps[-1].thi` (mm).
- `metric_value`: optimized metric — RMS spot radius (mm > 0) or Strehl ratio (∈ [0, 1]).

### Arguments

| Parameter | Type | Default | Description |
|---|---|---|---|
| `opm` | `OpticalModel` | — | Mutated in place |
| `field_indices` | `list[int] \| None` | `None` | Field indices; `None` = all fields |
| `num_rays` | `int` | `21` | RayGrid / trace_grid resolution |
| `bounds` | `tuple[float, float]` | `(-5.0, 5.0)` | Search range for `delta_thi` (mm) relative to current gap |

## Algorithm

All four use `scipy.optimize.minimize_scalar(method='bounded')`.

```python
sm = opm['seq_model']
thi_0 = sm.gaps[-1].thi

def objective(delta):
    sm.gaps[-1].thi = thi_0 + delta
    opm.update_model()
    return <metric or -metric>

result = minimize_scalar(objective, bounds=bounds, method='bounded')
sm.gaps[-1].thi = thi_0 + result.x
opm.update_model()
return {'delta_thi': result.x, 'metric_value': <final metric>}
```

## Strehl optimization note

The exact Strehl formula `|mean(exp(i·2π·W))|²` produces a sinc-squared landscape
with secondary maxima vs defocus — `minimize_scalar` (Brent's method) gets trapped.
The Strehl-based functions therefore:
- **Optimize** using RMS wavefront error `std(OPD_grid)` (smooth, unimodal)
- **Report** the true Strehl `|mean(exp(i·2π·W))|²` at the optimized position

## Private helpers

| Function | Returns | Used by |
|---|---|---|
| `_resolve_field_indices(opm, field_indices)` | `list[int]` | all 4 |
| `_spot_fn(p, wi, ray_pkg, fld, wvl, foc)` | `ndarray \| None` | RMS spot helpers |
| `_compute_mono_rms_spot(opm, fi_list, num_rays)` | `float` (mm) | `focus_by_mono_rms_spot` |
| `_compute_poly_rms_spot(opm, fi_list, num_rays)` | `float` (mm) | `focus_by_poly_rms_spot` |
| `_opd_wfe(opd_grid)` | `float` (waves, std) | WFE helpers |
| `_compute_mono_wfe(opm, fi_list, num_rays)` | `float` (waves) | `focus_by_mono_strehl` objective |
| `_compute_poly_wfe(opm, fi_list, num_rays)` | `float` (waves) | `focus_by_poly_strehl` objective |
| `_compute_mono_strehl(opm, fi_list, num_rays)` | `float` ∈ [0,1] | `focus_by_mono_strehl` reporting + tests |
| `_compute_poly_strehl(opm, fi_list, num_rays)` | `float` ∈ [0,1] | `focus_by_poly_strehl` reporting + tests |

## Dependencies

- `scipy.optimize.minimize_scalar` — bounded 1D optimizer
- `rayoptics.raytr.analyses.RayGrid` — for wavefront tracing
- `rayoptics_web_utils.zernike._extract_exit_pupil_grid` — exit pupil OPD grid
- `rayoptics_web_utils.zernike._monochromatic_strehl` — true Strehl formula
