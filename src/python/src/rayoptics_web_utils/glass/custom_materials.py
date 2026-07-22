"""# `python/src/rayoptics_web_utils/glass/custom_materials.py`

## Purpose

Provides optical glass data for special materials not found in the standard `opticalglass` catalogs (currently CaF2, Fused Silica, Water, and D263TECO from refractiveindex.info). Returns plain Python dicts in the same schema as `glass.py`, and exposes a shared YAML-loading helper for runtime material registration.

## Key Conventions

- Data source: YAML files under `rayoptics_web_utils/data/`, loaded via `importlib.resources`.
- `load_custom_material(filename, material_name)` is the shared path for creating `RIIMedium` instances from bundled refractiveindex.info YAML files. `env.init()` reuses it so the runtime and exported glass data stay consistent.
- refractiveindex.info equation names are dispatched through `_map_equation_name_to_dispersion_equation`; this module currently supports `"formula 1"` and `"formula 2"` from the refractiveindex.info schema.
- `_formula1` expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where each `Ci` is the raw resonance wavelength in μm. It evaluates `n²−1 = Σ Bi·λ²/(λ²−Ci²)`.
- `_formula2` expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where each `Ci` is already a squared resonance wavelength in μm². It evaluates `n²−1 = Σ Bi·λ²/(λ²−Ci)`.
- `_build_sellmeier_special_material_data(filename, material_name)` is the shared helper for bundled Sellmeier-style special materials. It drops the leading `n0` term from refractiveindex.info coefficients, evaluates refractive indices using the declared equation type, computes Abbe numbers and partial dispersions, then exports either `"Sellmeier3T"` or `"Sellmeier4T"` based on the number of Sellmeier terms.
- When a source YAML includes `PROPERTIES.nd` or `PROPERTIES.Vd`, those catalog values are used for exported `refractiveIndexD` and `abbeNumberD`; other derived values are computed from the declared dispersion equation.
- `_build_formula1_six_coeff_special_material_data(filename, material_name)` remains as a narrow wrapper for the existing 3-term formula-1 materials.
- The bundled CaF2 and Fused Silica YAML files use refractiveindex.info `"formula 1"` data, so the module computes refractive indices from raw `Ci` values and squares `Ci` when exporting `dispersionCoeffs` in the downstream `"Sellmeier3T"` layout `[B1, B2, B3, C1², C2², C3²]`.
- The bundled Water YAML file uses refractiveindex.info `"formula 2"` data with four Sellmeier terms, so the module exports `"Sellmeier4T"` with coefficient order `[B1, B2, B3, B4, C1, C2, C3, C4]`. Because formula 2 already stores squared resonance terms, the exported `Ci` values are passed through unchanged.
- The bundled D263TECO YAML file uses refractiveindex.info `"formula 2"` data with three Sellmeier terms, so the module exports `"Sellmeier3T"` with coefficient order `[B1, B2, B3, C1, C2, C3]` and passes formula-2 `Ci` values through unchanged.
- Fraunhofer wavelengths used: C=0.6563 μm, d=0.5876 μm, e=0.5461 μm, F=0.4861 μm, g=0.4358 μm.
- Both Vd and Ve use F and C lines: Vd = (nd−1)/(nF−nC), Ve = (ne−1)/(nF−nC).

## API

## Output Schema (per glass entry)

```json
{
  "refractiveIndexD": 1.4338,
  "refractiveIndexE": 1.4370,
  "abbeNumberD": 95.1,
  "abbeNumberE": 94.3,
  "partialDispersions": {
    "P_fe": 0.456,
    "P_Fd": 0.702,
    "P_gF": 0.552
  },
  "dispersionCoeffKind": "Sellmeier3T",
  "dispersionCoeffs": [0.5675888, 0.4710914, 3.8484723, 0.0025264299593920254, 0.01007833277281, 1200.5563482816]
}
```

## Partial Dispersion Formulas

- P_F,e = (nF − ne) / (nF − nC)
- P_F,d = (nF − nd) / (nF − nC)
- P_g,F = (ng − nF) / (nF − nC)

## Abbe Number Formulas

- Vd = (nd − 1) / (nF − nC)
- Ve = (ne − 1) / (nF − nC)

## Usages"""

