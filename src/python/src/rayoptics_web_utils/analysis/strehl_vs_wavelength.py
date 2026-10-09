"""Extract Strehl ratio as a function of wavelength."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rayoptics_web_utils.analysis._wavelength_sweep import (
    _restore_wavelengths,
    _set_analysis_wavelengths,
    _wavelength_axis,
)
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl, _scale_opd_grid_to_wavelength

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel


def get_strehl_vs_wavelength_data(
    opm: OpticalModel,
    fieldIndex: int,
    image_point: str = "chief_ray",
    wavelength_samples: int = 32,
    num_rays: int = 21,
) -> dict:
    """Return chart-ready Strehl samples across wavelength for one field.

    The result contains `fieldIdx`, wavelengths `x`, Strehl ratios `y`,
    `unitX="nm"`, and empty `unitY`, using plain floats for JSON encoding.

    Two or more distinct configured wavelengths define the uniform sample range.
    A single distinct wavelength instead uses `center ± 200 nm`, clipping the
    lower bound to 201 nm. Samples are temporarily added to the model because
    RayOptics traces only wavelengths in its sequential index table; the original
    wavelengths, weights, and reference wavelength are restored even on error.

    Each sample uses `make_ray_grid` with the requested image-point reference,
    scales central-wavelength OPD to the sampled wavelength, and computes
    monochromatic Strehl without extracting exit-pupil coordinates.

    Args:
        opm: RayOptics optical model.
        fieldIndex: Field index.
        image_point: Image-point reference convention.
        wavelength_samples: Wavelength and spectral-weight samples.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Chart-ready Strehl samples across wavelength for one field.
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
