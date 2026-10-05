"""Optimize image distance with shared focusing conventions.

All four public strategies mutate the final sequential gap in place and use the
bounded best-focus search shared with chromatic focal shift
(``focusing._solver``), centred on the current paraxial image distance. Returned
``delta_thi`` remains relative to the gap thickness at call time.

RMS values use a quadratic mean across fields and spectral weights, preserving
their energy interpretation. Strehl values use an arithmetic mean. Because exact
Strehl has secondary maxima with defocus, Strehl-based strategies optimize the
smooth RMS wavefront error with piston removed, then report true
``|mean(exp(i·2π·W))|²`` at the selected focus. OPD grids are scaled from central-
wavelength waves to the traced wavelength before either metric is evaluated.
"""

import numpy as np

from rayoptics_web_utils._spot import _rms_radius, _spot_fn
from rayoptics_web_utils.focusing._solver import (
    DEFAULT_FOCUS_BOUNDS,
    _minimize_focus,
    _paraxial_focus_offset,
)
from rayoptics_web_utils.zernike.zernike import (
    _monochromatic_strehl,
    _opd_wfe,
    _scale_opd_grid_to_wavelength,
)


def _resolve_field_indices(opm, field_indices: list[int] | None) -> list[int]:
    """Return field indices to use; defaults to all fields.

    Args:
        opm: RayOptics optical model.
        field_indices: Field indices to include, or `None` for all fields.

    Returns:
        Field indices to use; defaults to all fields.
    """
    if field_indices is not None:
        return list(field_indices)
    num_fields = len(opm['optical_spec']['fov'].fields)
    return list(range(num_fields))


def _aggregate(per_field_values: list[list[float]], weights, quadratic: bool) -> float:
    """Combine per-field, per-wavelength metric values into one scalar.

    Each field's values are averaged with the spectral weights (a missing
    weight counts as `1.0`), then the field results are averaged equally.
    Quadratic aggregation uses root-mean-square means at both levels, preserving
    the energy interpretation of RMS metrics; otherwise arithmetic means are used.

    Args:
        per_field_values: For each field, one metric value per wavelength.
        weights: Spectral weights indexed like each field's values.
        quadratic: Whether to use quadratic rather than arithmetic means.

    Returns:
        The aggregated metric.
    """
    field_values = []
    for values in per_field_values:
        wl_weights = np.array(
            [weights[wi] if wi < len(weights) else 1.0 for wi in range(len(values))],
            dtype=float,
        )
        wl_values = np.asarray(values, dtype=float)
        if quadratic:
            field_values.append(np.sqrt(np.sum(wl_values**2 * wl_weights) / np.sum(wl_weights)))
        else:
            field_values.append(np.sum(wl_values * wl_weights) / np.sum(wl_weights))
    field_array = np.asarray(field_values, dtype=float)
    if quadratic:
        return float(np.sqrt(np.mean(field_array**2)))
    return float(np.mean(field_array))


def _opd_metric(opm, fi: int, wavelength_nm: float, num_rays: int, metric) -> float:
    """Evaluate an OPD metric for one field and wavelength at the current focus.

    The OPD grid is scaled from central-wavelength waves to `wavelength_nm`
    waves before `metric` is applied.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        num_rays: Pupil-grid sampling resolution.
        metric: Function mapping an OPD grid in waves to a scalar.

    Returns:
        The metric value.
    """
    # Imported lazily so tests can replace the shared RayGrid factory.
    from rayoptics_web_utils.raygrid import make_ray_grid

    rg = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)
    return metric(_scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm))


def _opd_metric_per_field(opm, fi_list: list[int], wavelengths, num_rays: int, metric) -> list[list[float]]:
    """Return `metric` for every selected field and wavelength.

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        wavelengths: Wavelengths in nanometres.
        num_rays: Pupil-grid sampling resolution.
        metric: Function mapping an OPD grid in waves to a scalar.

    Returns:
        One list of per-wavelength values per field.
    """
    return [
        [_opd_metric(opm, fi, wvl, num_rays, metric) for wvl in wavelengths]
        for fi in fi_list
    ]


def _spot_rms_values(opm, fi: int, num_rays: int, wl) -> list[float]:
    """Return RMS spot radii for one field from a single RayOptics grid trace.

    `trace_grid` traces only the central wavelength when `wl` is given and every
    model wavelength when it is `None`. An empty grid scores `1e6`.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        num_rays: Pupil-grid sampling resolution.
        wl: Central wavelength for a monochromatic trace, or `None` for all.

    Returns:
        RMS spot radius per traced wavelength.
    """
    grids, _ = opm['seq_model'].trace_grid(
        _spot_fn, fi, wl=wl, num_rays=num_rays, form='list', append_if_none=False
    )
    return [_rms_radius(grid) for grid in grids] or [_rms_radius([])]


