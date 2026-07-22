"""# `python/src/rayoptics_web_utils/analysis/__init__.py`

The analysis barrel exports `get_surface_semi_diameters` alongside the plot and optical-data helpers.

## Purpose

Re-exports analysis data extraction helpers from their concrete modules for subpackage imports such as:

```python
from rayoptics_web_utils.analysis import get_diffraction_mtf_data
```

## Exports

| Symbol | Source module |
|---|---|
| `get_first_order_data` | `rayoptics_web_utils.analysis.first_order` |
| `get_3rd_order_seidel_data` | `rayoptics_web_utils.analysis.seidel` |
| `get_ray_fan_data` | `rayoptics_web_utils.analysis.ray_fan` |
| `get_opd_fan_data` | `rayoptics_web_utils.analysis.opd_fan` |
| `get_spot_data` | `rayoptics_web_utils.analysis.spot` |
| `get_wavefront_data` | `rayoptics_web_utils.analysis.wavefront` |
| `get_geo_psf_data` | `rayoptics_web_utils.analysis.geometric_psf` |
| `get_diffraction_psf_data` | `rayoptics_web_utils.analysis.diffraction_psf` |
| `get_diffraction_mtf_data` | `rayoptics_web_utils.analysis.diffraction_mtf` |
| `get_strehl_vs_wavelength_data` | `rayoptics_web_utils.analysis.strehl_vs_wavelength` |
| `get_field_curvature_data` | `rayoptics_web_utils.analysis.field_curves` |
| `get_astigmatism_curve_data` | `rayoptics_web_utils.analysis.field_curves` |
| `get_lsa_data` | `rayoptics_web_utils.analysis.longitudinal_spherical_aberration` |

## Key Conventions

- Keep `__all__` synchronized with the imported public helpers.
- This subpackage imports RayOptics-dependent code at module import time; top-level package access should continue to use the lazy import map in `rayoptics_web_utils/__init__.py`.

analysis subpackage: optical data extraction helpers."""

from rayoptics_web_utils.analysis.diffraction_mtf import get_diffraction_mtf_data
from rayoptics_web_utils.analysis.diffraction_psf import get_diffraction_psf_data
from rayoptics_web_utils.analysis.field_curves import get_astigmatism_curve_data, get_field_curvature_data
from rayoptics_web_utils.analysis.first_order import get_first_order_data
from rayoptics_web_utils.analysis.geometric_psf import get_geo_psf_data
from rayoptics_web_utils.analysis.longitudinal_spherical_aberration import get_lsa_data
from rayoptics_web_utils.analysis.opd_fan import get_opd_fan_data
from rayoptics_web_utils.analysis.ray_fan import get_ray_fan_data
from rayoptics_web_utils.analysis.seidel import get_3rd_order_seidel_data
from rayoptics_web_utils.analysis.spot import get_spot_data
from rayoptics_web_utils.analysis.strehl_vs_wavelength import get_strehl_vs_wavelength_data
from rayoptics_web_utils.analysis.wavefront import get_wavefront_data
from rayoptics_web_utils.analysis.surface_semi_diameters import get_surface_semi_diameters

__all__ = [
    "get_first_order_data",
    "get_3rd_order_seidel_data",
    "get_ray_fan_data",
    "get_opd_fan_data",
    "get_spot_data",
    "get_wavefront_data",
    "get_geo_psf_data",
    "get_diffraction_psf_data",
    "get_diffraction_mtf_data",
    "get_strehl_vs_wavelength_data",
    "get_field_curvature_data",
    "get_astigmatism_curve_data",
    "get_lsa_data",
    "get_surface_semi_diameters",
]
