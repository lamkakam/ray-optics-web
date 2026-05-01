# `python/src/rayoptics_web_utils/analysis/__init__.py`

## Purpose

Re-exports analysis data extraction helpers from `analysis.py` for subpackage imports such as:

```python
from rayoptics_web_utils.analysis import get_diffraction_mtf_data
```

## Exports

| Symbol | Source module |
|---|---|
| `get_first_order_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_3rd_order_seidel_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_ray_fan_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_opd_fan_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_spot_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_wavefront_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_geo_psf_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_diffraction_psf_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_diffraction_mtf_data` | `rayoptics_web_utils.analysis.analysis` |

## Key Conventions

- Keep `__all__` synchronized with the imported public helpers.
- This subpackage imports RayOptics-dependent code at module import time; top-level package access should continue to use the lazy import map in `rayoptics_web_utils/__init__.py`.
