"""Geometric PSF point-cloud data extraction."""

from rayoptics.environment import OpticalModel
from rayoptics.raytr import sampler
from rayoptics.raytr.analyses import RayList

from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
    Return geometric PSF point-cloud data for one field and wavelength.
    """
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
        check_apertures=True,
        apply_vignetting=True,
    )

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(ray_list.ray_abr[0]),
        "y": _json_float_list(ray_list.ray_abr[1]),
        "unitX": _system_units(opm),
        "unitY": _system_units(opm),
    }
