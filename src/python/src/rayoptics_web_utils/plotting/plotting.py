"""Render optical layouts as base64-encoded PNG images.

Analysis plots intentionally consume typed data in the frontend rather than being
rendered by this module.
"""

import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from rayoptics.environment import (
    OpticalModel,
    InteractiveLayout,
    RayFan,
)
from rayoptics.elem.layout import RayFanBundle

from rayoptics_web_utils.utils import _fig_to_base64


def plot_lens_layout(opm: OpticalModel, show_ray_fan_vs_wvls: bool = False, is_dark: bool = False) -> str:
    """Plot the lens layout and return a base64-encoded PNG.

    Uses ``InteractiveLayout`` with rays enabled and the paraxial layout disabled.
    ``is_dark`` is forwarded to the layout. With wavelength fans enabled, standard
    overlays are replaced by one tangential ``RayFanBundle`` per wavelength at field
    zero, using the model's wavelength colors. The figure is closed after encoding.

    Args:
        opm: RayOptics optical model.
        show_ray_fan_vs_wvls: Whether to overlay wavelength ray fans.
        is_dark: Whether to render with the dark theme.

    Returns:
        Base64-encoded PNG of the lens layout.
    """
    def _create_ray_fan_vs_wvl(fig: Figure, opt_model: OpticalModel, num_rays: int = 21) -> list[RayFanBundle]:
        ray_fan_bundles = []
        _, start_offset = fig.sl_so
        fov = opt_model['optical_spec']['fov']
        fi = 0
        fld = fov.fields[fi]
        fld_label = fov.index_labels[fi]
        wvls = opt_model['optical_spec']['wvls']
        for wl, clr in zip(wvls.wavelengths, wvls.render_colors):
            rayfan = RayFan(opt_model, f=fld, wl=wl, xyfan='y', num_rays=num_rays,
                            label=fld_label, color=clr)
            rb = RayFanBundle(opt_model, rayfan, start_offset)
            ray_fan_bundles.append(rb)
        return ray_fan_bundles

    do_paraxial_layout = False

    if show_ray_fan_vs_wvls is True:
        entity_factory = _create_ray_fan_vs_wvl, (opm,), {'num_rays': 3}
        eflist = [entity_factory]

        fig = plt.figure(
            FigureClass=InteractiveLayout,
            opt_model=opm,
            do_draw_rays=False,
            do_draw_beams=False,
            do_draw_edge_rays=False,
            do_paraxial_layout=do_paraxial_layout,
            is_dark=is_dark,
            entity_factory_list=eflist,
        )
    else:
        fig = plt.figure(
            FigureClass=InteractiveLayout,
            opt_model=opm,
            do_draw_rays=True,
            do_paraxial_layout=do_paraxial_layout,
            is_dark=is_dark,
        )
    fig.plot()
    return _fig_to_base64(fig)
