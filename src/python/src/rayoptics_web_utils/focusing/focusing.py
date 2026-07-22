r"""# `python/src/rayoptics_web_utils/focusing/focusing.py`

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

Both the WFE objective helpers and Strehl reporting helpers operate directly on
`RayGrid.grid[2]`, using `_scale_opd_grid_to_wavelength(...)` to convert OPD from
central-wavelength waves to traced-wavelength waves. They do not extract exit-pupil
coordinates because these calculations only consume OPD values.

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
- `rayoptics_web_utils.zernike.zernike._scale_opd_grid_to_wavelength` — OPD wavelength scaling
- `rayoptics_web_utils.zernike.zernike._monochromatic_strehl` — true Strehl formula

## Usages

All four focusing functions are called from the Pyodide worker (`workers/pyodide.worker.ts`) and mutate the optical model's image distance in place.

Focusing functions for rayoptics models.

Find the optimal image distance (sm.gaps[-1].thi) by optimizing an image-quality
metric using scipy.optimize.minimize_scalar with the 'bounded' method.

Four metric variants:
- Monochromatic RMS spot radius
- Monochromatic Strehl ratio
- Polychromatic RMS spot radius
- Polychromatic Strehl ratio

Implementation note on Strehl optimization
-------------------------------------------
The exact Strehl formula |mean(exp(i·2π·W))|² produces a sinc-squared landscape
with secondary maxima vs defocus, which makes minimize_scalar unreliable for large
search ranges. The Strehl-based focusing functions therefore use RMS wavefront error
(std of the OPD grid) as the optimization objective — this is smooth and unimodal
with respect to defocus. The returned ``metric_value`` is the TRUE Strehl
(|mean(exp(i·2π·W))|²) evaluated at the optimized position.
"""

import numpy as np
from scipy.optimize import minimize_scalar

import rayoptics.optical.model_constants as mc
from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl, _scale_opd_grid_to_wavelength


def _get_paraxial_image_distance(opm) -> float:
    """Return the paraxial image distance for the current conjugates."""
    return float(opm['analysis_results']['parax_data'].fod.img_dist)


def _resolve_field_indices(opm, field_indices: list[int] | None) -> list[int]:
    """Return field indices to use; defaults to all fields."""
    if field_indices is not None:
        return list(field_indices)
    num_fields = len(opm['optical_spec']['fov'].fields)
    return list(range(num_fields))


def _spot_fn(p, wi, ray_pkg, fld, wvl, foc):
    """Transverse aberration function for trace_grid."""
    if ray_pkg is not None:
        image_pt = fld.ref_sphere[0]
        ray = ray_pkg[mc.ray]
        dist = foc / ray[-1][mc.d][2]
        defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
        t_abr = defocused_pt - image_pt
        return np.array([t_abr[0], t_abr[1]])
    return None


# ---------------------------------------------------------------------------
# RMS spot helpers
# ---------------------------------------------------------------------------

def _compute_mono_rms_spot(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute quadratic mean of per-field monochromatic RMS spot radii over given field indices."""
    sm = opm['seq_model']
    osp = opm['optical_spec']
    central_wvl = osp['wvls'].central_wvl

    rms_values = []
    for fi in fi_list:
        grids, _ = sm.trace_grid(
            _spot_fn, fi, wl=central_wvl, num_rays=num_rays,
            form='list', append_if_none=False
        )
        # grids is a single-element list when wl=central_wvl
        pts = grids[0] if grids else []
        if len(pts) == 0:
            rms_values.append(1e6)
            continue
        xs = np.array([pt[0] for pt in pts])
        ys = np.array([pt[1] for pt in pts])
        rms = float(np.sqrt(np.mean(xs**2 + ys**2)))
        rms_values.append(rms)

    return float(np.sqrt(np.mean(np.array(rms_values)**2)))


def _compute_poly_rms_spot(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute quadratic mean of per-field polychromatic (spectrally weighted) RMS spot radii."""
    sm = opm['seq_model']
    osp = opm['optical_spec']
    spectral_wts = osp['wvls'].spectral_wts

    field_rms_values = []
    for fi in fi_list:
        grids, _ = sm.trace_grid(
            _spot_fn, fi, wl=None, num_rays=num_rays,
            form='list', append_if_none=False
        )
        # grids has one entry per wavelength
        wl_rms_values = []
        wl_weights = []
        for gi, grid in enumerate(grids):
            w = spectral_wts[gi] if gi < len(spectral_wts) else 1.0
            pts = grid if len(grid) > 0 else []
            if len(pts) == 0:
                wl_rms_values.append(1e6)
            else:
                xs = np.array([pt[0] for pt in pts])
                ys = np.array([pt[1] for pt in pts])
                wl_rms_values.append(float(np.sqrt(np.mean(xs**2 + ys**2))))
            wl_weights.append(w)

        total_w = sum(wl_weights)
        weighted_rms = np.sqrt(sum(r**2 * w for r, w in zip(wl_rms_values, wl_weights)) / total_w)
        field_rms_values.append(weighted_rms)

    return float(np.sqrt(np.mean(np.array(field_rms_values)**2)))


# ---------------------------------------------------------------------------
# Strehl helpers: WFE (for optimization) and Strehl (for reporting)
# ---------------------------------------------------------------------------

def _opd_wfe(opd_grid: np.ndarray) -> float:
    """Return RMS wavefront error (std of OPD in waves) over valid pupil points.

    Uses std (not RMS) to remove the piston term, giving the pure aberration RMS.
    This is smooth and unimodal with respect to defocus, making it suitable as an
    optimization objective for focusing.

    Returns 1e6 if no valid pupil points.
    """
    valid = opd_grid[~np.isnan(opd_grid)]
    if len(valid) == 0:
        return 1e6
    return float(np.std(valid))


def _compute_mono_wfe(opm, fi_list: list[int], num_rays: int) -> float:
    """Quadratic mean of per-field monochromatic RMS WFE over given field indices (smooth focusing objective)."""
    from rayoptics_web_utils.raygrid import make_ray_grid

    osp = opm['optical_spec']
    central_wvl = osp['wvls'].central_wvl

    wfe_values = []
    for fi in fi_list:
        rg = make_ray_grid(opm, fi=fi, wavelength_nm=central_wvl, num_rays=num_rays)
        opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, central_wvl)
        wfe_values.append(_opd_wfe(opd_grid))

    return float(np.sqrt(np.mean(np.array(wfe_values)**2)))


