# `python/src/rayoptics_web_utils/plotting.py`

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

- Defines a local `_opd_abr` callback that calls `wave_abr_full_calc` and converts the result from mm to waves (`opd_val / wvl * 1e6`; `wvl` is in nm, `opd_val` in mm).
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
- OPD unit conversion: `opd_val` from `wave_abr_full_calc` is in mm; `wvl` is in nm → multiply by `1e6` to get waves.

## Dependencies

- `numpy` — array arithmetic in `_spot` callback
- `matplotlib.pyplot` — figure/axes creation
- `rayoptics.optical.model_constants` (`mc`) — `mc.ray`, `mc.p`, `mc.d` indices
- `rayoptics.raytr.waveabr.wave_abr_full_calc` — OPD computation
- `rayoptics.environment.OpticalModel` — type annotation
- `rayoptics.environment.InteractiveLayout` — lens layout figure class
- `rayoptics.environment.compute_third_order` — Seidel DataFrame
- `rayoptics_web_utils._utils._fig_to_base64` — PNG serialisation
- `rayoptics_web_utils._utils._get_wvl_lbl` — wavelength legend labels

## Usages

- `workers/pyodide.worker.ts` — `_plotLensLayout`, `_plotRayFan`, `_plotOpdFan`, `_plotSpotDiagram`, `_plotSurfaceBySurface3rdOrderAberr` each call the corresponding function and return the base64 string directly to the TypeScript caller.
