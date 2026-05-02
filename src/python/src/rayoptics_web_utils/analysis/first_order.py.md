# `python/src/rayoptics_web_utils/analysis/first_order.py`

## Purpose

Extract first-order paraxial data from a RayOptics `OpticalModel`.

## Exports

```python
def get_first_order_data(opm: OpticalModel) -> dict[str, float]: ...
```

## Behavior

- Reads `opm["parax_model"].opt_model["analysis_results"]["parax_data"].fod`.
- Returns a flat `dict[str, float]`.
- Includes only `int` and `float` attributes from `fod.__dict__`.
- Casts all included values to `float` for JSON serialisability.
