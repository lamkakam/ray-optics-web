# `python/src/rayoptics_web_utils/optimization/operands.py`

## Purpose

Defines operand evaluators and the operand registry used by optimization merit functions.

## Public Surface

```python
OPERAND_REGISTRY: dict[str, callable]
PENALTY_RESIDUAL: float
```

## Supported Operands

- `rms_spot_size`
- `rms_wavefront_error`
- `opd_difference`
- `focal_length`
- `f_number`

## Key Behaviors

- Returns scalar operand values for one normalized field/wavelength sample.
- Uses `PENALTY_RESIDUAL == 1e6` when no valid optical analysis samples are available.
