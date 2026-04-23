# `python/src/rayoptics_web_utils/optimization/operands.py`

## Purpose

Defines operand evaluators and the operand registry used by optimization merit functions.

## Public Surface

```python
OPERAND_REGISTRY: dict[str, OperandEvaluator]
PENALTY_RESIDUAL: float
```

## Supported Operands

- `rms_spot_size`
- `rms_wavefront_error`
- `opd_difference`
- `focal_length`
- `f_number`
- `ray_fan`

## Key Behaviors

- Returns scalar operand values for existing operands and a vector of residual samples for `ray_fan`.
- Uses `PENALTY_RESIDUAL == 1e6` when no valid optical analysis samples are available.
- Annotates `opm` as `OpticalModel` and narrows operand `options` to the shared `OperandOptions` mapping.
- `ray_fan` pulls `get_ray_fan_data(opm, fi=field_index)`, selects the requested wavelength, combines tangential and sagittal ordinates, and pads or replaces missing/non-finite samples with `PENALTY_RESIDUAL` so each field/wavelength sample always contributes a stable `42`-entry residual vector (`21` tangential + `21` sagittal).
