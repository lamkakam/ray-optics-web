# `python/src/rayoptics_web_utils/focusing/focusing.py`

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
| `bounds` | `tuple[float, float]` | `(-5.0, 5.0)` | Half-window around the paraxial image distance for the `delta_thi` search (mm) |

## Algorithm

All four use `scipy.optimize.minimize_scalar(method='bounded')`. The search window is
**centered on the paraxial image distance** for the current conjugates (not on `thi_0`) so
the optimizer reaches the true focus for both infinite- and finite-conjugate systems even
when the current image plane is far from focus.

```python
sm = opm['seq_model']
thi_0 = sm.gaps[-1].thi
img_dist = _get_paraxial_image_distance(opm)  # paraxial image distance
initial_delta = img_dist - thi_0      # shift from current thi to paraxial focus
centered_bounds = (initial_delta + bounds[0], initial_delta + bounds[1])

def objective(delta):
    sm.gaps[-1].thi = thi_0 + delta
    opm.update_model()
    return <metric or -metric>

result = minimize_scalar(objective, bounds=centered_bounds, method='bounded')
sm.gaps[-1].thi = thi_0 + result.x
opm.update_model()
return {'delta_thi': result.x, 'metric_value': <final metric>}
```

`delta_thi` in the return value is always relative to `thi_0` (the value of `sm.gaps[-1].thi`
at call time), consistent with callers and existing tests.

## RMS aggregation across fields

Per-field RMS values are combined using the **quadratic mean** (`sqrt(mean(x²))`), not the
arithmetic mean. This correctly preserves the energy interpretation: arithmetic mean of RMS
values underestimates the true combined RMS when values differ across fields.

The spectral weighting within `_compute_poly_*` functions also uses quadratic weighting:
`sqrt(sum(r² * w) / total_w)` rather than `sum(r * w) / total_w`.

Strehl values (in `_compute_mono_strehl` and `_compute_poly_strehl`) use **arithmetic mean**
over fields — this is standard practice for Strehl ratios and is unchanged.

## Strehl optimization note

The exact Strehl formula `|mean(exp(i·2π·W))|²` produces a sinc-squared landscape
with secondary maxima vs defocus — `minimize_scalar` (Brent's method) gets trapped.
The Strehl-based functions therefore:
- **Optimize** using RMS wavefront error `std(OPD_grid)` (smooth, unimodal)
- **Report** the true Strehl `|mean(exp(i·2π·W))|²` at the optimized position

## Private helpers

| Function | Returns | Used by |
|---|---|---|
| `_get_paraxial_image_distance(opm)` | `float` (mm) | all 4 (image-distance centering) |
| `_resolve_field_indices(opm, field_indices)` | `list[int]` | all 4 |
| `_spot_fn(p, wi, ray_pkg, fld, wvl, foc)` | `ndarray \| None` | RMS spot helpers |
| `_compute_mono_rms_spot(opm, fi_list, num_rays)` | `float` (mm) — quadratic mean over fields | `focus_by_mono_rms_spot` |
| `_compute_poly_rms_spot(opm, fi_list, num_rays)` | `float` (mm) — quadratic mean over fields of spectrally weighted RMS | `focus_by_poly_rms_spot` |
| `_opd_wfe(opd_grid)` | `float` (waves, std) | WFE helpers |
| `_compute_mono_wfe(opm, fi_list, num_rays)` | `float` (waves) — quadratic mean over fields | `focus_by_mono_strehl` objective |
| `_compute_poly_wfe(opm, fi_list, num_rays)` | `float` (waves) — quadratic mean over fields of spectrally weighted WFE | `focus_by_poly_strehl` objective |
| `_compute_mono_strehl(opm, fi_list, num_rays)` | `float` ∈ [0,1] | `focus_by_mono_strehl` reporting + tests |
| `_compute_poly_strehl(opm, fi_list, num_rays)` | `float` ∈ [0,1] | `focus_by_poly_strehl` reporting + tests |

## Dependencies

- `scipy.optimize.minimize_scalar` — bounded 1D optimizer
- `rayoptics_web_utils.raygrid.make_ray_grid` — RayGrid factory (replaces direct `RayGrid(...)` calls)
- `rayoptics_web_utils.zernike.zernike._extract_exit_pupil_grid` — exit pupil OPD grid
- `rayoptics_web_utils.zernike.zernike._monochromatic_strehl` — true Strehl formula

## Usages

All four focusing functions are called from the Pyodide worker (`workers/pyodide.worker.ts`) and mutate the optical model's image distance in place.

### `focus_by_mono_rms_spot` / `focus_by_mono_strehl`

Optimize image distance using monochromatic RMS spot radius or Strehl ratio:

```python
from rayoptics_web_utils.focusing import focus_by_mono_rms_spot, focus_by_mono_strehl

field_index = 0
result = focus_by_mono_rms_spot(opm, field_indices=[field_index])
# Returns: {"delta_thi": 0.5, "metric_value": 0.05}
# opm['seq_model'].gaps[-1].thi has been updated by delta_thi

strehl_result = focus_by_mono_strehl(opm, field_indices=[field_index])
# Returns: {"delta_thi": 0.48, "metric_value": 0.92}  # Strehl ∈ [0, 1]
```

### `focus_by_poly_rms_spot` / `focus_by_poly_strehl`

Optimize image distance using polychromatic (spectrally-weighted) metrics:

```python
from rayoptics_web_utils.focusing import focus_by_poly_rms_spot, focus_by_poly_strehl

field_index = 0
poly_result = focus_by_poly_rms_spot(opm, field_indices=[field_index])
# Returns: {"delta_thi": 0.52, "metric_value": 0.06}
# RMS aggregated across all wavelengths via quadratic mean

strehl_poly = focus_by_poly_strehl(opm, field_indices=[field_index])
# Returns: {"delta_thi": 0.50, "metric_value": 0.90}  # Strehl averaged across wavelengths
```

All functions permanently modify `opm['seq_model'].gaps[-1].thi` and update the optical model. Used for autofocus features in the frontend.
