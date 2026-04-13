from __future__ import annotations
import importlib.resources
import yaml
from opticalglass.rindexinfo import create_material
from opticalglass.rindexinfo import RIIMedium

# Fraunhofer wavelengths in μm
_WL_C  = 0.6563   # hydrogen C
_WL_D  = 0.5876   # helium d
_WL_E  = 0.5461   # mercury e
_WL_F  = 0.4861   # hydrogen F
_WL_G  = 0.4358   # mercury g

def _formula1(dispersion_coeffs: list[float], wavelengthInMicron: float) -> float:
    if len(dispersion_coeffs) % 2 != 0:
        raise ValueError(f"Expected even number dispersion coefficients for Formula 2, got {len(dispersion_coeffs)}")
    
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


def _build_special_material_data(filename: str, material_name: str) -> dict:
    material = load_custom_material(filename, material_name)

    equation_type = material.yaml_data['DATA'][0]['type']
    coeffs_str = material.yaml_data['DATA'][0]['coefficients']

    # refractiveindex.info formula 1 stores coefficients as:
    # n0 B1 C1 B2 C2 B3 C3  (n0 is constant term, typically 0 — drop it)
    # Ci are raw resonance wavelengths in μm (not squared).
    # Use the raw values for evaluation, then square Ci only when exporting the
    # downstream Sellmeier3T payload expected by the frontend.
    raw_dispersion_coeffs = [float(x) for x in coeffs_str.split()][1:]

    dispersion_fn = _map_equation_name_to_dispersion_equation[equation_type]

    nC  = dispersion_fn(raw_dispersion_coeffs, _WL_C)
    nd  = dispersion_fn(raw_dispersion_coeffs, _WL_D)
    ne  = dispersion_fn(raw_dispersion_coeffs, _WL_E)
    nF  = dispersion_fn(raw_dispersion_coeffs, _WL_F)
    ng  = dispersion_fn(raw_dispersion_coeffs, _WL_G)
    abbe_number_d = (nd - 1) / (nF - nC)
    abbe_number_e = (ne - 1) / (nF - nC)

    denom = nF - nC
    partial_dispersions = {
        "P_F_e": (nF - ne) / denom,
        "P_F_d": (nF - nd) / denom,
        "P_g_F": (ng - nF) / denom,
    }

    B1, C1, B2, C2, B3, C3 = raw_dispersion_coeffs
    return {
        "dispersion_coeff_kind": "Sellmeier3T",
        # Sellmeier3T stores [B1, B2, B3, C1, C2, C3] with Ci already squared.
        "dispersion_coeffs": [B1, B2, B3, C1**2, C2**2, C3**2],
        "refractive_index_d": nd,
        "refractive_index_e": ne,
        "abbe_number_d": abbe_number_d,
        "abbe_number_e": abbe_number_e,
        "partial_dispersions": partial_dispersions,
    }


def _get_caf2_data() -> dict:
    return _build_special_material_data('CaF2_Malitson.yml', 'CaF2')


def _get_fused_silica_data() -> dict:
    return _build_special_material_data('FusedSilica_Malitson.yml', 'Fused Silica')


def get_special_materials_data() -> dict[str, dict[str, dict]]:
    """Return {"Special": {"CaF2": glass_entry, "Fused Silica": glass_entry}} for special materials."""
    return {
        "Special": {
            "CaF2": _get_caf2_data(),
            "Fused Silica": _get_fused_silica_data(),
        }
    }
