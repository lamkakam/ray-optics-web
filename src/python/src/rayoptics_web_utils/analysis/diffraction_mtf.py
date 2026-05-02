"""Diffraction MTF line data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import calc_psf
from rayoptics.raytr.trace import trace_boundary_rays_at_field

from rayoptics_web_utils.analysis._mtf import (
    _diffraction_limited_mtf,
    _directional_na_from_ray_dirs,
    _mtf_frequency_axis,
)
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_diffraction_mtf_data(
    opm: OpticalModel,
    field_idx: int,
    wvl_idx: int,
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict:
    """
    Return diffraction MTF line data for one field and wavelength.
    """
    osp = opm.optical_spec
    fld = osp.field_of_view.fields[field_idx]
    wavelength_nm = osp.spectral_region.wavelengths[wvl_idx]
    wavelength_sys_units = opm.nm_to_sys_units(wavelength_nm)
    effective_max_dims = max(max_dims, 2 * num_rays)

    pupil_grid = make_ray_grid(opm, fi=field_idx, wavelength_nm=wavelength_nm, num_rays=num_rays)
    psf = calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, effective_max_dims)
    mtf = np.abs(np.fft.fftshift(np.fft.ifft2(np.fft.fftshift(psf))))

    center_idx = effective_max_dims // 2
    center_value = mtf[center_idx, center_idx]
    if center_value != 0.0:
        mtf = mtf / center_value

    tangential_mtf = mtf[center_idx:, center_idx]
    sagittal_mtf = mtf[center_idx, center_idx:]

    rim_rays = trace_boundary_rays_at_field(opm, fld, wavelength_nm, use_named_tuples=True)
    chief_dir = rim_rays[0].ray[-1].d
    na_sagittal = _directional_na_from_ray_dirs(
        chief_dir,
        rim_rays[1].ray[-1].d,
        rim_rays[2].ray[-1].d,
        axis=0,
    )
    na_tangential = _directional_na_from_ray_dirs(
        chief_dir,
        rim_rays[3].ray[-1].d,
        rim_rays[4].ray[-1].d,
        axis=1,
    )
    cutoff_sagittal = 2.0 * na_sagittal / wavelength_sys_units
    cutoff_tangential = 2.0 * na_tangential / wavelength_sys_units

    tangential_freqs = _mtf_frequency_axis(cutoff_tangential, len(tangential_mtf))
    sagittal_freqs = _mtf_frequency_axis(cutoff_sagittal, len(sagittal_mtf))

    ideal_tangential = _diffraction_limited_mtf(tangential_freqs, cutoff_tangential)
    ideal_sagittal = _diffraction_limited_mtf(sagittal_freqs, cutoff_sagittal)

    return {
        "fieldIdx": field_idx,
        "wvlIdx": wvl_idx,
        "Tangential": {
            "x": _json_float_list(tangential_freqs),
            "y": _json_float_list(tangential_mtf),
        },
        "Sagittal": {
            "x": _json_float_list(sagittal_freqs),
            "y": _json_float_list(sagittal_mtf),
        },
        "IdealTangential": {
            "x": _json_float_list(tangential_freqs),
            "y": _json_float_list(ideal_tangential),
        },
        "IdealSagittal": {
            "x": _json_float_list(sagittal_freqs),
            "y": _json_float_list(ideal_sagittal),
        },
        "unitX": f"cycles/{_system_units(opm)}",
        "unitY": "",
        "cutoffTangential": float(cutoff_tangential),
        "cutoffSagittal": float(cutoff_sagittal),
        "naTangential": float(na_tangential),
        "naSagittal": float(na_sagittal),
    }
