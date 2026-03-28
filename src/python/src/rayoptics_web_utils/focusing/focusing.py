"""Focusing functions for rayoptics models.

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
from rayoptics_web_utils.zernike.zernike import _extract_exit_pupil_grid, _monochromatic_strehl


def _get_paraxial_bfl(opm) -> float:
    """Return paraxial back focal length from first-order data."""
    return float(opm['analysis_results']['parax_data'].fod.bfl)


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
        grid = _extract_exit_pupil_grid(rg, opm, central_wvl)
        wfe_values.append(_opd_wfe(grid[2]))

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
            grid = _extract_exit_pupil_grid(rg, opm, wvl)
            wl_wfe.append(_opd_wfe(grid[2]))
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
        grid = _extract_exit_pupil_grid(rg, opm, central_wvl)
        s = _monochromatic_strehl(grid[2])
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
            grid = _extract_exit_pupil_grid(rg, opm, wvl)
            s = _monochromatic_strehl(grid[2])
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
    """
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    bfl = _get_paraxial_bfl(opm)
    initial_delta = bfl - thi_0
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
    bfl = _get_paraxial_bfl(opm)
    initial_delta = bfl - thi_0
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
    """
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)
    bfl = _get_paraxial_bfl(opm)
    initial_delta = bfl - thi_0
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
    bfl = _get_paraxial_bfl(opm)
    initial_delta = bfl - thi_0
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
