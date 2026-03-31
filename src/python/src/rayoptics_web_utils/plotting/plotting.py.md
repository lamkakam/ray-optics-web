# `python/src/rayoptics_web_utils/plotting/plotting.py`

## Purpose

Generates matplotlib visualisations of optical system behaviour and returns them as base64-encoded PNG strings for the web client.

## Exports

```python
def plot_lens_layout(opm: OpticalModel) -> str: ...
def plot_ray_fan(fi: int, opm: OpticalModel) -> str: ...
def plot_opd_fan(fi: int, opm: OpticalModel) -> str: ...
def plot_spot_diagram(fi: int, opm: OpticalModel) -> str: ...
def plot_surface_by_surface_3rd_order_aberr(opm: OpticalModel) -> str: ...
```

All functions return a base64-encoded PNG string.

## Function Details

### `plot_lens_layout(opm)`

Renders the optical layout (cross-section with ray traces) using `InteractiveLayout`.

- Creates a figure with `FigureClass=InteractiveLayout`, enabling ray drawing (`do_draw_rays=True`) and disabling paraxial layout (`do_paraxial_layout=False`).
- Calls `fig.plot()` then delegates to `_fig_to_base64`.

### `plot_ray_fan(fi, opm)`

Plots tangential and sagittal transverse ray fans for field index `fi` (zero-indexed).

- Defines a local `_ray_abr` callback that computes the transverse aberration at the image plane accounting for defocus.
- Calls `sm.trace_fan(_ray_abr, fi, xy)` for both tangential (`xy=1`) and sagittal (`xy=0`) fans.
- Produces a 1×2 subplot figure (8×4 inches); each subplot shows per-wavelength curves.
- Wavelength labels are produced by `_get_wvl_lbl`.
- Legend is placed below the figure via `fig.legend(..., loc='lower center')`.

### `plot_opd_fan(fi, opm)`

Plots tangential and sagittal OPD (optical path difference) fans for field index `fi` (zero-indexed).

- Defines a local `_opd_abr` callback that calls `wave_abr_full_calc` and converts the result from system units to waves (`opd_val / opm.nm_to_sys_units(wvl)`; `wvl` is in nm, `opd_val` in system units).
- Layout identical to `plot_ray_fan` (1×2 subplot, 8×4 inches, per-wavelength curves, shared legend).
- Y-axis label is `"waves"`.

### `plot_spot_diagram(fi, opm)`

Plots a scatter spot diagram for field index `fi` (zero-indexed).

- Defines a local `_spot` callback returning a 2-element array `[x_abr, y_abr]`.
- Calls `sm.trace_grid(_spot, fi, wl=None, num_rays=21, form='list', append_if_none=False)`.
- Plots each wavelength grid as a separate scatter series (point size `s=1`).
- Single square subplot (5×5 inches) with equal aspect ratio.
- Y-axis label is `"mm"`.

### `plot_surface_by_surface_3rd_order_aberr(opm)`

Plots a grouped bar chart of per-surface third-order Seidel aberration coefficients.

- Calls `compute_third_order(opm)` to obtain the DataFrame.
- Uses `DataFrame.plot.bar(ax=ax, rot=0)` to produce grouped bars per surface.
- Y-axis formatted with scientific notation.
- Field independent — operates on the full optical model.

## Key Conventions

- Field index `fi` is zero-indexed across all functions that accept it.
- All functions end by calling `_fig_to_base64(fig)`, which also closes the figure via `plt.close(fig)`.
- The `_ray_abr` and `_opd_abr` callbacks return `None` for failed ray traces (`ray_pkg[mc.ray] is None`); `trace_fan` skips `None` returns.
- OPD unit conversion: `opd_val` from `wave_abr_full_calc` is in system units; divide by `opm.nm_to_sys_units(wvl)` to get waves.
- `plot_wavefront_map` and `plot_diffraction_psf` use `make_ray_grid` from `rayoptics_web_utils.raygrid` instead of constructing `RayGrid` directly.
- `_fig_to_base64` and `_get_wvl_lbl` are imported from `rayoptics_web_utils.utils`.

## Usages

All plotting functions are called from the Pyodide worker (`workers/pyodide.worker.ts`) and return base64-encoded PNG strings for transmission to the frontend.

### `plot_lens_layout`

Renders the optical system cross-section with ray traces:

```python
from rayoptics_web_utils.plotting import plot_lens_layout

png_base64 = plot_lens_layout(opm)
# Returns: "iVBORw0KGgoAAAANS..." (base64-encoded PNG string)
```

### `plot_ray_fan`, `plot_opd_fan`, `plot_spot_diagram`

Render aberration plots for a specific field index:

```python
from rayoptics_web_utils.plotting import plot_ray_fan, plot_opd_fan, plot_spot_diagram

field_index = 0  # Zero-indexed field
ray_fan_png = plot_ray_fan(field_index, opm)
opd_fan_png = plot_opd_fan(field_index, opm)
spot_diagram_png = plot_spot_diagram(field_index, opm)
# Each returns: "iVBORw0KGgoAAAANS..." (base64-encoded PNG string)
```

### `plot_surface_by_surface_3rd_order_aberr`

Renders per-surface Seidel aberration bar chart:

```python
from rayoptics_web_utils.plotting import plot_surface_by_surface_3rd_order_aberr

aberr_png = plot_surface_by_surface_3rd_order_aberr(opm)
# Returns: "iVBORw0KGgoAAAANS..." (base64-encoded PNG string)
```

### `plot_wavefront_map`, `plot_geo_psf`, `plot_diffraction_psf`

Render wavefront and PSF analysis plots for a specific field and wavelength:

```python
from rayoptics_web_utils.plotting import plot_wavefront_map, plot_geo_psf, plot_diffraction_psf

field_index = 0
wavelength_index = 0
num_rays = 128

wavefront_png = plot_wavefront_map(field_index, wavelength_index, opm, num_rays=num_rays)
geo_psf_png = plot_geo_psf(field_index, wavelength_index, opm, num_rays=num_rays)
diffr_psf_png = plot_diffraction_psf(field_index, wavelength_index, opm, num_rays=num_rays, max_dims=256)
# Each returns: "iVBORw0KGgoAAAANS..." (base64-encoded PNG string)
```

All functions are imported and exposed via Comlink RPC in the Pyodide web worker.
