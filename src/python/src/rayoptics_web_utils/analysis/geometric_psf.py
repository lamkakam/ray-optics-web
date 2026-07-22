"""# `python/src/rayoptics_web_utils/analysis/geometric_psf.py`

Geometric PSF point-cloud data extraction."""

from rayoptics.environment import OpticalModel
from rayoptics.raytr import sampler
from rayoptics.raytr.analyses import RayList

from rayoptics_web_utils.utils import _json_float_list, _system_units
from rayoptics_web_utils.analysis._afocal import angular_coordinates, is_afocal_image_space, output_segment, reference_direction


def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
        Return geometric PSF point-cloud data for one field and wavelength.


    ## Purpose

    Return geometric PSF point-cloud data for one field and wavelength.

    ## Exports

    ```python
    def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
    ```

    ## Behavior

    - Builds an `R_2_quasi_random_generator` pupil sample mapped through `concentric_sample_disk`.
    - Traces a `RayList` with aperture checking enabled through `clip_rays=True` and vignetting enabled through `apply_vignetting=True`.
    - Finite image space returns `RayList.ray_abr` in system dimensions.
    - Infinite image space returns the sampled exiting-ray direction cloud relative to the chief direction in `arcsec`."""
    wavelength_nm = opm["optical_spec"]["wvls"].wavelengths[wvl_idx]

    r2g = (
        sampler.create_generator,
        (sampler.R_2_quasi_random_generator, num_rays ** 2),
        dict(mapper=sampler.concentric_sample_disk),
    )
    ray_list = RayList(
        opm,
        pupil_gen=r2g,
        f=fi,
        wl=wavelength_nm,
        foc=0,
        num_rays=num_rays,
        clip_rays=True,
        apply_vignetting=True,
    )

    afocal = is_afocal_image_space(opm)
    if afocal:
        reference, _ = reference_direction(opm, fi, wavelength_nm)
        angular_points = [
            angular_coordinates(output_segment(ray_pkg)[1], reference)
            for _, _, ray_pkg in ray_list.ray_list
            if ray_pkg is not None
        ]
        x_values = [point[0] for point in angular_points]
        y_values = [point[1] for point in angular_points]
    else:
        x_values = ray_list.ray_abr[0]
        y_values = ray_list.ray_abr[1]

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(x_values),
        "y": _json_float_list(y_values),
        "unitX": "arcsec" if afocal else _system_units(opm),
        "unitY": "arcsec" if afocal else _system_units(opm),
    }
