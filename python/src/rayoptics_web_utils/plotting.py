"""Plotting functions for rayoptics models."""

import numpy as np
import matplotlib.pyplot as plt
import rayoptics.optical.model_constants as mc
from rayoptics.raytr.waveabr import wave_abr_full_calc
from rayoptics.environment import (
    OpticalModel,
    InteractiveLayout,
    compute_third_order,
)

from rayoptics_web_utils._utils import _fig_to_base64, _get_wvl_lbl


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
