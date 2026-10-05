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
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_list, _system_units

# Relative focus step, as a fraction of |EFL|, for the finite-difference defocus response.
_DEFOCUS_STEP_FRACTION = 1.0e-4
# Newton iterations stop once a step changes the RMS wavefront by less than this many waves.
_FOCUS_TOLERANCE_WAVES = 1.0e-2
_MAX_FOCUS_ITERATIONS = 8


def _remove_piston_and_tilt(px: np.ndarray, py: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Return least-squares residuals after removing `1`, `px`, and `py` terms."""
    basis = np.column_stack([np.ones(values.shape[0]), px, py])
    return values - basis @ np.linalg.lstsq(basis, values, rcond=None)[0]


class _FiniteBestFocus:
    """Solve the RMS-wavefront best-focus shift for one field at any model wavelength.

    Each Newton iterate traces one chief-ray grid at the current focus estimate
    and re-evaluates the same rays' OPD after a focus step of `1e-4 |EFL|`,
    giving OPD `W` and the local defocus response `D = dW/dfoc` in system
    length units. Both have piston and pupil tilt removed over the commonly
    valid cells, and the step `-<W, D> / <D, D>` solves the first-order
    stationarity condition of the residual RMS. `D` must come from the same
    wavelength and a nearby focus, because residual aberrations make the
    stationary point sensitive to its shape. Iteration stops once a step
    changes the RMS wavefront by less than `1e-2` waves, so warm-starting from
    a neighbouring wavelength usually needs one iterate.
    """

    def __init__(self, opm: OpticalModel, fi: int, num_rays: int):
        self.opm = opm
        self.fi = fi
        self.num_rays = num_rays
        efl = float(opm["analysis_results"]["parax_data"].fod.efl)
        step = _DEFOCUS_STEP_FRACTION * abs(efl)
        if not np.isfinite(step) or step == 0.0:
            step = _DEFOCUS_STEP_FRACTION
        self.step = step
        # Converts central-wavelength waves to system length units.
        self.opd_scale = opm.nm_to_sys_units(opm["optical_spec"]["wvls"].central_wvl)

    def solve(self, wavelength_nm: float, start: float) -> float:
        """Return the best-focus shift from the image plane in system length units.

        Args:
            wavelength_nm: Wavelength in nanometres; it must be a model wavelength.
            start: Initial focus shift in system length units.

        Returns:
            The best-focus shift, or `NaN` when too few valid rays remain.
        """
        tolerance = _FOCUS_TOLERANCE_WAVES * self.opm.nm_to_sys_units(wavelength_nm)
        focus = float(start)
        for _ in range(_MAX_FOCUS_ITERATIONS):
            ray_grid = make_ray_grid(
                self.opm, fi=self.fi, wavelength_nm=wavelength_nm, foc=focus, num_rays=self.num_rays
            )
            pupil_x, pupil_y, opd_waves = np.asarray(ray_grid.grid, dtype=float)
            opd = opd_waves * self.opd_scale
            stepped = np.asarray(ray_grid.refocused_opd(focus + self.step), dtype=float) * self.opd_scale
            valid = np.isfinite(opd) & np.isfinite(stepped)
            if np.count_nonzero(valid) < 4:
                return float("nan")
            px = pupil_x[valid]
            py = pupil_y[valid]
            response = _remove_piston_and_tilt(px, py, (stepped[valid] - opd[valid]) / self.step)
            response_power = float(np.dot(response, response))
            if not np.isfinite(response_power) or response_power == 0.0:
                return float("nan")
            residual = _remove_piston_and_tilt(px, py, opd[valid])
            step = -float(np.dot(residual, response)) / response_power
            focus += step
            if abs(step) * np.sqrt(response_power / response.shape[0]) < tolerance:
                break
        return focus


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
    length units; infinite image space returns best-fit output vergence in
    diopters. A sample whose trace fails is `NaN`. The model wavelengths must
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

    if is_afocal_image_space(opm):
        def evaluate(wavelength: float) -> float:
            return _best_vergence(opm, fieldIndex, wavelength, num_rays)

        reference_value = evaluate(reference_wavelength)
        values = []
        for wavelength in wavelengths:
            try:
                values.append(evaluate(float(wavelength)))
            except (TraceError, ValueError):
                values.append(float("nan"))
        return reference_value, values

    solver = _FiniteBestFocus(opm, fieldIndex, num_rays)
    reference_value = solver.solve(reference_wavelength, 0.0)
    if not np.isfinite(reference_value):
        raise ValueError("Best focus could not be resolved at the reference wavelength.")

    values = []
    start = reference_value
    for wavelength in wavelengths:
        if float(wavelength) == reference_wavelength:
            focus = reference_value
        else:
            try:
                focus = solver.solve(float(wavelength), start)
            except (TraceError, ValueError):
                focus = float("nan")
        values.append(focus)
        start = focus if np.isfinite(focus) else reference_value
    return reference_value, values


def get_chromatic_focal_shift_data(
    opm: OpticalModel,
    fieldIndex: int,
    wavelength_samples: int = 200,
    num_rays: int = 15,
) -> dict:
    """Return chart-ready chromatic focal shift samples for one field.

    The wavelength axis matches Strehl vs wavelength: two or more distinct
    configured wavelengths define a uniform range from their minimum to their
    maximum, while a single distinct wavelength uses `center ± 200 nm`, clipping
    the lower bound to 201 nm. Samples are temporarily added to the model, whose
    wavelengths, weights, and reference wavelength are restored even on error.

    In finite image space each sample's focus is the real-ray image-plane shift
    that minimizes chief-ray-referenced RMS wavefront error with piston and
    pupil tilt removed for the selected field. In infinite image space it is the
    RMS best-fit output vergence. Every value is reported relative to the same
    quantity at the model's reference wavelength, so the curve is zero there.

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
