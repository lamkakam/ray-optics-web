# `python/src/rayoptics_web_utils/glass/custom_materials.py`

## Purpose

Provides optical glass data for special materials not found in the standard `opticalglass` catalogs (currently CaF2, Fused Silica, and Water from refractiveindex.info). Returns plain Python dicts in the same schema as `glass.py`, and exposes a shared YAML-loading helper for runtime material registration.

## Key Conventions

- Data source: YAML files under `rayoptics_web_utils/data/`, loaded via `importlib.resources`.
- `load_custom_material(filename, material_name)` is the shared path for creating `RIIMedium` instances from bundled refractiveindex.info YAML files. `env.init()` reuses it so the runtime and exported glass data stay consistent.
- refractiveindex.info equation names are dispatched through `_map_equation_name_to_dispersion_equation`; this module currently supports `"formula 1"` and `"formula 2"` from the refractiveindex.info schema.
- `_formula1` expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where each `Ci` is the raw resonance wavelength in μm. It evaluates `n²−1 = Σ Bi·λ²/(λ²−Ci²)`.
- `_formula2` expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where each `Ci` is already a squared resonance wavelength in μm². It evaluates `n²−1 = Σ Bi·λ²/(λ²−Ci)`.
- `_build_sellmeier_special_material_data(filename, material_name)` is the shared helper for bundled Sellmeier-style special materials. It drops the leading `n0` term from refractiveindex.info coefficients, evaluates refractive indices using the declared equation type, computes Abbe numbers and partial dispersions, then exports either `"Sellmeier3T"` or `"Sellmeier4T"` based on the number of Sellmeier terms.
- `_build_formula1_six_coeff_special_material_data(filename, material_name)` remains as a narrow wrapper for the existing 3-term formula-1 materials.
- The bundled CaF2 and Fused Silica YAML files use refractiveindex.info `"formula 1"` data, so the module computes refractive indices from raw `Ci` values and squares `Ci` when exporting `dispersion_coeffs` in the downstream `"Sellmeier3T"` layout `[B1, B2, B3, C1², C2², C3²]`.
- The bundled Water YAML file uses refractiveindex.info `"formula 2"` data with four Sellmeier terms, so the module exports `"Sellmeier4T"` with coefficient order `[B1, B2, B3, B4, C1, C2, C3, C4]`. Because formula 2 already stores squared resonance terms, the exported `Ci` values are passed through unchanged.
- Fraunhofer wavelengths used: C=0.6563 μm, d=0.5876 μm, e=0.5461 μm, F=0.4861 μm, g=0.4358 μm.
- Both Vd and Ve use F and C lines: Vd = (nd−1)/(nF−nC), Ve = (ne−1)/(nF−nC).

## API

### `load_custom_material(filename: str, material_name: str) -> RIIMedium`

Reads a bundled YAML file from `rayoptics_web_utils/data/` and constructs the corresponding refractiveindex.info `RIIMedium`.

### `_formula1(dispersion_coeffs, wavelengthInMicron) -> float`

Computes refractive index via refractiveindex.info formula 1:
`n = sqrt(1 + Σ Bi·λ²/(λ²−Ci²))`.
Expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where `Ci` are raw resonance wavelengths in μm.

### `_formula2(dispersion_coeffs, wavelengthInMicron) -> float`

Computes refractive index via refractiveindex.info formula 2:
`n = sqrt(1 + Σ Bi·λ²/(λ²−Ci))`.
Expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where `Ci` are already squared resonance wavelengths in μm².

### `_build_sellmeier_special_material_data(filename: str, material_name: str) -> dict`

Loads a bundled refractiveindex.info YAML material, evaluates refractive indices at the Fraunhofer lines, computes Abbe numbers and partial dispersions, and exports a glass entry in either `"Sellmeier3T"` or `"Sellmeier4T"` layout depending on the number of coefficient pairs.

### `_get_caf2_data() -> dict`

Reads `CaF2_Malitson.yml` via `_build_formula1_six_coeff_special_material_data`, parses its refractiveindex.info `"formula 1"` coefficients as raw resonance wavelengths, computes optical properties from those raw values, then exports a glass entry dict whose `"dispersion_coeffs"` field uses the squared-`Ci` `"Sellmeier3T"` convention expected by the rest of the app.

### `_get_fused_silica_data() -> dict`

Reads `FusedSilica_Malitson.yml` via `_build_formula1_six_coeff_special_material_data`, parses its refractiveindex.info `"formula 1"` coefficients as raw resonance wavelengths, computes optical properties from those raw values, then exports a glass entry dict whose `"dispersion_coeffs"` field uses the squared-`Ci` `"Sellmeier3T"` convention expected by the rest of the app.

### `_get_water_data() -> dict`

Reads `Water_Daimon-20.0C.yml` via `_build_sellmeier_special_material_data`, parses its refractiveindex.info `"formula 2"` coefficients, computes optical properties from those squared-`Ci` values, then exports a glass entry dict whose `"dispersion_coeffs"` field uses the `"Sellmeier4T"` layout `[B1, B2, B3, B4, C1, C2, C3, C4]`.

### `get_special_materials_data() -> dict[str, dict[str, dict]]`

Returns `{"Special": {"CaF2": glass_entry, "Fused Silica": glass_entry, "Water": glass_entry}}`.

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
  "dispersion_coeffs": [0.5675888, 0.4710914, 3.8484723, 0.0025264299593920254, 0.01007833277281, 1200.5563482816]
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
#     },
#     "Fused Silica": {
#       "refractive_index_d": 1.4585,
#       "abbe_number_d": 67.8,
#       ...
#     },
#     "Water": {
#       "refractive_index_d": 1.3334,
#       "abbe_number_d": 55.7,
#       ...
#     }
#   }
# }
```

### `_get_caf2_data`

Internal functions used to load and parse bundled special-material YAML data:

```python
from rayoptics_web_utils.glass.custom_materials import _get_caf2_data

caf2_entry = _get_caf2_data()
# Returns: {"refractive_index_d": 1.4338, "abbe_number_d": 95.1, ...}
```

```python
from rayoptics_web_utils.glass.custom_materials import _get_fused_silica_data

fused_silica_entry = _get_fused_silica_data()
# Returns: {"refractive_index_d": 1.4585, "abbe_number_d": 67.8, ...}
```

```python
from rayoptics_web_utils.glass.custom_materials import _get_water_data

water_entry = _get_water_data()
# Returns: {"refractive_index_d": 1.3334, "abbe_number_d": 55.7, ...}
```

**Note:** `get_special_materials_data` is the public API, called from `glass.py` to supplement the standard opticalglass catalogs. The "Special" catalog containing CaF2, Fused Silica, and Water is merged with the standard catalogs by `get_all_glass_catalogs_data()` and transmitted to the frontend as part of the glass map feature.
