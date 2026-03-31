# `python/src/rayoptics_web_utils/glass/custom_materials.py`

## Purpose

Provides optical glass data for special materials not found in the standard `opticalglass` catalogs (e.g. CaF2 from refractiveindex.info). Returns plain Python dicts in the same schema as `glass.py`.

## Key Conventions

- Data source: YAML files under `rayoptics_web_utils/data/`, loaded via `importlib.resources`.
- refractiveindex.info **formula 1** (Sellmeier) stores coefficients as `n0 B1 C1 B2 C2 B3 C3` where `n0` is a constant (dropped) and `Ci` is the resonance **wavelength** in μm (not μm²). `dispersion_coeffs` stores these raw values as `[B1, B2, B3, C1, C2, C3]` without squaring. `_sellmeier3T` squares the C values internally per the formula `n²−1 = B1·λ²/(λ²−C1²) + …`.
- Fraunhofer wavelengths used: C=0.6563 μm, d=0.5876 μm, e=0.5461 μm, F=0.4861 μm, g=0.4358 μm.
- Both Vd and Ve use F and C lines: Vd = (nd−1)/(nF−nC), Ve = (ne−1)/(nF−nC).

## API

### `_sellmeier3T(dispersion_coeffs, wavelengthInMicron) -> float`

Computes refractive index via: `n = sqrt(1 + B1·λ²/(λ²−C1²) + B2·λ²/(λ²−C2²) + B3·λ²/(λ²−C3²))`.
Expects `dispersion_coeffs = [B1, B2, B3, C1, C2, C3]` where Ci are raw resonance wavelengths in μm.

### `_get_caf2_data() -> dict`

Reads `CaF2_Malitson.yml`, parses coefficients (raw resonance wavelengths, NOT squared), computes optical properties, and returns a glass entry dict.

### `get_special_materials_data() -> dict[str, dict[str, dict]]`

Returns `{"Special": {"CaF2": glass_entry}}`.

## Output Schema (per glass entry)

```json
{
  "refractive_index_d": 1.4338,
  "refractive_index_e": 1.4370,
  "abbe_number_d": 95.1,
  "abbe_number_e": 94.3,
  "partial_dispersions": {
    "P_F_e": 0.456,
    "P_F_d": 0.702,
    "P_g_F": 0.552
  },
  "dispersion_coeff_kind": "Sellmeier3T",
  "dispersion_coeffs": [0.5675888, 0.4710914, 3.8484723, 0.050263605, 0.1003909, 34.649040]
}
```

## Partial Dispersion Formulas

- P_F,e = (nF − ne) / (nF − nC)
- P_F,d = (nF − nd) / (nF − nC)
- P_g,F = (ng − nF) / (nF − nC)

## Abbe Number Formulas

- Vd = (nd − 1) / (nF − nC)
- Ve = (ne − 1) / (nF − nC)

## Usages

### `get_special_materials_data`

Called by `glass.py` to include custom materials (CaF2) in the glass catalog data:

```python
from rayoptics_web_utils.glass.custom_materials import get_special_materials_data

special_data = get_special_materials_data()
# Returns: {
#   "Special": {
#     "CaF2": {
#       "refractive_index_d": 1.4338,
#       "abbe_number_d": 95.1,
#       ...
#     }
#   }
# }
```

### `_get_caf2_data`

Internal function used to load and parse CaF2 material data from bundled YAML:

```python
from rayoptics_web_utils.glass.custom_materials import _get_caf2_data

caf2_entry = _get_caf2_data()
# Returns: {"refractive_index_d": 1.4338, "abbe_number_d": 95.1, ...}
```

**Note:** `get_special_materials_data` is the public API, called from `glass.py` to supplement the standard opticalglass catalogs. The "Special" catalog containing CaF2 is merged with the standard catalogs by `get_all_glass_catalogs_data()` and transmitted to the frontend as part of the glass map feature.
