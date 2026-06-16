"""Operand evaluation for optimization merit functions."""

from __future__ import annotations

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.analysis import get_opd_fan_data
from rayoptics_web_utils.analysis import get_ray_fan_data
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.zernike.zernike import _scale_opd_grid_to_wavelength

from ._types import OperandEvaluator, OperandOptions, OperandSample
from .targets import validate_surface_index

PENALTY_RESIDUAL = 1e6


def get_operand_num_rays(options: OperandOptions | None, default: int = 21) -> int:
    """Return the caller-configured ray sampling count for operand analyses."""
    return int((options or {}).get("num_rays", default))


def get_nominal_operand_sample_residual_count(sample: OperandSample) -> int:
    """Return the stable residual count contributed by one normalized operand sample."""
    if sample["kind"] == "ray_fan":
        return get_operand_num_rays(sample.get("options")) * 2
    if sample["kind"] in {"ray_fan_tangential", "ray_fan_sagittal"}:
        return get_operand_num_rays(sample.get("options"))
    return 1


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


def compute_rms_spot_size(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return RMS spot size for one field/wavelength sample."""
    del opd_aim_point
    if field_index is None or wavelength_index is None:
        raise ValueError("rms_spot_size requires field and wavelength indices")
    num_rays = get_operand_num_rays(options)
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


def compute_rms_wavefront_error(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return RMS WFE in waves for one field/wavelength sample."""
    if field_index is None or wavelength_index is None:
        raise ValueError("rms_wavefront_error requires field and wavelength indices")
    num_rays = get_operand_num_rays(options)
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    wavelength_nm = wavelengths[wavelength_index]
    ray_grid = make_ray_grid(
        opm,
        fi=field_index,
        wavelength_nm=wavelength_nm,
        num_rays=num_rays,
        opd_aim_point=opd_aim_point,
    )
    opd_grid = _scale_opd_grid_to_wavelength(ray_grid.grid[2], opm, wavelength_nm)
    valid = opd_grid[~np.isnan(opd_grid)]
    if len(valid) == 0:
        return PENALTY_RESIDUAL
    return float(np.std(valid))


def _select_fan_samples(wavelength_fan: dict, axis: str | None) -> list[float]:
    if axis is None:
        return [
            *wavelength_fan["Tangential"]["y"],
            *wavelength_fan["Sagittal"]["y"],
        ]
    return list(wavelength_fan[axis]["y"])


def _compute_opd_difference_for_axis(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
    axis: str | None = None,
) -> float:
    """Return mean absolute OPD deviation in waves for one field/wavelength sample."""
    if field_index is None or wavelength_index is None:
        raise ValueError("opd_difference requires field and wavelength indices")
    del options
    fan_data = get_opd_fan_data(opm, fi=field_index, opd_aim_point=opd_aim_point)
    validate_surface_index(fan_data, wavelength_index, "wavelength index")
    wavelength_fan = fan_data[wavelength_index]
    samples = np.array(_select_fan_samples(wavelength_fan, axis), dtype=float)
    valid = samples[np.isfinite(samples)]
    if len(valid) == 0:
        return PENALTY_RESIDUAL

    mean = float(np.mean(valid))
    return float(np.mean(np.abs(valid - mean)))


def compute_opd_difference(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return combined tangential and sagittal mean absolute OPD deviation."""
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, opd_aim_point)


def compute_opd_difference_tangential(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return tangential mean absolute OPD deviation."""
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, opd_aim_point, "Tangential")


def compute_opd_difference_sagittal(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return sagittal mean absolute OPD deviation."""
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, opd_aim_point, "Sagittal")


def compute_focal_length(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return paraxial effective focal length."""
    del field_index, wavelength_index, options, opd_aim_point
    return float(opm["analysis_results"]["parax_data"].fod.efl)


def compute_f_number(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> float:
    """Return paraxial f-number."""
    del field_index, wavelength_index, options, opd_aim_point
    return float(opm["analysis_results"]["parax_data"].fod.fno)


def _compute_ray_fan_for_axis(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
    axis: str | None = None,
) -> list[float]:
    """Return ray-fan ordinates for one field/wavelength sample."""
    del opd_aim_point
    if field_index is None or wavelength_index is None:
        raise ValueError("ray_fan requires field and wavelength indices")
    residual_count = get_operand_num_rays(options) * (2 if axis is None else 1)
    ray_fan_data = get_ray_fan_data(opm, fi=field_index)
    validate_surface_index(ray_fan_data, wavelength_index, "wavelength index")
    wavelength_fan = ray_fan_data[wavelength_index]
    samples = _select_fan_samples(wavelength_fan, axis)
    padded_samples = list(samples[:residual_count])
    while len(padded_samples) < residual_count:
        padded_samples.append(float("nan"))
    return [
        float(sample) if np.isfinite(sample) else PENALTY_RESIDUAL
        for sample in padded_samples
    ]


def compute_ray_fan(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> list[float]:
    """Return combined tangential and sagittal ray-fan ordinates for one field/wavelength sample."""
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, opd_aim_point)


def compute_ray_fan_tangential(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> list[float]:
    """Return tangential ray-fan ordinates for one field/wavelength sample."""
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, opd_aim_point, "Tangential")


def compute_ray_fan_sagittal(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    opd_aim_point: str = "chief_ray",
) -> list[float]:
    """Return sagittal ray-fan ordinates for one field/wavelength sample."""
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, opd_aim_point, "Sagittal")


OPERAND_REGISTRY: dict[str, OperandEvaluator] = {
    "rms_spot_size": compute_rms_spot_size,
    "rms_wavefront_error": compute_rms_wavefront_error,
    "opd_difference": compute_opd_difference,
    "opd_difference_tangential": compute_opd_difference_tangential,
    "opd_difference_sagittal": compute_opd_difference_sagittal,
    "focal_length": compute_focal_length,
    "f_number": compute_f_number,
    "ray_fan": compute_ray_fan,
    "ray_fan_tangential": compute_ray_fan_tangential,
    "ray_fan_sagittal": compute_ray_fan_sagittal,
}
