# `python/src/rayoptics_web_utils/optimization/operands.py`

## Purpose

Defines operand evaluators and the operand registry used by optimization merit functions.

## Public Surface

```python
OPERAND_REGISTRY: dict[str, OperandEvaluator]
PENALTY_RESIDUAL: float
get_nominal_operand_sample_residual_count(sample: OperandSample) -> int
```

## Supported Operands

- `rms_spot_size`
- `rms_wavefront_error`
- `opd_difference`
- `opd_difference_tangential`
- `opd_difference_sagittal`
- `focal_length`
- `f_number`
- `ray_fan`
- `ray_fan_tangential`
- `ray_fan_sagittal`

## Key Behaviors

- Returns scalar operand values for scalar operands and a vector of residual samples for Ray Fan operands.
- Uses `PENALTY_RESIDUAL == 1e6` when no valid optical analysis samples are available.
- Annotates `opm` as `OpticalModel` and narrows operand `options` to the shared `OperandOptions` mapping.
- `rms_wavefront_error` traces a `RayGrid`, scales `ray_grid.grid[2]` with `_scale_opd_grid_to_wavelength(...)`, and returns the piston-removed OPD standard deviation. It does not extract exit-pupil coordinates because the operand consumes only OPD samples.
- `rms_wavefront_error` passes the app-wide `image_point` to `make_ray_grid(...)`.
- `opd_difference` and axis-specific OPD Difference operands pass the app-wide `image_point` to `get_opd_fan_data(...)`; the combined operand uses tangential plus sagittal ordinates, while the axis-specific operands use only the selected fan axis.
- `ray_fan` pulls `get_ray_fan_data(opm, fi=field_index, image_point=image_point)`, selects the requested wavelength, combines tangential and sagittal ordinates, and pads or replaces missing/non-finite samples with `PENALTY_RESIDUAL` so each field/wavelength sample always contributes a stable `num_rays * 2` residual vector.
- `ray_fan_tangential` and `ray_fan_sagittal` use the same image-point-aware ray-fan analysis path but select one axis and contribute a stable `num_rays` residual vector.
- `get_nominal_operand_sample_residual_count(...)` is the shared backend source of truth for per-sample residual dimensionality, including option-driven `ray_fan` sizing.
