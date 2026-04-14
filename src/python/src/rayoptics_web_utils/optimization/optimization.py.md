# `python/src/rayoptics_web_utils/optimization/optimization.py`

## Purpose

Provides a dict-driven optimizer framework for RayOptics `OpticalModel` instances. The public API accepts JSON-encodable config dicts, supports affine pickups for radius and thickness, evaluates operand-based merit functions, and runs SciPy least-squares optimization.

## Public API

```python
evaluate_optimization_problem(opm, config: dict) -> dict
optimize_opm(opm, config: dict) -> dict
```

Both return JSON-serialisable dicts containing:

- `success`
- `status`
- `message`
- `optimizer`
- `initial_values`
- `final_values`
- `pickups`
- `residuals`
- `merit_function`

## Config Shape

```python
{
  "optimizer": {
    "kind": "least_squares",
    "method": "trf",
    "ftol": 1e-8,
    "xtol": 1e-8,
    "gtol": 1e-8,
    "max_nfev": 200
  },
  "variables": [
    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0}
  ],
  "pickups": [
    {"kind": "radius", "surface_index": 2, "source_surface_index": 1, "scale": -1.0, "offset": 0.0}
  ],
  "merit_function": {
    "operands": [
      {
        "kind": "rms_spot_size",
        "target": 0.0,
        "weight": 1.0,
        "fields": [{"index": 0, "weight": 1.0}],
        "wavelengths": [{"index": 1, "weight": 1.0}],
        "options": {"num_rays": 21}
      }
    ]
  }
}
```

## Supported Kinds

### Optimizer

- `least_squares`

### Variables / Pickups

- `radius` — reads/writes `opm["seq_model"].ifcs[surface_index].profile.r`
- `thickness` — reads/writes `opm["seq_model"].gaps[surface_index].thi`

### Operands

- `rms_spot_size`
- `rms_wavefront_error`
- `opd_difference`
- `focal_length`
- `f_number`

## Weighting Rules

- `focal_length` and `f_number` are field-independent and wavelength-independent; any `fields` or `wavelengths` entries are ignored.
- Field-dependent operands expand into one residual per selected field/wavelength pair.
- `opd_difference` reuses `rayoptics_web_utils.analysis.get_opd_fan_data(opm, fi)` and computes one scalar per field/wavelength sample as `mean(abs(OPD_i - mean(OPD)))` across the combined tangential and sagittal OPD fan ordinates, after dropping non-finite values.
- Each residual uses:

```python
total_weight = operand_weight * sqrt(field_weight) * sqrt(wavelength_weight)
weighted_residual = total_weight * (actual_value - target)
```

- `merit_function["sum_of_squares"]` is the sum of squared weighted residuals.
- `merit_function["rss"]` is the square root of that sum.

## Validation Rules

- Unknown optimizer, variable, pickup, or operand kinds raise `ValueError`.
- Variable targets and pickup targets must be unique.
- The same target cannot be both a variable and a pickup target.
- Radius targets use `sm.ifcs`; thickness targets use `sm.gaps`; out-of-range indices raise `IndexError`.
- Pickup graphs are topologically validated; cycles raise `ValueError("Pickup cycle detected")`.
- `merit_function.operands` must not be empty.

## Algorithm

### `evaluate_optimization_problem(opm, config)`

1. Validates and normalizes the config.
2. Snapshots all variable/pickup targets before mutation.
3. Applies the current variable vector and then applies pickups in dependency order.
4. Calls `opm.update_model()`.
5. Evaluates all operand residuals and returns a JSON-safe report.
6. If evaluation fails, restores the snapshotted state and re-raises.

### `optimize_opm(opm, config)`

1. Validates and normalizes the config.
2. Snapshots all variable/pickup targets before mutation.
3. Builds the current variable vector and bounds from the config.
4. Runs `scipy.optimize.least_squares(...)` using the configured method and tolerances.
5. Each objective evaluation:
   - writes variables
   - applies pickups
   - calls `opm.update_model()`
   - evaluates operand residuals
6. Exceptions during objective evaluation return a large penalty residual vector (`1e6` per residual) so SciPy can continue.
7. Leaves `opm` at the optimized state and returns a detailed report.
8. If SciPy setup or the final evaluation fails, restores the snapshotted state and re-raises.

If there are no variables, `optimize_opm()` skips SciPy and returns the evaluated merit report with `status == "no_variables"`.

## Result Shape

### `initial_values` / `final_values`

Each entry contains:

- `kind`
- `surface_index`
- `value`
- `min`
- `max`

### `pickups`

Each entry contains:

- `kind`
- `surface_index`
- `source_surface_index`
- `scale`
- `offset`
- `value`

### `residuals`

Each entry contains:

- `kind`
- `target`
- `value`
- `field_index`
- `wavelength_index`
- `operand_weight`
- `field_weight`
- `wavelength_weight`
- `total_weight`
- `weighted_residual`

## Dependencies

- `scipy.optimize.least_squares`
- `rayoptics_web_utils.raygrid.make_ray_grid`
- `rayoptics_web_utils.analysis.get_opd_fan_data`
- `rayoptics_web_utils.zernike.zernike._extract_exit_pupil_grid`
- RayOptics sequential model access via `opm["seq_model"]`

## Usages

```python
from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_opm

report = evaluate_optimization_problem(opm, config)
result = optimize_opm(opm, config)
```

The module is intended as the Python core for future worker/UI integration; in this change it is Python-only.
