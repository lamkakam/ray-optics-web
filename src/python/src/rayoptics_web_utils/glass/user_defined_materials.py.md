# `python/src/rayoptics_web_utils/glass/user_defined_materials.py`

## Purpose

Stores user-defined tabulated optical materials in an in-memory `MutableMapping` and exports frontend-ready glass data for selected entries.

## API

### `UserDefinedMaterial`

`UserDefinedMaterial` behaves like a mutable mapping from material label to `opticalglass.opticalmedium.InterpolatedMedium`.

- `__setitem__(key, pairs)` registers a new tabulated material from wavelength/index pairs.
- Duplicate keys raise `KeyError`.
- Fewer than 4 wavelength/index pairs raises `ValueError`.
- `__delitem__(key)` deletes an existing material.
- `get_one_material_data(label)` returns `{ label: glass_entry }`.
- `get_materials_data(keys)` returns a bare map for the requested labels and raises `KeyError` for missing labels.
- `get_all_materials_data()` returns all registered material data.

## Output Schema

User-defined material data uses the same frontend camelCase glass property names as catalog data. Its dispersion coefficients are tabulated wavelength/index tuples, so `dispersionCoeffKind` is always `"tabulated"`.

```json
{
  "CUSTOM": {
    "dispersionCoeffKind": "tabulated",
    "dispersionCoeffs": [[486.1, 1.6321], [587.6, 1.6223]],
    "refractiveIndexD": 1.6223,
    "refractiveIndexE": 1.62508,
    "abbeNumberD": 53.17,
    "abbeNumberE": 52.88,
    "partialDispersions": {
      "P_fe": 0.4607,
      "P_Fd": 0.6983,
      "P_gF": 0.5542
    }
  }
}
```

## Conventions

- Fraunhofer wavelengths are imported from `glass.helper`.
- `InterpolatedMedium.rindex()` expects wavelengths in nm, so helper wavelengths in microns are multiplied by 1000 before interpolation.
- Abbe numbers use F and C lines for both d and e centers.
- Exported dict keys are camelCase to match the TypeScript worker contract directly; no frontend raw-data normalizer is required.
