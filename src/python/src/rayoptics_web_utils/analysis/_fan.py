"""Shared fan tracing helpers."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace


def _trace_fan_series(opm: OpticalModel, fi: int, xy: int, fan_filter) -> tuple[list[list[float]], list[list[float]]]:
    """Trace one pupil fan per wavelength while preserving ragged sample counts."""
    osp = opm.optical_spec
    fld = osp.field_of_view.fields[fi]
    central_wvl = opm.seq_model.central_wavelength()
    foc = osp.defocus.get_focus()

    ref_sphere, chief_ray = trace.setup_pupil_coords(opm, fld, central_wvl, foc)
    fld.chief_ray = chief_ray
    fld.ref_sphere = ref_sphere
    ref_img_pt = ref_sphere[0]

    fan_start = np.array([0.0, 0.0])
    fan_stop = np.array([0.0, 0.0])
    fan_start[xy] = -1.0
    fan_stop[xy] = 1.0
    fan_def = [fan_start, fan_stop, 21]

    fans_x: list[list[float]] = []
    fans_y: list[list[float]] = []
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
        fan = trace.trace_fan(
            opm,
            fan_def,
            fld,
            wavelength_nm,
            foc,
            img_filter=lambda pupil, ray_pkg: fan_filter(pupil, xy, ray_pkg, fld, wavelength_nm, foc),
        )

        fans_x.append([float(pupil[xy]) for pupil, _ in fan])
        fans_y.append([float(value) for _, value in fan])

    return fans_x, fans_y