from __future__ import annotations
import importlib.resources
import yaml
from opticalglass.rindexinfo import create_material
from opticalglass.rindexinfo import RIIMedium
from rayoptics_web_utils.glass.helper import (
    _WL_C,
    _WL_D,
    _WL_E,
    _WL_F,
    _WL_G,
    _abbe_number,
    _partial_dispersion,
)

def _formula1(dispersion_coeffs: list[float], wavelengthInMicron: float) -> float:
    """### `_formula1(dispersionCoeffs, wavelengthInMicron) -> float`

    Computes refractive index via refractiveindex.info formula 1:
    `n = sqrt(1 + Σ Bi·λ²/(λ²−Ci²))`.
    Expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where `Ci` are raw resonance wavelengths in μm."""
    if len(dispersion_coeffs) % 2 != 0:
        raise ValueError(f"Expected even number dispersion coefficients for Formula 1, got {len(dispersion_coeffs)}")

    # dispersion_coeffs = [B1, C1, B2, C2, B3, C3, ...]
    # C values are raw resonance wavelengths in μm (not squared).
    # Formula: n² − 1 = B1·λ²/(λ²−C1²) + B2·λ²/(λ²−C2²) + B3·λ²/(λ²−C3²) + ...
    # See equation 1 at https://www.nature.com/articles/s41597-023-02898-2 for details
    squared_refractive_idx = 1
    for i in range(0, len(dispersion_coeffs), 2):
        b_coeff = dispersion_coeffs[i]
        c_coeff = dispersion_coeffs[i + 1]
        squared_refractive_idx += b_coeff / (1 - c_coeff**2 / wavelengthInMicron ** 2)

    return squared_refractive_idx ** 0.5

def _formula2(dispersion_coeffs: list[float], wavelengthInMicron: float) -> float:
    """### `_formula2(dispersionCoeffs, wavelengthInMicron) -> float`

    Computes refractive index via refractiveindex.info formula 2:
    `n = sqrt(1 + Σ Bi·λ²/(λ²−Ci))`.
    Expects alternating coefficient pairs `[B1, C1, B2, C2, B3, C3, ...]` where `Ci` are already squared resonance wavelengths in μm²."""
    if len(dispersion_coeffs) % 2 != 0:
        raise ValueError(f"Expected even number dispersion coefficients for Formula 2, got {len(dispersion_coeffs)}")

    # dispersion_coeffs = [B1, C1, B2, C2, B3, C3, ...]
    # C values are SQUARED raw resonance wavelengths in μm²
    # Formula: n² − 1 = B1·λ²/(λ²−C1) + B2·λ²/(λ²−C2) + B3·λ²/(λ²−C3) + ...
    # See equation 2 at https://www.nature.com/articles/s41597-023-02898-2 for details
    squared_refractive_idx = 1
    for i in range(0, len(dispersion_coeffs), 2):
        b_coeff = dispersion_coeffs[i]
        c_coeff = dispersion_coeffs[i + 1]
        squared_refractive_idx += b_coeff / (1 - c_coeff / wavelengthInMicron ** 2)

    return squared_refractive_idx ** 0.5


# mapping the equation type defined by https://www.nature.com/articles/s41597-023-02898-2 to the actual dispersion equation function
_map_equation_name_to_dispersion_equation: dict[str, callable[[list[float], float], float]] = {
    'formula 1': _formula1,
    'formula 2': _formula2,
}


def _load_material_yaml(filename: str) -> dict:
    data_path = importlib.resources.files('rayoptics_web_utils') / 'data' / filename
    with importlib.resources.as_file(data_path) as f:
        return yaml.safe_load(f.read_text())


def load_custom_material(filename: str, material_name: str) -> RIIMedium:
    """### `load_custom_material(filename: str, material_name: str) -> RIIMedium`

    Reads a bundled YAML file from `rayoptics_web_utils/data/` and constructs the corresponding refractiveindex.info `RIIMedium`."""
    material_yaml = _load_material_yaml(filename)
    return create_material(material_yaml, material_name, 'rii-main', 'data-nk')


