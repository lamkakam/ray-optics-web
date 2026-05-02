# `python/src/rayoptics_web_utils/analysis/seidel.py`

## Purpose

Extract third-order Seidel aberration data from a RayOptics `OpticalModel`.

## Exports

```python
key_of_3rd_order_seidel_data = Literal["surfaceBySurface", "transverse", "wavefront", "curvature"]
def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]: ...
```

## Return Shape

| Key | Description |
|---|---|
| `surfaceBySurface` | Per-surface Seidel coefficients from `compute_third_order` |
| `transverse` | Transverse aberration from `seidel_to_transverse_aberration` |
| `wavefront` | Wavefront error from `seidel_to_wavefront` |
| `curvature` | Field curvature from `seidel_to_field_curv` |

`surfaceBySurface` contains `aberrTypes`, `surfaceLabels`, and transposed numeric `data`.

## Key Conventions

- Use the `"sum"` row from the third-order package for aggregate transverse, wavefront, and curvature outputs.
- Convert the central wavelength to system units before passing it to `seidel_to_wavefront`.
- Return only JSON-serialisable dict/list data.
