"""# `python/src/rayoptics_web_utils/glass/user_defined_materials.py`

## API

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
- The render-safe glass code uses the d-line refractive index and Vd-style Abbe number, encoded as `NNNVVV`.
- Exported dict keys are camelCase to match the TypeScript worker contract directly; no frontend raw-data normalizer is required."""

from collections.abc import MutableMapping
from opticalglass import opticalmedium
from rayoptics_web_utils.glass.helper import (
    _WL_C,
    _WL_D,
    _WL_E,
    _WL_F,
    _WL_G,
    _abbe_number,
    _partial_dispersion,
)

def _render_safe_glass_code(material: opticalmedium.InterpolatedMedium) -> str:
    nd = float(material.rindex(_WL_D * 1000.0))
    nF = float(material.rindex(_WL_F * 1000.0))
    nC = float(material.rindex(_WL_C * 1000.0))
    vd = _abbe_number(nd, nF, nC)
    return f"{round((nd - 1.0) * 1000):03d}{round(vd * 10):03d}"

class UserDefinedMaterial(MutableMapping):
    """## Purpose

    Stores user-defined tabulated optical materials in an in-memory `MutableMapping` and exports frontend-ready glass data for selected entries.

    ### `UserDefinedMaterial`

    `UserDefinedMaterial` behaves like a mutable mapping from material label to `opticalglass.opticalmedium.InterpolatedMedium`.

    - `__setitem__(key, pairs)` registers a new tabulated material from wavelength/index pairs.
    - Duplicate keys raise `KeyError`.
    - Fewer than 4 wavelength/index pairs raises `ValueError`.
    - Registered `InterpolatedMedium` instances receive a render-safe `glass_code()` override that returns a compact float-parseable numeric string based on nd/Vd. This prevents RayOptics layout rendering from failing when it calculates material colors.
    - `__delitem__(key)` deletes an existing material.
    - `get_one_material_data(label)` returns `{ label: glass_entry }`.
    - `get_materials_data(keys)` returns a bare map for the requested labels and raises `KeyError` for missing labels.
    - `get_all_materials_data()` returns all registered material data."""
    def __init__(self):
        self.map: dict[str, opticalmedium.InterpolatedMedium] = {}

    def __getitem__(self, key: str) -> opticalmedium.InterpolatedMedium:
        return self.map[key]

    def get_one_material_data(self, label: str) -> dict[str, dict[str, dict]]:
        if label not in self.map:
            raise KeyError(f"Material '{label}' does not exist.")

        micron_to_nm_factor = 1000.0

        material = self.map[label]
        nd = material.rindex(_WL_D * micron_to_nm_factor)
        ne = material.rindex(_WL_E * micron_to_nm_factor)
        nF = material.rindex(_WL_F * micron_to_nm_factor)
        nC = material.rindex(_WL_C * micron_to_nm_factor)
        ng = material.rindex(_WL_G * micron_to_nm_factor)

        return {
            label: {
                "dispersionCoeffKind": "tabulated",
                "dispersionCoeffs": [(self.map[label].wvls[i], self.map[label].rndx[i]) for i in range(len(self.map[label].wvls))],
                "refractiveIndexD": nd,
                "refractiveIndexE": ne,
                "abbeNumberD": _abbe_number(nd, nF, nC),
                "abbeNumberE": _abbe_number(ne, nF, nC),
                "partialDispersions": {
                    "P_fe": _partial_dispersion(nF, ne, nF, nC),
                    "P_Fd": _partial_dispersion(nF, nd, nF, nC),
                    "P_gF": _partial_dispersion(ng, nF, nF, nC),
                },
            }
        }

    def get_materials_data(self, keys: list[str]) -> dict[str, dict[str, dict]]:
        data = {}
        for key in keys:
            if key not in self.map:
                raise KeyError(f"Material '{key}' does not exist.")
            data.update(self.get_one_material_data(key))
        return data

    def get_all_materials_data(self) -> dict[str, dict[str, dict]]:
        return self.get_materials_data(list(self.map.keys()))

    def __setitem__(self, key: str, value: list[tuple[float, float]]) -> None:
        if key in self.map:
            raise KeyError(f"Key '{key}' already exists.")

        if len(value) < 4:
            raise ValueError("At least 4 wavelength-refractive index pairs are required.")

        material = opticalmedium.InterpolatedMedium(
            key,
            pairs=value,
            cat="custom",
        )
        material.glass_code = lambda material=material: _render_safe_glass_code(material)
        self.map[key] = material

    def __delitem__(self, key: str) -> None:
        del self.map[key]

    def __iter__(self):
        return iter(self.map)

    def __len__(self) -> int:
        return len(self.map)

