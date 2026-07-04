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

class UserDefinedMaterial(MutableMapping):
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
                "dispersion_coeff_kind": "tabulated",
                "dispersion_coeffs": [(self.map[label].wvls[i], self.map[label].rndx[i]) for i in range(len(self.map[label].wvls))],
                "refractive_index_d": nd,
                "refractive_index_e": ne,
                "abbe_number_d": _abbe_number(nd, nF, nC),
                "abbe_number_e": _abbe_number(ne, nF, nC),
                "partial_dispersions": {
                    "P_F_e": _partial_dispersion(nF, ne, nF, nC),
                    "P_F_d": _partial_dispersion(nF, nd, nF, nC),
                    "P_g_F": _partial_dispersion(ng, nF, nF, nC),
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

        self.map[key] = opticalmedium.InterpolatedMedium(
            key,
            pairs=value,
            cat="custom",
        )
    
    def __delitem__(self, key: str) -> None:
        del self.map[key]
    
    def __iter__(self):
        return iter(self.map)
    
    def __len__(self) -> int:
        return len(self.map)
    
