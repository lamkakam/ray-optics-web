# `python/src/rayoptics_web_utils/analysis/strehl_vs_wavelength.py`

## Purpose

Return chart-ready monochromatic Strehl ratio data sampled across wavelength for one field.

## Exports

```python
def get_strehl_vs_wavelength_data(
    opm: OpticalModel,
    fieldIndex: int,
    wavelength_samples: int = 32,
    num_rays: int = 21,
    opd_aim_point: str = "chief_ray",
) -> dict: ...
```

## Return Shape

| Field | Description |
|---|---|
| `fieldIdx` | Requested field index |
| `x` | Sampled wavelengths as floats |
| `y` | Strehl ratios as floats |
| `unitX` | `"nm"` |
| `unitY` | `""` |

## Key Conventions

- Uses `opm["optical_spec"]["wvls"].wavelengths` as the configured wavelength source.
- If two or more distinct wavelengths are configured, samples uniformly from the shortest to the longest configured wavelength.
- If one wavelength is configured, or all configured wavelengths repeat the same value, samples uniformly from `center - 200 nm` to `center + 200 nm`, clipping the lower bound to `201 nm` when `center - 200 nm` would be too low.
- Temporarily extends the model spectral region with the sampled wavelengths, while preserving the original central wavelength as the reference, because RayOptics traces only wavelengths present in the sequential model index table.
- Restores the original wavelength list, weights, and reference wavelength after tracing, including when tracing raises.
- Uses `make_ray_grid(opm, fi=fieldIndex, wavelength_nm=wavelength, num_rays=num_rays, opd_aim_point=opd_aim_point)` for each sample.
- Uses `_scale_opd_grid_to_wavelength(ray_grid.grid[2], ...)` and `_monochromatic_strehl(...)` from the Zernike module. This path consumes only OPD samples and does not extract exit-pupil coordinates, while preserving OPD wavelength scaling via `opm.nm_to_sys_units(...)`.
- Returns plain Python `float` values for wavelength and Strehl samples so the result is JSON encodable.