def _build_sellmeier_special_material_data(
    filename: str,
    material_name: str,
) -> dict:
    """### `_build_sellmeier_special_material_data(filename: str, material_name: str) -> dict`

    Loads a bundled refractiveindex.info YAML material, evaluates refractive indices at the Fraunhofer lines, computes Abbe numbers and partial dispersions, applies `PROPERTIES.nd` / `PROPERTIES.Vd` overrides when present, and exports a glass entry in either `"Sellmeier3T"` or `"Sellmeier4T"` layout depending on the number of coefficient pairs."""
    material = load_custom_material(filename, material_name)

    equation_type = material.yaml_data['DATA'][0]['type']
    coeffs_str = material.yaml_data['DATA'][0]['coefficients']
    raw_dispersion_coeffs = [float(x) for x in coeffs_str.split()][1:]

    if len(raw_dispersion_coeffs) % 2 != 0:
        raise ValueError(
            f"Expected even number dispersion coefficients for {material_name}, got {len(raw_dispersion_coeffs)}"
        )

    if equation_type not in _map_equation_name_to_dispersion_equation:
        raise ValueError(f"Unsupported equation type for {material_name}: {equation_type}")

    dispersion_fn = _map_equation_name_to_dispersion_equation[equation_type]

    nC = dispersion_fn(raw_dispersion_coeffs, _WL_C)
    nd = dispersion_fn(raw_dispersion_coeffs, _WL_D)
    ne = dispersion_fn(raw_dispersion_coeffs, _WL_E)
    nF = dispersion_fn(raw_dispersion_coeffs, _WL_F)
    ng = dispersion_fn(raw_dispersion_coeffs, _WL_G)
    abbe_number_d = _abbe_number(nd, nF, nC)
    abbe_number_e = _abbe_number(ne, nF, nC)
    properties = material.yaml_data.get('PROPERTIES', {})
    nd = float(properties.get('nd', nd))
    abbe_number_d = float(properties.get('Vd', abbe_number_d))

    denom = nF - nC
    partial_dispersions = {
        "P_fe": _partial_dispersion(nF, ne, nF, nC),
        "P_Fd": _partial_dispersion(nF, nd, nF, nC),
        "P_gF": _partial_dispersion(ng, nF, nF, nC),
    }

    b_coeffs = raw_dispersion_coeffs[::2]
    c_coeffs = raw_dispersion_coeffs[1::2]
    exported_c_coeffs = c_coeffs
    if equation_type == 'formula 1':
        exported_c_coeffs = [c_coeff ** 2 for c_coeff in c_coeffs]

    term_count = len(b_coeffs)
    if term_count == 3:
        dispersion_coeff_kind = "Sellmeier3T"
    elif term_count == 4:
        dispersion_coeff_kind = "Sellmeier4T"
    else:
        raise ValueError(f"Unsupported Sellmeier term count for {material_name}: {term_count}")

    return {
        "dispersionCoeffKind": dispersion_coeff_kind,
        "dispersionCoeffs": [*b_coeffs, *exported_c_coeffs],
        "refractiveIndexD": nd,
        "refractiveIndexE": ne,
        "abbeNumberD": abbe_number_d,
        "abbeNumberE": abbe_number_e,
        "partialDispersions": partial_dispersions,
    }


def _build_formula1_six_coeff_special_material_data(filename: str, material_name: str) -> dict:
    return _build_sellmeier_special_material_data(filename, material_name)


