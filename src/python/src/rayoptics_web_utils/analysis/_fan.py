"""Shared fan tracing helpers."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace

from rayoptics_web_utils.raygrid import _resolve_image_point
from rayoptics_web_utils.analysis._afocal import is_afocal_image_space


def _trace_fan_series(
    opm: OpticalModel,
    fi: int,
    xy: int,
    fan_filter,
    image_point: str = "chief_ray",
) -> tuple[list[list[float]], list[list[float | None]]]:
    """Trace one pupil fan per wavelength and preserve blocked samples as gaps."""
    osp = opm.optical_spec
    fld = osp.field_of_view.fields[fi]
    central_wvl = opm.seq_model.central_wavelength()
    foc = osp.defocus.get_focus()

    image_pt = None if is_afocal_image_space(opm) else _resolve_image_point(
        opm, fi=fi, wavelength_nm=central_wvl, foc=foc,
        num_rays=21, image_point=image_point,
    )
    ref_sphere, chief_ray = trace.setup_pupil_coords(opm, fld, central_wvl, foc, image_pt=image_pt)
    fld.chief_ray = chief_ray
    fld.ref_sphere = ref_sphere
    ref_img_pt = image_pt if image_pt is not None else ref_sphere[0]

    fan_start = np.array([0.0, 0.0])
    fan_stop = np.array([0.0, 0.0])
    fan_start[xy] = -1.0
    fan_stop[xy] = 1.0
    fan_def = [fan_start, fan_stop, 21]

    fans_x: list[list[float]] = []
    fans_y: list[list[float | None]] = []
    for wavelength_nm in osp.spectral_region.wavelengths:
        ref_sphere, chief_ray = trace.setup_pupil_coords(
            opm,
            fld,
            wavelength_nm,
            foc,
            image_pt=ref_img_pt,
        )
        fld.chief_ray = chief_ray
        fld.ref_sphere = ref_sphere
        wavelength_x: list[float] = []
        wavelength_y: list[float | None] = []
        start = np.array(fan_def[0])
        stop = fan_def[1]
        num = fan_def[2]
        step = (stop - start) / (num - 1)
        for _ in range(num):
            pupil = np.array(start)
            ray_result = trace.trace_safe(
                opm,
                pupil,
                fld,
                wavelength_nm,
                output_filter=None,
                rayerr_filter="summary",
                check_apertures=True,
            )
            wavelength_x.append(float(pupil[xy]))
            wavelength_y.append(
                None if ray_result.err is not None or ray_result.pkg is None
                else fan_filter(pupil, xy, ray_result.pkg, fld, wavelength_nm, foc)
            )
            start += step

        fans_x.append(wavelength_x)
        fans_y.append(wavelength_y)

    return fans_x, fans_y
