"""Strehl ratio vs wavelength data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl, _scale_opd_grid_to_wavelength


def _wavelength_axis(wavelengths, wavelength_samples: int) -> np.ndarray:
    configured_wavelengths = [float(wavelength) for wavelength in wavelengths]
    if not configured_wavelengths:
        raise ValueError("Optical model must define at least one wavelength.")

    distinct_wavelengths = set(configured_wavelengths)
    if len(distinct_wavelengths) >= 2:
        start = min(configured_wavelengths)
        stop = max(configured_wavelengths)
    else:
        center = configured_wavelengths[0]
        start = max(center - 200.0, 201.0)
        stop = center + 200.0

    return np.linspace(start, stop, wavelength_samples)


def _unique_preserving_order(values: list[float]) -> list[float]:
    unique_values = []
    for value in values:
        if value not in unique_values:
            unique_values.append(value)
    return unique_values


def _set_analysis_wavelengths(opm: OpticalModel, sampled_wavelengths: np.ndarray):
    spectral_region = opm["optical_spec"]["wvls"]
    original_state = (
        list(spectral_region.wavelengths),
        list(spectral_region.spectral_wts),
        spectral_region.reference_wvl,
    )
    original_central_wavelength = float(spectral_region.central_wvl)
    analysis_wavelengths = _unique_preserving_order(
        [float(wavelength) for wavelength in sampled_wavelengths] + [original_central_wavelength]
    )

    spectral_region.wavelengths = analysis_wavelengths
    spectral_region.spectral_wts = [1.0] * len(analysis_wavelengths)
    spectral_region.reference_wvl = analysis_wavelengths.index(original_central_wavelength)
    opm.update_model()

    return spectral_region, original_state


def _restore_wavelengths(opm: OpticalModel, spectral_region, original_state) -> None:
    original_wavelengths, original_weights, original_reference_wavelength = original_state
    spectral_region.wavelengths = original_wavelengths
    spectral_region.spectral_wts = original_weights
    spectral_region.reference_wvl = original_reference_wavelength
    opm.update_model()


def get_strehl_vs_wavelength_data(
    opm: OpticalModel,
    fieldIndex: int,
    image_point: str = "chief_ray",
    wavelength_samples: int = 32,
    num_rays: int = 21,
) -> dict:
    """
    Return Strehl ratio samples across the model wavelength range for one field.
    """
    wavelengths = _wavelength_axis(opm["optical_spec"]["wvls"].wavelengths, wavelength_samples)
    strehl_values = []
    spectral_region, original_state = _set_analysis_wavelengths(opm, wavelengths)

    try:
        for wavelength_nm in wavelengths:
            wavelength = float(wavelength_nm)
            ray_grid = make_ray_grid(
                opm,
                fi=fieldIndex,
                wavelength_nm=wavelength,
                num_rays=num_rays,
                image_point=image_point,
            )
            opd_grid = _scale_opd_grid_to_wavelength(ray_grid.grid[2], opm, wavelength)
            strehl = float(_monochromatic_strehl(opd_grid))
            strehl_values.append(min(max(strehl, 0.0), 1.0))
    finally:
        _restore_wavelengths(opm, spectral_region, original_state)

    return {
        "fieldIdx": fieldIndex,
        "x": [float(wavelength) for wavelength in wavelengths],
        "y": strehl_values,
        "unitX": "nm",
        "unitY": "",
    }