def _get_caf2_data() -> dict:
    """### `_get_caf2_data() -> dict`

    Reads `CaF2_Malitson.yml` via `_build_formula1_six_coeff_special_material_data`, parses its refractiveindex.info `"formula 1"` coefficients as raw resonance wavelengths, computes optical properties from those raw values, then exports a glass entry dict whose `"dispersionCoeffs"` field uses the squared-`Ci` `"Sellmeier3T"` convention expected by the rest of the app.

    ### `_get_caf2_data`

    Internal functions used to load and parse bundled special-material YAML data:

    ```python
    from rayoptics_web_utils.glass.custom_materials import _get_caf2_data

    caf2_entry = _get_caf2_data()
    # Returns: {"refractiveIndexD": 1.4338, "abbeNumberD": 95.1, ...}
    ```

    ```python
    from rayoptics_web_utils.glass.custom_materials import _get_fused_silica_data

    fused_silica_entry = _get_fused_silica_data()
    # Returns: {"refractiveIndexD": 1.4585, "abbeNumberD": 67.8, ...}
    ```

    ```python
    from rayoptics_web_utils.glass.custom_materials import _get_water_data

    water_entry = _get_water_data()
    # Returns: {"refractiveIndexD": 1.3334, "abbeNumberD": 55.7, ...}
    ```

    ```python
    from rayoptics_web_utils.glass.custom_materials import _get_d263teco_data

    d263teco_entry = _get_d263teco_data()
    # Returns: {"refractiveIndexD": 1.523303, "abbeNumberD": 54.5172, ...}
    ```

    **Note:** `get_special_materials_data` is the public API, called from `glass.py` to supplement the standard opticalglass catalogs. The "Special" catalog containing CaF2, Fused Silica, Water, and D263TECO is merged with the standard catalogs by `get_all_glass_catalogs_data()` and transmitted to the frontend as part of the glass map feature."""
    return _build_formula1_six_coeff_special_material_data('CaF2_Malitson.yml', 'CaF2')


def _get_fused_silica_data() -> dict:
    """### `_get_fused_silica_data() -> dict`

    Reads `FusedSilica_Malitson.yml` via `_build_formula1_six_coeff_special_material_data`, parses its refractiveindex.info `"formula 1"` coefficients as raw resonance wavelengths, computes optical properties from those raw values, then exports a glass entry dict whose `"dispersionCoeffs"` field uses the squared-`Ci` `"Sellmeier3T"` convention expected by the rest of the app."""
    return _build_formula1_six_coeff_special_material_data('FusedSilica_Malitson.yml', 'Fused Silica')


def _get_water_data() -> dict:
    """### `_get_water_data() -> dict`

    Reads `Water_Daimon-20.0C.yml` via `_build_sellmeier_special_material_data`, parses its refractiveindex.info `"formula 2"` coefficients, computes optical properties from those squared-`Ci` values, then exports a glass entry dict whose `"dispersionCoeffs"` field uses the `"Sellmeier4T"` layout `[B1, B2, B3, B4, C1, C2, C3, C4]`."""
    return _build_sellmeier_special_material_data('Water_Daimon-20.0C.yml', 'Water')


def _get_d263teco_data() -> dict:
    """### `_get_d263teco_data() -> dict`

    Reads `D263TECO.yml` via `_build_sellmeier_special_material_data`, parses its refractiveindex.info `"formula 2"` coefficients, computes optical properties from those squared-`Ci` values, then exports a glass entry dict whose `"dispersionCoeffs"` field uses the `"Sellmeier3T"` layout `[B1, B2, B3, C1, C2, C3]`."""
    return _build_sellmeier_special_material_data('D263TECO.yml', 'D263TECO')


def get_special_materials_data() -> dict[str, dict[str, dict]]:
    """Return the Special catalog entries for bundled custom materials.

    ### `get_special_materials_data() -> dict[str, dict[str, dict]]`

    Returns `{"Special": {"CaF2": glass_entry, "Fused Silica": glass_entry, "Water": glass_entry, "D263TECO": glass_entry}}`.

    ### `get_special_materials_data`

    Called by `glass.py` to include custom materials (CaF2) in the glass catalog data:

    ```python
    from rayoptics_web_utils.glass.custom_materials import get_special_materials_data

    special_data = get_special_materials_data()
    # Returns: {
    #   "Special": {
    #     "CaF2": {
    #       "refractiveIndexD": 1.4338,
    #       "abbeNumberD": 95.1,
    #       ...
    #     },
    #     "Fused Silica": {
    #       "refractiveIndexD": 1.4585,
    #       "abbeNumberD": 67.8,
    #       ...
    #     },
    #     "Water": {
    #       "refractiveIndexD": 1.3334,
    #       "abbeNumberD": 55.7,
    #       ...
    #     },
    #     "D263TECO": {
    #       "refractiveIndexD": 1.523303,
    #       "abbeNumberD": 54.5172,
    #       ...
    #     }
    #   }
    # }
    ```"""
    return {
        "Special": {
            "CaF2": _get_caf2_data(),
            "Fused Silica": _get_fused_silica_data(),
            "Water": _get_water_data(),
            "D263TECO": _get_d263teco_data(),
        }
    }