def _compute_poly_wfe(opm, fi_list: list[int], num_rays: int) -> float:
    """Quadratic mean of per-field polychromatic (spectrally weighted) RMS WFE (smooth focusing objective)."""
    from rayoptics_web_utils.raygrid import make_ray_grid

    osp = opm['optical_spec']
    wavelengths = osp['wvls'].wavelengths
    spectral_wts = osp['wvls'].spectral_wts

    field_wfe_values = []
    for fi in fi_list:
        wl_wfe = []
        wl_weights = []
        for wi, wvl in enumerate(wavelengths):
            w = spectral_wts[wi] if wi < len(spectral_wts) else 1.0
            rg = make_ray_grid(opm, fi=fi, wavelength_nm=wvl, num_rays=num_rays)
            opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, wvl)
            wl_wfe.append(_opd_wfe(opd_grid))
            wl_weights.append(w)

        total_w = sum(wl_weights)
        weighted_wfe = np.sqrt(sum(e**2 * w for e, w in zip(wl_wfe, wl_weights)) / total_w)
        field_wfe_values.append(weighted_wfe)

    return float(np.sqrt(np.mean(np.array(field_wfe_values)**2)))


def _compute_mono_strehl(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute mean monochromatic Strehl ratio over given field indices.

    Returns the true Strehl: |mean(exp(i·2π·W))|² over valid pupil points.
    This is used for reporting; the optimization objective uses _compute_mono_wfe.
    """
    from rayoptics_web_utils.raygrid import make_ray_grid

    osp = opm['optical_spec']
    central_wvl = osp['wvls'].central_wvl

    strehl_values = []
    for fi in fi_list:
        rg = make_ray_grid(opm, fi=fi, wavelength_nm=central_wvl, num_rays=num_rays)
        opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, central_wvl)
        s = _monochromatic_strehl(opd_grid)
        strehl_values.append(s)

    return float(np.mean(strehl_values))


def _compute_poly_strehl(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute mean polychromatic (spectrally weighted) Strehl ratio.

    Returns the true per-wavelength Strehl |mean(exp(i·2π·W))|² weighted across
    wavelengths and averaged over fields. Used for reporting; the optimization
    objective uses _compute_poly_wfe.
    """
    from rayoptics_web_utils.raygrid import make_ray_grid

    osp = opm['optical_spec']
    wavelengths = osp['wvls'].wavelengths
    spectral_wts = osp['wvls'].spectral_wts

    field_strehl_values = []
    for fi in fi_list:
        wl_strehl = []
        wl_weights = []
        for wi, wvl in enumerate(wavelengths):
            w = spectral_wts[wi] if wi < len(spectral_wts) else 1.0
            rg = make_ray_grid(opm, fi=fi, wavelength_nm=wvl, num_rays=num_rays)
            opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, wvl)
            s = _monochromatic_strehl(opd_grid)
            wl_strehl.append(s)
            wl_weights.append(w)

        total_w = sum(wl_weights)
        weighted_strehl = sum(s * w for s, w in zip(wl_strehl, wl_weights)) / total_w
        field_strehl_values.append(weighted_strehl)

    return float(np.mean(field_strehl_values))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def focus_by_mono_rms_spot(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = (-5.0, 5.0),
) -> dict[str, float]:
    """Find optimal focus by minimizing monochromatic RMS spot radius.

        Mutates opm in place by updating sm.gaps[-1].thi.

        Args:
            opm: OpticalModel instance.
            field_indices: field indices to include. None = all fields.
            num_rays: RayGrid resolution.
            bounds: (lo, hi) search range for delta_thi in system units (mm).

        Returns:
            {'delta_thi': float, 'metric_value': float}


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
    ```"""
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    img_dist = _get_paraxial_image_distance(opm)
    initial_delta = img_dist - thi_0
    centered_bounds = (initial_delta + bounds[0], initial_delta + bounds[1])

    def objective(delta: float) -> float:
        sm.gaps[-1].thi = thi_0 + delta
        opm.update_model()
        return _compute_mono_rms_spot(opm, fi_list, num_rays)

    result = minimize_scalar(objective, bounds=centered_bounds, method='bounded')
    sm.gaps[-1].thi = thi_0 + result.x
    opm.update_model()
    metric = _compute_mono_rms_spot(opm, fi_list, num_rays)
    return {'delta_thi': float(result.x), 'metric_value': float(metric)}


