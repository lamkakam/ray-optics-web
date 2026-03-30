# `python/src/rayoptics_web_utils/glass/custom_materials.py`

## Purpose

Provides optical glass data for special materials not found in the standard `opticalglass` catalogs (e.g. CaF2 from refractiveindex.info). Returns plain Python dicts in the same schema as `glass.py`.

## Key Conventions

- Data source: YAML files under `rayoptics_web_utils/data/`, loaded via `importlib.resources`.
- refractiveindex.info **formula 1** (Sellmeier) stores coefficients as `n0 B1 c1 B2 c2 B3 c3` where `n0` is a constant (dropped) and `ci` is the resonance **wavelength** in μm (not μm²). The `_sellmeier3T` helper expects `Ci = ci²` (μm²), so the C values are squared on parse.
- Fraunhofer wavelengths used: C=0.6563 μm, d=0.5876 μm, e=0.5461 μm, F=0.4861 μm, g=0.4358 μm.
- Both Vd and Ve use F and C lines: Vd = (nd−1)/(nF−nC), Ve = (ne−1)/(nF−nC).

## API

### `_sellmeier3T(dispersion_coeffs, wavelengthInMicron) -> float`

Computes refractive index via: `n = sqrt(1 + B1/(1-C1/λ²) + B2/(1-C2/λ²) + B3/(1-C3/λ²))`.
Expects `dispersion_coeffs = [B1, B2, B3, C1, C2, C3]` where Ci is in μm².

### `_get_caf2_data() -> dict`

Reads `CaF2_Malitson.yml`, parses coefficients (squaring the C terms), computes optical properties, and returns a glass entry dict.

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
  "dispersion_coeffs": [0.5675888, 0.4710914, 3.8484723, 0.002526, 0.010078, 1200.35]
}
```

## Partial Dispersion Formulas

- P_F,e = (nF − ne) / (nF − nC)
- P_F,d = (nF − nd) / (nF − nC)
- P_g,F = (ng − nF) / (nF − nC)

## Abbe Number Formulas

- Vd = (nd − 1) / (nF − nC)
- Ve = (ne − 1) / (nF − nC)
