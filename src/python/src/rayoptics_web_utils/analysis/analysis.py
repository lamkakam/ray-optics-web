"""Analysis functions for extracting optical data from a rayoptics model."""

from typing import Literal
import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.waveabr import wave_abr_full_calc
from rayoptics.raytr.analyses import RayList, calc_psf, calc_psf_scaling
from rayoptics.raytr import sampler

from rayoptics.parax.thirdorder import (
    compute_third_order,
    seidel_to_transverse_aberration,
    seidel_to_wavefront,
    seidel_to_field_curv,
)

from rayoptics_web_utils.raygrid import make_ray_grid


def _system_units(opm: OpticalModel) -> str:
    return opm.system_spec.dimensions


def _json_float(value) -> float | None:
    value = float(value)
    if np.isnan(value):
        return None
    return value


def _json_float_list(values) -> list[float]:
    return [float(value) for value in values]


def _json_float_grid(values) -> list[list[float | None]]:
    return [[_json_float(value) for value in row] for row in values]


def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data as a dict of floats."""
    pm = opm['parax_model']
    fod = pm.opt_model['analysis_results']['parax_data'].fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}

key_of_3rd_order_seidel_data = Literal['surfaceBySurface', 'transverse', 'wavefront', 'curvature']
def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]:
    """Return 3rd-order Seidel aberration data as a dict."""
    to_pkg = compute_third_order(opm)
    fod = opm['analysis_results']['parax_data'].fod
    wvls = opm['optical_spec']['wvls']
    seidel_sum = to_pkg.loc['sum']
    surface_by_surface = {
        'aberrTypes': to_pkg.columns.tolist(),
        'surfaceLabels': to_pkg.index.tolist(),
        'data': to_pkg.T.values.tolist(),
    }
    transverse = seidel_to_transverse_aberration(seidel_sum, fod.n_img, fod.img_na)
    wavefront = seidel_to_wavefront(seidel_sum, opm.nm_to_sys_units(wvls.central_wvl))
    curvature = seidel_to_field_curv(seidel_sum, fod.n_img, fod.opt_inv)
    return {
        'surfaceBySurface': surface_by_surface,
        'transverse': transverse.to_dict(),
        'wavefront': wavefront.to_dict(),
        'curvature': curvature.to_dict(),
    }


def get_ray_fan_data(opm: OpticalModel, fi: int) -> list[dict]:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[], // Sagittal
        'y': float[], // Tangential

        'unitX': '', // relative
        'unitY': str, // from opm.system_spec.dimensions
    }[] // array idx: wvl idx
    """
    sm = opm.seq_model

    def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return t_abr[xy]
        return None

    sagittal_x, sagittal_y, _, _ = sm.trace_fan(_ray_abr, fi, 0)
    tangential_x, tangential_y, _, _ = sm.trace_fan(_ray_abr, fi, 1)

    data: list[dict] = []
    for wvl_idx in range(len(sagittal_x)):
        data.append({
            'fieldIdx': fi,
            'wvlIdx': wvl_idx,
            'Sagittal': {
                'x': _json_float_list(sagittal_x[wvl_idx]),
                'y': _json_float_list(sagittal_y[wvl_idx]),
            },
            'Tangential': {
                'x': _json_float_list(tangential_x[wvl_idx]),
                'y': _json_float_list(tangential_y[wvl_idx]),
            },
            'unitX': '',
            'unitY': _system_units(opm),
        })
    return data

def get_opd_fan_data(opm: OpticalModel, fi: int) -> list[dict]:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[], // Sagittal
        'y': float[], // Tangential

        'unitX': '', // relative
        'unitY': 'waves',
    }[] // array idx: wvl idx
    """
    sm = opm.seq_model

    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            fod = opm['analysis_results']['parax_data'].fod
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    sagittal_x, sagittal_y, _, _ = sm.trace_fan(_opd_abr, fi, 0)
    tangential_x, tangential_y, _, _ = sm.trace_fan(_opd_abr, fi, 1)

    data: list[dict] = []
    for wvl_idx in range(len(sagittal_x)):
        data.append({
            'fieldIdx': fi,
            'wvlIdx': wvl_idx,
            'Sagittal': {
                'x': _json_float_list(sagittal_x[wvl_idx]),
                'y': _json_float_list(sagittal_y[wvl_idx]),
            },
            'Tangential': {
                'x': _json_float_list(tangential_x[wvl_idx]),
                'y': _json_float_list(tangential_y[wvl_idx]),
            },
            'unitX': '',
            'unitY': 'waves',
        })
    return data


def get_spot_data(opm: OpticalModel, fi: int) -> list[dict]:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[], // Sagittal
        'y': float[], // Tangential

        'unitX': str, // from opm.system_spec.dimensions
        'unitY': str, // from opm.system_spec.dimensions
    }[] // array idx: wvl idx
    """
    sm = opm.seq_model

    def _spot(p, wi, ray_pkg, fld, wvl, foc):
        if ray_pkg is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return np.array([t_abr[0], t_abr[1]])
        return None

    grids, _ = sm.trace_grid(_spot, fi, wl=None, num_rays=21, form='list', append_if_none=False)

    data: list[dict] = []
    for wvl_idx, grid in enumerate(grids):
        data.append({
            'fieldIdx': fi,
            'wvlIdx': wvl_idx,
            'x': _json_float_list([point[0] for point in grid]),
            'y': _json_float_list([point[1] for point in grid]),
            'unitX': _system_units(opm),
            'unitY': _system_units(opm),
        })
    return data

def get_wavefront_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[],
        'y': float[],
        'z': float[],

        'unitX': '', // relative
        'unitY': '', // relative
        'unitZ': 'waves',
    }
    """
    osp = opm.optical_spec
    central_wvl = osp['wvls'].central_wvl
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_idx]
    ray_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    opd_grid = ray_grid.grid.copy()
    opd_grid[2] *= central_wvl / wavelength_nm

    return {
        'fieldIdx': fi,
        'wvlIdx': wvl_idx,
        'x': _json_float_list(ray_grid.grid[0, :, 0]),
        'y': _json_float_list(ray_grid.grid[1, 0, :]),
        'z': _json_float_grid(np.transpose(opd_grid[2])),
        'unitX': '',
        'unitY': '',
        'unitZ': 'waves',
    }

def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[],
        'y': float[],

        'unitX': str, // from opm.system_spec.dimensions
        'unitY': str, // from opm.system_spec.dimensions
    }
    """
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_idx]

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
        'fieldIdx': fi,
        'wvlIdx': wvl_idx,
        'x': _json_float_list(ray_list.ray_abr[0]),
        'y': _json_float_list(ray_list.ray_abr[1]),
        'unitX': _system_units(opm),
        'unitY': _system_units(opm),
    }

def get_diffraction_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'x': float[],
        'y': float[],
        'z': float[],

        'unitX': str, // from opm.system_spec.dimensions
        'unitY': str, // from opm.system_spec.dimensions
        'unitZ': '', // relative
    }
    """
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_idx]
    max_dims = max(256, num_rays)
    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    psf = calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, max_dims)
    _, delta_xp = calc_psf_scaling(pupil_grid, pupil_grid.num_rays, max_dims)
    image_scale = delta_xp * max_dims
    axis = np.linspace(-image_scale, image_scale, max_dims)

    return {
        'fieldIdx': fi,
        'wvlIdx': wvl_idx,
        'x': _json_float_list(axis),
        'y': _json_float_list(axis),
        'z': _json_float_grid(psf),
        'unitX': _system_units(opm),
        'unitY': _system_units(opm),
        'unitZ': '',
    }