def focus_by_mono_strehl(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = (-5.0, 5.0),
) -> dict[str, float]:
    """Find optimal focus by maximizing monochromatic Strehl ratio.

    Optimization uses RMS wavefront error (smooth, unimodal) as the internal
    objective. The returned metric_value is the true Strehl (|mean(exp(i·2π·W))|²)
    at the optimized position.

    Mutates opm in place by updating sm.gaps[-1].thi.

    Args:
        opm: OpticalModel instance.
        field_indices: field indices to include. None = all fields.
        num_rays: RayGrid resolution.
        bounds: (lo, hi) search range for delta_thi in system units (mm).

    Returns:
        {'delta_thi': float, 'metric_value': float} where metric_value is Strehl in [0,1].
    """
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    img_dist = _get_paraxial_image_distance(opm)
    initial_delta = img_dist - thi_0
    centered_bounds = (initial_delta + bounds[0], initial_delta + bounds[1])

    def objective(delta: float) -> float:
        sm.gaps[-1].thi = thi_0 + delta
        opm.update_model()
        return _compute_mono_wfe(opm, fi_list, num_rays)  # minimize WFE (smooth)

    result = minimize_scalar(objective, bounds=centered_bounds, method='bounded')
    sm.gaps[-1].thi = thi_0 + result.x
    opm.update_model()
    metric = _compute_mono_strehl(opm, fi_list, num_rays)  # report true Strehl
    return {'delta_thi': float(result.x), 'metric_value': float(metric)}


def focus_by_poly_rms_spot(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = (-5.0, 5.0),
) -> dict[str, float]:
    """Find optimal focus by minimizing polychromatic (spectrally weighted) RMS spot radius.

        Mutates opm in place by updating sm.gaps[-1].thi.

        Args:
            opm: OpticalModel instance.
            field_indices: field indices to include. None = all fields.
            num_rays: RayGrid resolution.
            bounds: (lo, hi) search range for delta_thi in system units (mm).

        Returns:
            {'delta_thi': float, 'metric_value': float}


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

    All functions permanently modify `opm['seq_model'].gaps[-1].thi` and update the optical model. Used for autofocus features in the frontend."""
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    img_dist = _get_paraxial_image_distance(opm)
    initial_delta = img_dist - thi_0
    centered_bounds = (initial_delta + bounds[0], initial_delta + bounds[1])

    def objective(delta: float) -> float:
        sm.gaps[-1].thi = thi_0 + delta
        opm.update_model()
        return _compute_poly_rms_spot(opm, fi_list, num_rays)

    result = minimize_scalar(objective, bounds=centered_bounds, method='bounded')
    sm.gaps[-1].thi = thi_0 + result.x
    opm.update_model()
    metric = _compute_poly_rms_spot(opm, fi_list, num_rays)
    return {'delta_thi': float(result.x), 'metric_value': float(metric)}


def focus_by_poly_strehl(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = (-5.0, 5.0),
) -> dict[str, float]:
    """Find optimal focus by maximizing polychromatic (spectrally weighted) Strehl ratio.

    Optimization uses RMS wavefront error (smooth, unimodal) as the internal
    objective. The returned metric_value is the true polychromatic Strehl
    (weighted average of |mean(exp(i·2π·W))|² across wavelengths) at the
    optimized position.

    Mutates opm in place by updating sm.gaps[-1].thi.

    Args:
        opm: OpticalModel instance.
        field_indices: field indices to include. None = all fields.
        num_rays: RayGrid resolution.
        bounds: (lo, hi) search range for delta_thi in system units (mm).

    Returns:
        {'delta_thi': float, 'metric_value': float} where metric_value is Strehl in [0,1].
    """
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    img_dist = _get_paraxial_image_distance(opm)
    initial_delta = img_dist - thi_0
    centered_bounds = (initial_delta + bounds[0], initial_delta + bounds[1])

    def objective(delta: float) -> float:
        sm.gaps[-1].thi = thi_0 + delta
        opm.update_model()
        return _compute_poly_wfe(opm, fi_list, num_rays)  # minimize WFE (smooth)

    result = minimize_scalar(objective, bounds=centered_bounds, method='bounded')
    sm.gaps[-1].thi = thi_0 + result.x
    opm.update_model()
    metric = _compute_poly_strehl(opm, fi_list, num_rays)  # report true Strehl
    return {'delta_thi': float(result.x), 'metric_value': float(metric)}
