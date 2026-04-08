"""Plotting functions for rayoptics models."""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.colors import PowerNorm, LogNorm
from rayoptics.environment import (
    OpticalModel,
    InteractiveLayout,
)

from rayoptics_web_utils.utils import _fig_to_base64, _get_wvl_lbl
from rayoptics_web_utils.analysis import (
    get_3rd_order_seidel_data,
    get_ray_fan_data,
    get_opd_fan_data,
    get_spot_data,
    get_wavefront_data,
    get_geo_psf_data,
    get_diffraction_psf_data,
)


def plot_lens_layout(opm: OpticalModel) -> str:
    """Plot the lens layout and return as base64 PNG."""
    fig = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                     do_draw_rays=True, do_paraxial_layout=False, is_dark=False)
    fig.plot()
    return _fig_to_base64(fig)


def plot_ray_fan(fi: int, opm: OpticalModel) -> str:
    """Plot tangential and sagittal ray fan for a given field index."""
    fan_data = get_ray_fan_data(opm, fi)
    fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
    for key, ax, title in [('Tangential', ax_y, 'Tangential'), ('Sagittal', ax_x, 'Sagittal')]:
        for entry in fan_data:
            ax.plot(
                entry[key]['x'],
                entry[key]['y'],
                color=opm['optical_spec']['wvls'].render_colors[entry['wvlIdx']],
                label=_get_wvl_lbl(opm, entry['wvlIdx']),
            )
        ax.set_title(title)
        ax.axhline(0, color='black', linewidth=0.5)
        ax.axvline(0, color='black', linewidth=0.5)
        ax.set_xlabel("Pupil Radius (Relative)")
        ax.set_ylabel(f"Transverse Aberr. ({fan_data[0]['unitY']})")
        ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-3, 3))
    handles, labels = ax_y.get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=max(len(handles), 1), bbox_to_anchor=(0.5, 0))
    fig.tight_layout(rect=[0, 0.12, 1, 1])
    return _fig_to_base64(fig)


def plot_opd_fan(fi: int, opm: OpticalModel) -> str:
    """Plot tangential and sagittal OPD fan for a given field index."""
    fan_data = get_opd_fan_data(opm, fi)
    fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
    for key, ax, title in [('Tangential', ax_y, 'Tangential'), ('Sagittal', ax_x, 'Sagittal')]:
        for entry in fan_data:
            ax.plot(
                entry[key]['x'],
                entry[key]['y'],
                color=opm['optical_spec']['wvls'].render_colors[entry['wvlIdx']],
                label=_get_wvl_lbl(opm, entry['wvlIdx']),
            )
        ax.set_title(title)
        ax.axhline(0, color='black', linewidth=0.5)
        ax.axvline(0, color='black', linewidth=0.5)
        ax.set_xlabel("Pupil Radius (Relative)")
        ax.set_ylabel(fan_data[0]['unitY'])
        ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-3, 3))
    handles, labels = ax_y.get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=max(len(handles), 1), bbox_to_anchor=(0.5, 0))
    fig.tight_layout(rect=[0, 0.12, 1, 1])
    return _fig_to_base64(fig)


def plot_spot_diagram(fi: int, opm: OpticalModel) -> str:
    """Plot spot diagram for a given field index."""
    spot_data = get_spot_data(opm, fi)
    fig, ax = plt.subplots(1, 1, figsize=(5, 5))
    ax.set_aspect('equal')
    for entry in spot_data:
        ax.scatter(
            entry['x'],
            entry['y'],
            s=1,
            color=opm['optical_spec']['wvls'].render_colors[entry['wvlIdx']],
            label=_get_wvl_lbl(opm, entry['wvlIdx']),
        )
    ax.set_title(f'Field {fi}')
    ax.set_xlabel(spot_data[0]['unitX'])
    ax.set_ylabel(spot_data[0]['unitY'])
    ax.legend(loc='center', bbox_to_anchor=(0.5, -0.3), ncol=2)
    ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-2, 2))
    fig.tight_layout()
    return _fig_to_base64(fig)


def plot_surface_by_surface_3rd_order_aberr(opm: OpticalModel) -> str:
    """Plot surface-by-surface 3rd order aberrations as a bar chart."""
    sbs = get_3rd_order_seidel_data(opm)['surfaceBySurface']
    to_pkg = pd.DataFrame(sbs['data'], index=sbs['aberrTypes'], columns=sbs['surfaceLabels']).T
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
    wavefront_data = get_wavefront_data(opm, fi, wvl_index, num_rays)
    opd = np.array(wavefront_data['z'], dtype=float).T
    valid = opd[~np.isnan(opd)]
    max_val = float(max(np.nanmax(valid), -np.nanmin(valid))) if valid.size > 0 else 1.0
    opd_masked = np.ma.masked_invalid(opd)
    data = np.transpose(opd_masked)

    fig, ax = plt.subplots(figsize=(5, 5))
    hmap = ax.imshow(data, origin='lower',
                     vmin=-max_val, vmax=max_val, cmap='RdBu_r')
    
    colorbar = fig.colorbar(hmap, ax=ax, label=wavefront_data['unitZ'])
    colorbar.formatter.set_powerlimits((-2, 2))
    colorbar.formatter.set_useMathText(True)

    ax.set_aspect('equal')
    ax.tick_params(labelbottom=False, labelleft=False)
    ax.set_title('Wavefront Map')
    fig.tight_layout()
    return _fig_to_base64(fig)

def plot_geo_psf(fi: int, wvl_index: int, opm: OpticalModel, num_rays: int = 64) -> str:
    """Plot geometrical PSF (2-D histogram) for a given field index, returning base64 PNG."""
    psf_data = get_geo_psf_data(opm, fi, wvl_index, num_rays)
    x_data = psf_data['x']
    y_data = psf_data['y']
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
    ax.set_xlabel(psf_data['unitX'])
    ax.set_ylabel(psf_data['unitY'])
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
    psf_data = get_diffraction_psf_data(opm, fi, wvl_index, num_rays, max_dims)
    data = np.array(psf_data['z'], dtype=float)
    image_scale = max(abs(psf_data['x'][0]), abs(psf_data['x'][-1]))
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
    ax.set_xlabel(psf_data['unitX'])
    ax.set_ylabel(psf_data['unitY'])
    ax.set_title('Diffraction PSF')
    ax.ticklabel_format(style='sci', useMathText=True, scilimits=(-2, 2))
    fig.tight_layout()
    return _fig_to_base64(fig)
