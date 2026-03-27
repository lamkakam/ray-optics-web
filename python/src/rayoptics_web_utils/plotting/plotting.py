"""Plotting functions for rayoptics models."""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import PowerNorm, LogNorm
import rayoptics.optical.model_constants as mc
from rayoptics.raytr.waveabr import wave_abr_full_calc
from rayoptics.raytr.analyses import (
    RayList,
    calc_psf,
    calc_psf_scaling,
)
from rayoptics.raytr import sampler
from rayoptics.environment import (
    OpticalModel,
    InteractiveLayout,
    compute_third_order,
)

from rayoptics_web_utils.utils import _fig_to_base64, _get_wvl_lbl
from rayoptics_web_utils.raygrid import make_ray_grid


def plot_lens_layout(opm: OpticalModel) -> str:
    """Plot the lens layout and return as base64 PNG."""
    fig = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                     do_draw_rays=True, do_paraxial_layout=False, is_dark=False)
    fig.plot()
    return _fig_to_base64(fig)


def plot_ray_fan(fi: int, opm: OpticalModel) -> str:
    """Plot tangential and sagittal ray fan for a given field index."""
    sm = opm['seq_model']

    def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return t_abr[xy]
        return None

    fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
    for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
        fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_ray_abr, fi, xy)
        for k in range(len(fans_x)):
            ax.plot(fans_x[k], fans_y[k], color=colors[k], label=_get_wvl_lbl(opm, k))
        ax.set_title(title)
        ax.axhline(0, color='black', linewidth=0.5)
        ax.axvline(0, color='black', linewidth=0.5)
        ax.set_xlabel("Pupil Radius (Relative)")
        ax.set_ylabel("Transverse Aberr. (mm)")
        ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-3, 3))
    handles, labels = ax_y.get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=max(len(handles), 1), bbox_to_anchor=(0.5, 0))
    fig.tight_layout(rect=[0, 0.12, 1, 1])
    return _fig_to_base64(fig)


def plot_opd_fan(fi: int, opm: OpticalModel) -> str:
    """Plot tangential and sagittal OPD fan for a given field index."""
    sm = opm['seq_model']

    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            fod = opm['analysis_results']['parax_data'].fod
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            # opd_val is in system units (mm); convert to waves
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
    for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
        fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_opd_abr, fi, xy)
        for k in range(len(fans_x)):
            ax.plot(fans_x[k], fans_y[k], color=colors[k], label=_get_wvl_lbl(opm, k))
        ax.set_title(title)
        ax.axhline(0, color='black', linewidth=0.5)
        ax.axvline(0, color='black', linewidth=0.5)
        ax.set_xlabel("Pupil Radius (Relative)")
        ax.set_ylabel("waves")
        ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-3, 3))
    handles, labels = ax_y.get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=max(len(handles), 1), bbox_to_anchor=(0.5, 0))
    fig.tight_layout(rect=[0, 0.12, 1, 1])
    return _fig_to_base64(fig)


def plot_spot_diagram(fi: int, opm: OpticalModel) -> str:
    """Plot spot diagram for a given field index."""
    sm = opm['seq_model']

    def _spot(p, wi, ray_pkg, fld, wvl, foc):
        if ray_pkg is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return np.array([t_abr[0], t_abr[1]])
        return None

    fig, ax = plt.subplots(1, 1, figsize=(5, 5))
    ax.set_aspect('equal')
    grids, rc = sm.trace_grid(_spot, fi, wl=None, num_rays=21,
                              form='list', append_if_none=False)
    for gi, grid in enumerate(grids):
        x_pts = [pt[0] for pt in grid]
        y_pts = [pt[1] for pt in grid]
        ax.scatter(x_pts, y_pts, s=1, color=rc[gi], label=_get_wvl_lbl(opm, gi))
    ax.set_title(f'Field {fi}')
    ax.set_xlabel("mm")
    ax.set_ylabel("mm")
    ax.legend(loc='center', bbox_to_anchor=(0.5, -0.3), ncol=2)
    ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-2, 2))
    fig.tight_layout()
    return _fig_to_base64(fig)


