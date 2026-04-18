"""Operand evaluation for optimization merit functions."""

from __future__ import annotations

import numpy as np
import rayoptics.optical.model_constants as mc

from rayoptics_web_utils.analysis import get_opd_fan_data
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.zernike.zernike import _extract_exit_pupil_grid

from .targets import validate_surface_index

PENALTY_RESIDUAL = 1e6


def _spot_fn(p, wi, ray_pkg, fld, wvl, foc):
    """Transverse aberration function for trace_grid."""
    del p, wi, wvl
    if ray_pkg is not None:
        image_pt = fld.ref_sphere[0]
        ray = ray_pkg[mc.ray]
        dist = foc / ray[-1][mc.d][2]
        defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
        t_abr = defocused_pt - image_pt
        return np.array([t_abr[0], t_abr[1]])
    return None


def compute_rms_spot_size(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return RMS spot size for one field/wavelength sample."""
    num_rays = int((options or {}).get("num_rays", 21))
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    grids, _ = opm["seq_model"].trace_grid(
        _spot_fn,
        field_index,
        wl=wavelengths[wavelength_index],
        num_rays=num_rays,
        form="list",
        append_if_none=False,
    )
    points = grids[0] if grids else []
    if len(points) == 0:
        return PENALTY_RESIDUAL
    xs = np.array([point[0] for point in points], dtype=float)
    ys = np.array([point[1] for point in points], dtype=float)
    return float(np.sqrt(np.mean(xs ** 2 + ys ** 2)))


def compute_rms_wavefront_error(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return RMS WFE in waves for one field/wavelength sample."""
    num_rays = int((options or {}).get("num_rays", 21))
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    wavelength_nm = wavelengths[wavelength_index]
    ray_grid = make_ray_grid(opm, fi=field_index, wavelength_nm=wavelength_nm, num_rays=num_rays)
    grid = _extract_exit_pupil_grid(ray_grid, opm, wavelength_nm)
    valid = grid[2][~np.isnan(grid[2])]
    if len(valid) == 0:
        return PENALTY_RESIDUAL
    return float(np.std(valid))


def compute_opd_difference(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return mean absolute OPD deviation in waves for one field/wavelength sample."""
    del options
    fan_data = get_opd_fan_data(opm, fi=field_index)
    validate_surface_index(fan_data, wavelength_index, "wavelength index")
    wavelength_fan = fan_data[wavelength_index]
    samples = np.array(
        [
            *wavelength_fan["Tangential"]["y"],
            *wavelength_fan["Sagittal"]["y"],
        ],
        dtype=float,
    )
    valid = samples[np.isfinite(samples)]
    if len(valid) == 0:
        return PENALTY_RESIDUAL

    mean = float(np.mean(valid))
    return float(np.mean(np.abs(valid - mean)))


def compute_focal_length(opm, field_index: int | None, wavelength_index: int | None, options: dict | None) -> float:
    """Return paraxial effective focal length."""
    del field_index, wavelength_index, options
    return float(opm["analysis_results"]["parax_data"].fod.efl)


def compute_f_number(opm, field_index: int | None, wavelength_index: int | None, options: dict | None) -> float:
    """Return paraxial f-number."""
    del field_index, wavelength_index, options
    return float(opm["analysis_results"]["parax_data"].fod.fno)


OPERAND_REGISTRY = {
    "rms_spot_size": compute_rms_spot_size,
    "rms_wavefront_error": compute_rms_wavefront_error,
    "opd_difference": compute_opd_difference,
    "focal_length": compute_focal_length,
    "f_number": compute_f_number,
}
