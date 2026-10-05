"""Extract the chromatic shift of best focus for one field across wavelength."""

from __future__ import annotations

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.traceerror import TraceError

from rayoptics_web_utils.analysis._afocal import (
    _plane_distance,
    _system_units_per_metre,
    _vergence_coordinates,
    is_afocal_image_space,
    make_afocal_ray_grid,
    output_segment,
    transverse_axes,
)
from rayoptics_web_utils.analysis._wavelength_sweep import (
    _restore_wavelengths,
    _set_analysis_wavelengths,
    _wavelength_axis,
)
from rayoptics_web_utils.focusing._solver import _minimize_focus, _paraxial_focus_offset
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_list, _system_units
from rayoptics_web_utils.zernike.zernike import _opd_wfe, _scale_opd_grid_to_wavelength

# Plot-level focus tolerance as a fraction of |EFL| (0.05 µm for a 50 mm lens).
_FOCUS_XATOL_FRACTION = 1.0e-6


def _focus_tolerance(opm: OpticalModel) -> float | None:
    """Return the best-focus search tolerance for the plot in system length units.

    The tolerance is `1e-6 |EFL|`, scaling with the lens instead of the shared
    solver's fixed default and staying far below the plotted focal-shift
    resolution. A non-finite or zero EFL falls back to the solver default.

    Args:
        opm: RayOptics optical model.

    Returns:
        The absolute focus tolerance, or `None` for the solver default.
    """
    xatol = _FOCUS_XATOL_FRACTION * abs(float(opm["analysis_results"]["parax_data"].fod.efl))
    if not np.isfinite(xatol) or xatol == 0.0:
        return None
    return xatol


def _finite_best_focus(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    num_rays: int,
    center: float,
    xatol: float | None = None,
) -> float:
    """Return the piston-removed RMS-wavefront best-focus shift in system length units.

    Traces one chief-ray grid at the current image plane, then runs the bounded
    search shared with focusing over `refocused_opd`, which re-evaluates the
    same rays' OPD at each candidate focus without retracing or mutating the
    model. OPD is scaled to `wavelength_nm` waves before `_opd_wfe`.

    Args:
        opm: RayOptics optical model with finite image conjugate.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres; it must be a model wavelength.
        num_rays: Pupil-grid sampling resolution.
        center: Focus shift at the centre of the search window.
        xatol: Absolute focus tolerance, or `None` for the solver default.

    Returns:
        The best-focus shift from the image plane, or `NaN` when no ray is valid.
    """
    ray_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)
    if not np.any(np.isfinite(np.asarray(ray_grid.grid[2], dtype=float))):
        return float("nan")

    def objective(focus: float) -> float:
        return _opd_wfe(_scale_opd_grid_to_wavelength(ray_grid.refocused_opd(focus), opm, wavelength_nm))

    return _minimize_focus(objective, center, xatol=xatol)


def _best_vergence(opm: OpticalModel, fi: int, wavelength_nm: float, num_rays: int) -> float:
    """Return the RMS-wavefront best-fit output vergence in diopters.

    Plane-wave OPD in system length units is fitted over valid cells as
    `c0 + c1 h_s + c2 h_t + a (h_s² + h_t²)`, where `h_s` and `h_t` are the
    exit-pupil heights relative to the chief ray. The quadratic wavefront
    `V h² / 2` gives vergence `V = 2a`, converted to inverse metres.

    Args:
        opm: RayOptics optical model with infinite image conjugate.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres; it must be a model wavelength.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        The best-fit output vergence in diopters, or `NaN` when too few valid rays remain.
    """
    ray_grid = make_afocal_ray_grid(opm, fi, wavelength_nm, num_rays=num_rays)
    reference = ray_grid.reference_direction
    plane_point = ray_grid.exit_pupil_point
    sagittal, tangential = transverse_axes(reference)
    chief_point, chief_direction = output_segment(ray_grid.chief_ray_pkg)
    chief_at_pupil = chief_point + _plane_distance(chief_point, chief_direction, plane_point, reference) * chief_direction
    central_wavelength_sys = opm.nm_to_sys_units(opm["optical_spec"]["wvls"].central_wvl)

    rows = []
    values = []
    for row_idx, row in enumerate(ray_grid.raw_grid):
        for col_idx, (_, _, ray_pkg) in enumerate(row):
            opd_waves = ray_grid.grid[2, row_idx, col_idx]
            if ray_pkg is None or not np.isfinite(opd_waves):
                continue
            h_s, _ = _vergence_coordinates(ray_pkg, chief_at_pupil, plane_point, reference, sagittal)
            h_t, _ = _vergence_coordinates(ray_pkg, chief_at_pupil, plane_point, reference, tangential)
            rows.append([1.0, h_s, h_t, h_s * h_s + h_t * h_t])
            values.append(float(opd_waves) * central_wavelength_sys)

    if len(values) < 4 or np.linalg.matrix_rank(rows) < 4:
        return float("nan")
    coefficients = np.linalg.lstsq(np.asarray(rows), np.asarray(values), rcond=None)[0]
    return float(2.0 * coefficients[3] * _system_units_per_metre(opm))