def plot_surface_by_surface_3rd_order_aberr(opm: OpticalModel) -> str:
    """Plot surface-by-surface 3rd order aberrations as a bar chart."""
    to_pkg = compute_third_order(opm)
    fig, ax = plt.subplots()
    ax.set_xlabel('Surface')
    ax.set_ylabel('3rd Order Aberrations')
    ax.set_title('Surface by Surface 3rd Order Aberrations')
    to_pkg.plot.bar(ax=ax, rot=0)
    ax.grid(True)
    ax.ticklabel_format(axis='y', style='sci', useMathText=True, scilimits=(-3, 3))
    fig.tight_layout()
    return _fig_to_base64(fig)


def plot_wavefront_map(fi: int, wvl_index: int, opm: OpticalModel, num_rays: int = 64) -> str:
    """Plot wavefront OPD map for a given field index, returning base64 PNG."""
    osp = opm['optical_spec']
    central_wvl = osp['wvls'].central_wvl
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    # Trace at central wavelength
    rg = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    opd_grid = rg.grid.copy()
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    opd_grid[2] *= central_wvl / wavelength_nm

    opd = opd_grid[2]

    valid = opd[~np.isnan(opd)]
    max_val = float(max(np.nanmax(valid), -np.nanmin(valid))) if valid.size > 0 else 1.0
    opd_masked = np.ma.masked_invalid(opd)
    data = np.transpose(opd_masked)

    fig, ax = plt.subplots(figsize=(5, 5))
    hmap = ax.imshow(data, origin='lower',
                     vmin=-max_val, vmax=max_val, cmap='RdBu_r')
    
    colorbar = fig.colorbar(hmap, ax=ax, label='waves')
    colorbar.formatter.set_powerlimits((-2, 2))
    colorbar.formatter.set_useMathText(True)

    ax.set_aspect('equal')
    ax.tick_params(labelbottom=False, labelleft=False)
    ax.set_title('Wavefront Map')
    fig.tight_layout()
    return _fig_to_base64(fig)

def plot_geo_psf(fi: int, wvl_index: int, opm: OpticalModel, num_rays: int = 64) -> str:
    """Plot geometrical PSF (2-D histogram) for a given field index, returning base64 PNG."""
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    r2g = (sampler.create_generator,
           (sampler.R_2_quasi_random_generator, num_rays ** 2),
           dict(mapper=sampler.concentric_sample_disk))
    
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

    x_data, y_data = ray_list.ray_abr[0], ray_list.ray_abr[1]
    delta_x = (float(np.nanmax(x_data)) - float(np.nanmin(x_data))) / 2
    delta_y = (float(np.nanmax(y_data)) - float(np.nanmin(y_data))) / 2
    max_delta = max(delta_x, delta_y) if max(delta_x, delta_y) > 0 else 1e-6

    norm = PowerNorm(1.0 / 1.8, vmin=0.0)
    fig, ax = plt.subplots(figsize=(5, 5))
    _, _, _, qmesh = ax.hist2d(
        x_data, y_data, bins=100, norm=norm, cmap='gray',
        range=[[-max_delta, max_delta], [-max_delta, max_delta]]
    )
    ax.set_facecolor(qmesh.cmap(0))
    ax.set_aspect('equal')
    ax.set_xlabel('mm')
    ax.set_ylabel('mm')
    ax.set_title('Geometrical PSF')
    ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-2, 2))
    fig.tight_layout()
    return _fig_to_base64(fig)

def plot_diffraction_psf(
        fi: int,
        wvl_index: int,
        opm: OpticalModel,
        num_rays: int = 64,
        max_dims: int = 256,
    ) -> str:
    """Plot diffraction PSF for a given field index and a wavelength index, returning base64 PNG."""
    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    data = calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, max_dims)
    
    _, delta_xp = calc_psf_scaling(
        pupil_grid,
        pupil_grid.num_rays,
        max_dims,
    )
    image_scale = delta_xp * max_dims
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.set_xlim(-image_scale, image_scale)
    ax.set_ylim(-image_scale, image_scale)
    ax.yaxis.set_ticks_position('left')

    hmap = ax.imshow(
        data,
        origin='lower',
        cmap='RdBu_r',
        norm=LogNorm(vmin=5e-4),
        extent=[
            -image_scale,
            image_scale,
            -image_scale,
            image_scale,
        ],
    )
    fig.colorbar(hmap, ax=ax)
    ax.set_aspect('equal')
    ax.set_xlabel('mm')
    ax.set_ylabel('mm')
    ax.set_title('Diffraction PSF')
    ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-2, 2))
    fig.tight_layout()
    return _fig_to_base64(fig)