def _compute_mono_rms_spot(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute quadratic mean of per-field monochromatic RMS spot radii over given field indices.

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Quadratic mean of the per-field monochromatic RMS spot radii.
    """
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    values = [_spot_rms_values(opm, fi, num_rays, central_wvl)[:1] for fi in fi_list]
    return _aggregate(values, [1.0], quadratic=True)


def _compute_poly_rms_spot(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute quadratic mean of per-field polychromatic (spectrally weighted) RMS spot radii.

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Quadratic mean of the per-field spectrally weighted RMS spot radii.
    """
    spectral_wts = opm['optical_spec']['wvls'].spectral_wts
    values = [_spot_rms_values(opm, fi, num_rays, None) for fi in fi_list]
    return _aggregate(values, spectral_wts, quadratic=True)


def _compute_mono_wfe(opm, fi_list: list[int], num_rays: int) -> float:
    """Quadratic mean of per-field monochromatic RMS WFE over given field indices (smooth focusing objective).

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Quadratic mean of per-field monochromatic RMS wavefront error.
    """
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    values = _opd_metric_per_field(opm, fi_list, [central_wvl], num_rays, _opd_wfe)
    return _aggregate(values, [1.0], quadratic=True)


def _compute_poly_wfe(opm, fi_list: list[int], num_rays: int) -> float:
    """Quadratic mean of per-field polychromatic (spectrally weighted) RMS WFE (smooth focusing objective).

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Quadratic mean of per-field spectrally weighted RMS wavefront error.
    """
    wvls = opm['optical_spec']['wvls']
    values = _opd_metric_per_field(opm, fi_list, wvls.wavelengths, num_rays, _opd_wfe)
    return _aggregate(values, wvls.spectral_wts, quadratic=True)


def _compute_mono_strehl(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute mean monochromatic Strehl ratio over given field indices.

    Returns the true Strehl: |mean(exp(i·2π·W))|² over valid pupil points.
    This is used for reporting; the optimization objective uses _compute_mono_wfe.

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Mean monochromatic Strehl ratio over the selected fields.
    """
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    values = _opd_metric_per_field(opm, fi_list, [central_wvl], num_rays, _monochromatic_strehl)
    return _aggregate(values, [1.0], quadratic=False)


def _compute_poly_strehl(opm, fi_list: list[int], num_rays: int) -> float:
    """Compute mean polychromatic (spectrally weighted) Strehl ratio.

    Returns the true per-wavelength Strehl |mean(exp(i·2π·W))|² weighted across
    wavelengths and averaged over fields. Used for reporting; the optimization
    objective uses _compute_poly_wfe.

    Args:
        opm: RayOptics optical model.
        fi_list: Field indices included in the calculation.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Mean spectrally weighted Strehl ratio over the selected fields.
    """
    wvls = opm['optical_spec']['wvls']
    values = _opd_metric_per_field(opm, fi_list, wvls.wavelengths, num_rays, _monochromatic_strehl)
    return _aggregate(values, wvls.spectral_wts, quadratic=False)


def _focus(opm, field_indices, num_rays: int, bounds, objective_metric, report_metric) -> dict[str, float]:
    """Refocus by minimizing `objective_metric` over the final gap thickness.

    Each objective evaluation sets `sm.gaps[-1].thi` and updates the model. The
    shared bounded search is centred on the paraxial image distance, the best
    thickness is left applied, and `report_metric` is evaluated there.

    Args:
        opm: RayOptics optical model, mutated in place.
        field_indices: Field indices to include, or `None` for all fields.
        num_rays: Pupil-grid sampling resolution.
        bounds: `(lo, hi)` search offsets around the paraxial image distance.
        objective_metric: `(opm, fi_list, num_rays) -> float` to minimize.
        report_metric: `(opm, fi_list, num_rays) -> float` reported at the result.

    Returns:
        `{'delta_thi': float, 'metric_value': float}`.
    """
    sm = opm['seq_model']
    thi_0 = sm.gaps[-1].thi
    fi_list = _resolve_field_indices(opm, field_indices)

    def apply(delta: float) -> None:
        sm.gaps[-1].thi = thi_0 + delta
        opm.update_model()

    def objective(delta: float) -> float:
        apply(delta)
        return objective_metric(opm, fi_list, num_rays)

    delta_thi = _minimize_focus(objective, _paraxial_focus_offset(opm), bounds)
    apply(delta_thi)
    metric = report_metric(opm, fi_list, num_rays)
    return {'delta_thi': delta_thi, 'metric_value': float(metric)}


def focus_by_mono_rms_spot(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = DEFAULT_FOCUS_BOUNDS,
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
    return _focus(opm, field_indices, num_rays, bounds, _compute_mono_rms_spot, _compute_mono_rms_spot)


def focus_by_mono_strehl(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = DEFAULT_FOCUS_BOUNDS,
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
    return _focus(opm, field_indices, num_rays, bounds, _compute_mono_wfe, _compute_mono_strehl)


def focus_by_poly_rms_spot(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = DEFAULT_FOCUS_BOUNDS,
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
    return _focus(opm, field_indices, num_rays, bounds, _compute_poly_rms_spot, _compute_poly_rms_spot)


def focus_by_poly_strehl(
    opm,
    field_indices: list[int] | None = None,
    num_rays: int = 21,
    bounds: tuple[float, float] = DEFAULT_FOCUS_BOUNDS,
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
    return _focus(opm, field_indices, num_rays, bounds, _compute_poly_wfe, _compute_poly_strehl)
