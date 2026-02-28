---
name: rayoptics-api
description: How to get results from rayoptics via pyodide
---

## Paraxial Data

### First order properties

- Object (key-value pairs) for first-order data is `opm['parax_model'].opt_model['analysis_results']['parax_data'].fod`. Always convert the values to float before calling `json.dumps`

- Never use `pm.first_order_data()` as it won't work in pyodide

## Ray Fan & OPD Fan Data

Source: `rayoptics.mpl.axisarrayfigure.RayFanFigure` and `rayoptics.seq.sequential.SequentialModel.trace_fan`

### How to get raw data (no matplotlib needed)

Use `seq_model.trace_fan(fct, fi, xy, num_rays=21)` directly.

#### Parameters

| Param | Type | Description |
|---|---|---|
| `fct` | callable | Evaluation function (see below) |
| `fi` | int | Field index (0-based, into `osp.field_of_view.fields`) |
| `xy` | int | 0 = fan along pupil X (returns X-aberration), 1 = fan along pupil Y (returns Y-aberration) |
| `num_rays` | int | Number of sample points across pupil (default 21) |

#### Return value

`trace_fan` returns a tuple of 4 elements:

| Index | Name | Shape / Type | Description |
|---|---|---|---|
| 0 | `fans_x` | `np.array (num_wvls, num_rays)` | Normalized pupil coordinates (-1 to +1) |
| 1 | `fans_y` | `np.array (num_wvls, num_rays)` | Aberration values at each pupil sample |
| 2 | `max_value` | `tuple (max_rho, max_y)` | Max pupil coord and max aberration |
| 3 | `rc` | `list of RGB tuples` | Render color per wavelength |

Wavelengths are iterated from `osp.spectral_region.wavelengths`. Each row in `fans_x`/`fans_y` corresponds to one wavelength.

#### Evaluation functions

The evaluation function signature is `fct(p, xy, ray_pkg, fld, wvl, foc)` and returns a scalar or `None`.

**Transverse ray aberration** (in system length units, typically mm):

```python
import rayoptics.optical.model_constants as mc

def ray_abr(p, xy, ray_pkg, fld, wvl, foc):
    if ray_pkg[mc.ray] is not None:
        image_pt = fld.ref_sphere[0]
        ray = ray_pkg[mc.ray]
        dist = foc / ray[-1][mc.d][2]
        defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
        t_abr = defocused_pt - image_pt
        return t_abr[xy]
    return None
```

**OPD** (in waves):

```python
from rayoptics.raytr.waveabr import wave_abr_full_calc
import rayoptics.optical.model_constants as mc

def opd(p, xy, ray_pkg, fld, wvl, foc):
    if ray_pkg[mc.ray] is not None:
        fod = opt_model['analysis_results']['parax_data'].fod
        opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg,
                                     fld.chief_ray, fld.ref_sphere)
        convert_to_waves = 1 / opt_model.nm_to_sys_units(wvl)
        return convert_to_waves * opd_val
    return None
```

#### Complete usage example

```python
import numpy as np
from rayoptics.raytr.waveabr import wave_abr_full_calc
import rayoptics.optical.model_constants as mc

osp = opt_model.optical_spec
seq_model = opt_model.seq_model

# Define evaluation functions (ray_abr and opd as shown above)

num_rays = 21
num_flds = len(osp.field_of_view.fields)

for fi in range(num_flds):
    for xy in [0, 1]:  # 0=X-fan, 1=Y-fan
        # Ray aberration
        fans_x, fans_y, (max_rho, max_val), colors = \
            seq_model.trace_fan(ray_abr, fi, xy, num_rays=num_rays)

        # OPD
        opd_x, opd_y, (opd_max_rho, opd_max_val), opd_colors = \
            seq_model.trace_fan(opd, fi, xy, num_rays=num_rays)

        # fans_x[wi] = array of pupil coords for wavelength wi
        # fans_y[wi] = array of aberration values for wavelength wi
```

### Internal flow

1. `trace_fan` calls `trace.setup_pupil_coords()` to compute `fld.chief_ray` and `fld.ref_sphere` for each wavelength.
2. It builds a linear fan from pupil coord -1 to +1 with `num_rays` samples.
3. For each sample, it calls `trace.trace_fan()` → `trace_safe()` to trace the ray, then applies `fct` as an image filter.
4. Failed rays (total internal reflection, etc.) are skipped — they won't appear in the output arrays.

### RayFanFigure column convention

`RayFanFigure` always creates 2 columns: column `j=0` is the X-fan, column `j=1` is the Y-fan. It iterates fields in reversed order (highest field first at top). The `data_type` parameter selects between `'Ray'` and `'OPD'`.

### Smoothing (optional)

`RayFanFigure.update_data()` optionally applies cubic spline interpolation:

```python
from scipy.interpolate import interp1d

interpolator = interp1d(fans_x[wi], fans_y[wi], kind='cubic', assume_sorted=True)
x_smooth = np.linspace(fans_x[wi].min(), fans_x[wi].max(), 100)
y_smooth = interpolator(x_smooth)
```


