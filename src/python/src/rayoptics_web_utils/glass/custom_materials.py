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
    material_yaml = _load_material_yaml(filename)
    return create_material(material_yaml, material_name, 'rii-main', 'data-nk')


def _build_sellmeier_special_material_data(
    filename: str,
    material_name: str,
) -> dict:
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
    return _build_formula1_six_coeff_special_material_data('CaF2_Malitson.yml', 'CaF2')


def _get_fused_silica_data() -> dict:
    return _build_formula1_six_coeff_special_material_data('FusedSilica_Malitson.yml', 'Fused Silica')


def _get_water_data() -> dict:
    return _build_sellmeier_special_material_data('Water_Daimon-20.0C.yml', 'Water')


def _get_d263teco_data() -> dict:
    return _build_sellmeier_special_material_data('D263TECO.yml', 'D263TECO')


def get_special_materials_data() -> dict[str, dict[str, dict]]:
    """Return the Special catalog entries for bundled custom materials."""
    return {
        "Special": {
            "CaF2": _get_caf2_data(),
            "Fused Silica": _get_fused_silica_data(),
            "Water": _get_water_data(),
            "D263TECO": _get_d263teco_data(),
        }
    }
