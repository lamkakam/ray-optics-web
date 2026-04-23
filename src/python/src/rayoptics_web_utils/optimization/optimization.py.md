# `python/src/rayoptics_web_utils/optimization/optimization.py`

## Purpose

Provides the public compatibility facade for the optimization package. The public API still accepts JSON-encodable config dicts, supports affine pickups for geometric and aspheric targets, evaluates operand-based merit functions, and runs SciPy least-squares optimization, but the implementation is now split into algorithm-agnostic problem/config/target modules plus solver adapters.

`opm` is typed as `rayoptics.environment.OpticalModel`.

## Public API

```python
evaluate_optimization_problem(opm: OpticalModel, config: OptimizationConfig) -> OptimizationReport
optimize_opm(
    opm: OpticalModel,
    config: OptimizationConfig,
    progress_reporter: ProgressReporter | None = None,
) -> OptimizationReport
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
- `optimization_progress`

## Config Shape

```python
{
  "optimizer": {
    "kind": "least_squares",
    "method": "trf",  # or "lm"
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

The public facade is now backed by an internal solver registry. Only `least_squares` is registered in this refactor, but the core now exposes both residual-vector and scalar-merit objective hooks for future solvers.

### Variables / Pickups

- `radius` — reads/writes `opm["seq_model"].ifcs[surface_index].profile.r`
- `thickness` — reads/writes `opm["seq_model"].gaps[surface_index].thi`
- `asphere_conic_constant` — reads/writes `opm["seq_model"].ifcs[surface_index].profile.cc`
- `asphere_polynomial_coefficient` — reads/writes one coefficient slot in `profile.coefs`, extending the list with trailing zeros when needed
- `asphere_toric_sweep_radius` — reads/writes `profile.cR` for `XToroid` / `YToroid`
- Radius variables remain radius-based in the public config and report payloads, but SciPy optimizes them internally in curvature space (`c = 1 / R`, with planar `R = 0` mapped to `c = 0`) to avoid the singular numeric behavior around flat surfaces.
- Asphere variables and pickups stay in direct value space; only radius variables are transformed internally.
- Bounded methods such as `trf` expect variable `min` / `max`; unbounded methods such as `lm` may omit them.

### Operands

- `rms_spot_size`
- `rms_wavefront_error`
- `opd_difference`
- `focal_length`
- `f_number`
- `ray_fan`

## Weighting Rules

- `focal_length` and `f_number` are field-independent and wavelength-independent; any `fields` or `wavelengths` entries are ignored.
- Field-dependent scalar operands expand into one residual per selected field/wavelength pair.
- `ray_fan` expands into a fixed `42` residual samples per selected field/wavelength pair (`21` tangential + `21` sagittal). Missing or non-finite analysis samples are padded with `1e6` penalties so SciPy `lm` finite differencing always receives vectors with stable dimensions.
- `opd_difference` reuses `rayoptics_web_utils.analysis.get_opd_fan_data(opm, fi)` and computes one scalar per field/wavelength sample as `mean(abs(OPD_i - mean(OPD)))` across the combined tangential and sagittal OPD fan ordinates, after dropping non-finite values.
- `ray_fan` reuses `rayoptics_web_utils.analysis.get_ray_fan_data(opm, fi)` and exposes the combined tangential and sagittal ordinates as target-less residual samples.
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
- Asphere targets use `sm.ifcs` and may include `asphere_kind`; polynomial coefficient targets also include `coefficient_index`, and coefficient pickups include `source_coefficient_index`.
- When an asphere target references a spherical interface, the optimizer materializes the requested profile kind before reading or writing that target.
- If an interface is already aspheric with a different profile class than the requested `asphere_kind`, validation raises `ValueError`.
- Pickup graphs are topologically validated; cycles raise `ValueError("Pickup cycle detected")`.
- `merit_function.operands` must not be empty.

## Internal Structure

- `_types.py` — shared typed dicts, aliases, and protocols used across the package
- `optimization.py` — public facade, solver dispatch, compatibility aliases
- `config.py` — config normalization and validation
- `targets.py` — mutable target access, snapshots, radius/curvature transforms
- `operands.py` — operand registry and per-sample evaluators
- `problem.py` — algorithm-agnostic `OptimizationProblem`
- `progress.py` — solver-independent progress tracking
- `solvers/base.py` — solver adapter contract
- `solvers/least_squares.py` — current SciPy least-squares adapter

## Algorithm

### `evaluate_optimization_problem(opm, config)`

1. Validates and normalizes the config.
2. Snapshots all variable/pickup targets before mutation.
3. Applies the current variable vector and then applies pickups in dependency order.
4. Calls `opm.update_model()`.
5. Evaluates all operand residuals and returns a JSON-safe report.
6. If evaluation fails, restores the snapshotted state and re-raises.

### `OptimizationProblem`

- Owns normalized optimizer state, variable/pickup application, merit evaluation, scalar and residual objectives, and solver-independent progress tracking.
- `residual_objective(vector)` evaluates one optimizer step and converts the merit report into the residual vector consumed by least-squares-style solvers.
- `scalar_objective(vector)` evaluates one optimizer step and returns `merit_function["sum_of_squares"]` for future scalar/global optimizers.
- Both objective methods record merit-history entries whenever the incoming variable vector differs materially from the last recorded vector.
- Residual evaluation failures return a large penalty residual vector with the nominal expanded length (`1e6` per residual sample, minimum length 1); scalar evaluation failures return `1e6`.
- For radius variables, `current_vector()`, bounded `bounds()`, and `apply_vector(...)` all translate between external radius units and the internal curvature-space optimizer vector.

### `LeastSquaresSolver`

- Runs `scipy.optimize.least_squares(...)` using the stored optimizer configuration, current variable vector, and `OptimizationProblem.residual_objective(...)`.
- Supplies SciPy bounds only when the selected least-squares method is bounded (`trf`); `lm` runs without a `bounds` argument.
- Normalizes the SciPy result into the mapping consumed by `optimize_opm(...)`.

### `optimize_opm(opm, config)`

1. Validates and normalizes the config.
2. Snapshots all variable/pickup targets before mutation.
3. Builds the current variable vector and, for bounded methods, bounds from the config.
4. Selects the registered solver adapter for `optimizer.kind` and delegates execution to it.
5. Each objective evaluation:
   - is handled by `_OptimizationProblem.objective(vector)`
   - writes variables
   - applies pickups
   - calls `opm.update_model()`
   - evaluates operand residuals
6. Exceptions during objective evaluation return a large penalty residual vector (`1e6` per residual, minimum length 1) so SciPy can continue.
7. Leaves `opm` at the optimized state and returns a detailed report including `optimization_progress`.
8. If SciPy setup or the final evaluation fails, restores the snapshotted state and re-raises.

If there are no variables, `optimize_opm()` skips SciPy, records one progress point from the evaluated merit report, and returns `status == "no_variables"`.

## Result Shape

### `initial_values` / `final_values`

Each entry contains:

- `kind`
- `surface_index`
- `value`
- `min`
- `max`
- Asphere entries additionally include `asphere_kind`; polynomial entries also include `coefficient_index`.
- For unbounded variables such as `lm`, `min` and `max` are omitted from the report entries.

### `pickups`

Each entry contains:

- `kind`
- `surface_index`
- `source_surface_index`
- `scale`
- `offset`
- `value`
- Asphere pickups additionally include `asphere_kind`; polynomial coefficient pickups also include `coefficient_index` and `source_coefficient_index`.

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

### `optimization_progress`

Each entry contains:

- `iteration`
- `merit_function_value`
- `log10_merit_function_value`

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