def _focus_positions(
    opm: OpticalModel,
    fieldIndex: int,
    wavelengths: np.ndarray,
    num_rays: int,
) -> tuple[float, list[float]]:
    """Return the reference-wavelength focus metric and one value per sample.

    Finite image space returns best-focus shifts from the image plane in system
    length units, each solved independently by `_finite_best_focus` around the
    paraxial focus offset with the `_focus_tolerance` stopping tolerance; infinite image space returns best-fit output
    vergence in diopters. The reference wavelength's value is reused for an
    identical sample, and a sample whose trace fails is `NaN`. The model wavelengths must
    already contain every sample and the central wavelength.

    Args:
        opm: RayOptics optical model.
        fieldIndex: Field index.
        wavelengths: Sampled wavelengths in nanometres.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        The reference-wavelength value and the sampled values.
    """
    reference_wavelength = float(opm["optical_spec"]["wvls"].central_wvl)

    afocal = is_afocal_image_space(opm)
    if afocal:
        def evaluate(wavelength: float) -> float:
            return _best_vergence(opm, fieldIndex, wavelength, num_rays)
    else:
        center = _paraxial_focus_offset(opm)
        xatol = _focus_tolerance(opm)

        def evaluate(wavelength: float) -> float:
            return _finite_best_focus(opm, fieldIndex, wavelength, num_rays, center, xatol)

    reference_value = evaluate(reference_wavelength)
    if not afocal and not np.isfinite(reference_value):
        raise ValueError("Best focus could not be resolved at the reference wavelength.")

    values = []
    for wavelength in wavelengths:
        if float(wavelength) == reference_wavelength:
            values.append(reference_value)
            continue
        try:
            values.append(evaluate(float(wavelength)))
        except (TraceError, ValueError):
            values.append(float("nan"))
    return reference_value, values


def get_chromatic_focal_shift_data(
    opm: OpticalModel,
    fieldIndex: int,
    wavelength_samples: int = 50,
    num_rays: int = 15,
) -> dict:
    """Return chart-ready chromatic focal shift samples for one field.

    The wavelength axis matches Strehl vs wavelength: two or more distinct
    configured wavelengths define a uniform range from their minimum to their
    maximum, while a single distinct wavelength uses `center ± 200 nm`, clipping
    the lower bound to 201 nm. Samples are temporarily added to the model, whose
    wavelengths, weights, and reference wavelength are restored even on error.

    In finite image space each sample's focus is the real-ray image-plane shift
    that minimizes chief-ray-referenced RMS wavefront error with piston removed
    (the same objective as focusing's Strehl strategies) for the selected field,
    found by focusing's shared bounded search within `±5` system length units of
    the paraxial image, stopping at a tolerance of `1e-6 |EFL|`. In infinite
    image space it is the RMS best-fit output vergence. Every value is reported
    relative to the same quantity at the model's reference wavelength, so the
    curve is zero there.

    The result contains `fieldIdx`, focal shifts `x` (`None` for failed
    samples), wavelengths `y`, `unitX` (system length unit, or `D` when afocal),
    `unitY="nm"`, `referenceWavelength` in nm, and `maxFocalShiftRange`, the
    spread of the finite shifts or `None` when no sample succeeded.

    Args:
        opm: RayOptics optical model.
        fieldIndex: Field index.
        wavelength_samples: Number of wavelength samples, at least 2.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Chart-ready chromatic focal shift samples for one field.
    """
    if wavelength_samples < 2:
        raise ValueError("wavelength_samples must be at least 2.")

    spectral_region = opm["optical_spec"]["wvls"]
    reference_wavelength = float(spectral_region.central_wvl)
    wavelengths = _wavelength_axis(spectral_region.wavelengths, wavelength_samples)
    afocal = is_afocal_image_space(opm)
    spectral_region, original_state = _set_analysis_wavelengths(opm, wavelengths)

    try:
        reference_value, values = _focus_positions(opm, fieldIndex, wavelengths, num_rays)
    finally:
        _restore_wavelengths(opm, spectral_region, original_state)

    shifts = [
        float(value) - float(reference_value) if np.isfinite(value) else float("nan")
        for value in values
    ]
    finite_shifts = [shift for shift in shifts if np.isfinite(shift)]

    return {
        "fieldIdx": fieldIndex,
        "x": _json_float_list(shifts),
        "y": [float(wavelength) for wavelength in wavelengths],
        "unitX": "D" if afocal else _system_units(opm),
        "unitY": "nm",
        "referenceWavelength": reference_wavelength,
        "maxFocalShiftRange": max(finite_shifts) - min(finite_shifts) if finite_shifts else None,
    }
