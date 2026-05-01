# `python/src/rayoptics_web_utils/plotting/plotting.py`

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

## Function Details

### `plot_lens_layout(opm, show_ray_fan_vs_wvls=False, is_dark=False)`

Renders the optical layout (cross-section with ray traces) using `InteractiveLayout`.

- By default, creates a figure with `FigureClass=InteractiveLayout`, enabling ray drawing (`do_draw_rays=True`) and disabling paraxial layout (`do_paraxial_layout=False`).
- Forwards `is_dark` to `InteractiveLayout` so the layout can render in light or dark mode.
- When `show_ray_fan_vs_wvls=True`, disables the standard ray/beam overlays and injects an `entity_factory_list` that builds one `RayFanBundle` per configured wavelength for field index `0`.
- The wavelength overlay uses `RayFan(..., xyfan='y')` and the field label from `fov.index_labels[0]`, with each bundle reusing the wavelength render color from the optical model.
- Calls `fig.plot()` then delegates to `_fig_to_base64`.

## Key Conventions

- `_fig_to_base64(fig)` converts and closes the figure.
- This module intentionally does not expose analysis PNG renderers for ray fans, OPD fans, spot diagrams, Seidel charts, wavefront maps, geometrical PSF, or diffraction PSF. Those views use typed data from `rayoptics_web_utils.analysis`.

## Usages

The Pyodide worker calls `plot_lens_layout` for the lens layout image:

```python
from rayoptics_web_utils.plotting import plot_lens_layout

png_base64 = plot_lens_layout(opm)
ray_fan_png = plot_lens_layout(opm, show_ray_fan_vs_wvls=True, is_dark=True)
```
