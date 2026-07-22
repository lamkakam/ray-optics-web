"""# `python/src/rayoptics_web_utils/plotting/plotting.py`

## Function Details

## Key Conventions

- `_fig_to_base64(fig)` converts and closes the figure.
- This module intentionally does not expose analysis PNG renderers for ray fans, OPD fans, spot diagrams, Seidel charts, wavefront maps, geometrical PSF, or diffraction PSF. Those views use typed data from `rayoptics_web_utils.analysis`.

Plotting functions for rayoptics models."""

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
    """Plot the lens layout and return as base64 PNG.

    ## Purpose

    Generates the remaining matplotlib-rendered image used by the web client: the optical lens layout. Analysis chart data is produced by `rayoptics_web_utils.analysis` and rendered in the frontend.

    ## Exports

    ```python
    def plot_lens_layout(
        opm: OpticalModel,
        show_ray_fan_vs_wvls: bool = False,
        is_dark: bool = False,
    ) -> str: ...
    ```

    `plot_lens_layout` returns a base64-encoded PNG string.

    ### `plot_lens_layout(opm, show_ray_fan_vs_wvls=False, is_dark=False)`

    Renders the optical layout (cross-section with ray traces) using `InteractiveLayout`.

    - By default, creates a figure with `FigureClass=InteractiveLayout`, enabling ray drawing (`do_draw_rays=True`) and disabling paraxial layout (`do_paraxial_layout=False`).
    - Forwards `is_dark` to `InteractiveLayout` so the layout can render in light or dark mode.
    - When `show_ray_fan_vs_wvls=True`, disables the standard ray/beam overlays and injects an `entity_factory_list` that builds one `RayFanBundle` per configured wavelength for field index `0`.
    - The wavelength overlay uses `RayFan(..., xyfan='y')` and the field label from `fov.index_labels[0]`, with each bundle reusing the wavelength render color from the optical model.
    - Calls `fig.plot()` then delegates to `_fig_to_base64`.

    ## Usages

    The Pyodide worker calls `plot_lens_layout` for the lens layout image:

    ```python
    from rayoptics_web_utils.plotting import plot_lens_layout

    png_base64 = plot_lens_layout(opm)
    ray_fan_png = plot_lens_layout(opm, show_ray_fan_vs_wvls=True, is_dark=True)
    ```"""
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
