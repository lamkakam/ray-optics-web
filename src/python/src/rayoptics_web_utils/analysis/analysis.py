"""Analysis functions for extracting optical data from a rayoptics model."""

from typing import Literal
import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace
from rayoptics.raytr.trace import trace_boundary_rays_at_field
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
from rayoptics_web_utils.utils import _system_units, _json_float_list, _json_float_grid


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
    def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return t_abr[xy]
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _ray_abr)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _ray_abr)

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
    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            fod = opm['analysis_results']['parax_data'].fod
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _opd_abr)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _opd_abr)

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

def get_diffraction_psf_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict:
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
    effective_max_dims = max(max_dims, 2 * num_rays)
    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    psf = calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, effective_max_dims)
    _, delta_xp = calc_psf_scaling(pupil_grid, pupil_grid.num_rays, effective_max_dims)
    image_scale = delta_xp * effective_max_dims
    axis = np.linspace(-image_scale, image_scale, effective_max_dims)

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


def _diffraction_limited_mtf(freqs, cutoff: float) -> np.ndarray:
    """Return the incoherent circular-pupil diffraction-limited MTF."""
    freqs = np.asarray(freqs, dtype=float)
    if cutoff <= 0.0:
        return np.zeros_like(freqs, dtype=float)

    normalized_freqs = np.abs(freqs) / cutoff
    mtf = np.zeros_like(normalized_freqs, dtype=float)
    inside_cutoff = normalized_freqs <= 1.0
    nu = normalized_freqs[inside_cutoff]
    phi = np.arccos(nu)
    mtf[inside_cutoff] = (2.0 / np.pi) * (phi - nu * np.sqrt(np.clip(1.0 - nu**2, 0.0, 1.0)))
    return mtf


def get_diffraction_mtf_data(
    opm: OpticalModel,
    field_idx: int,
    wvl_idx: int,
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict:
    """
    Return type: {
        'fieldIdx': int,
        'wvlIdx': int,

        'Tangential': {'x': float[], 'y': float[]},
        'Sagittal': {'x': float[], 'y': float[]},
        'IdealTangential': {'x': float[], 'y': float[]},
        'IdealSagittal': {'x': float[], 'y': float[]},

        'unitX': str, // cycles/<system unit>
        'unitY': '',
        'cutoffTangential': float,
        'cutoffSagittal': float,
        'naTangential': float,
        'naSagittal': float,
    }
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

    _, delta_xp = calc_psf_scaling(pupil_grid, pupil_grid.num_rays, effective_max_dims)
    freq_axis = np.fft.fftshift(np.fft.fftfreq(effective_max_dims, d=delta_xp))
    positive_freqs = freq_axis[center_idx:].copy()
    positive_freqs[0] = 0.0

    tangential_mtf = mtf[center_idx:, center_idx]
    sagittal_mtf = mtf[center_idx, center_idx:]

    rim_rays = trace_boundary_rays_at_field(opm, fld, wavelength_nm, use_named_tuples=True)
    na_sagittal = abs(float(rim_rays[1].ray[-2].d[0]))
    na_tangential = abs(float(rim_rays[3].ray[-2].d[1]))
    cutoff_sagittal = 2.0 * na_sagittal / wavelength_sys_units
    cutoff_tangential = 2.0 * na_tangential / wavelength_sys_units

    ideal_tangential = _diffraction_limited_mtf(positive_freqs, cutoff_tangential)
    ideal_sagittal = _diffraction_limited_mtf(positive_freqs, cutoff_sagittal)

    return {
        'fieldIdx': field_idx,
        'wvlIdx': wvl_idx,
        'Tangential': {
            'x': _json_float_list(positive_freqs),
            'y': _json_float_list(tangential_mtf),
        },
        'Sagittal': {
            'x': _json_float_list(positive_freqs),
            'y': _json_float_list(sagittal_mtf),
        },
        'IdealTangential': {
            'x': _json_float_list(positive_freqs),
            'y': _json_float_list(ideal_tangential),
        },
        'IdealSagittal': {
            'x': _json_float_list(positive_freqs),
            'y': _json_float_list(ideal_sagittal),
        },
        'unitX': f"cycles/{_system_units(opm)}",
        'unitY': '',
        'cutoffTangential': float(cutoff_tangential),
        'cutoffSagittal': float(cutoff_sagittal),
        'naTangential': float(na_tangential),
        'naSagittal': float(na_sagittal),
    }
