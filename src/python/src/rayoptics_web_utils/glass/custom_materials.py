from __future__ import annotations
import importlib.resources
import yaml
from opticalglass.rindexinfo import create_material

# Fraunhofer wavelengths in μm
_WL_C  = 0.6563   # hydrogen C
_WL_D  = 0.5876   # helium d
_WL_E  = 0.5461   # mercury e
_WL_F  = 0.4861   # hydrogen F
_WL_G  = 0.4358   # mercury g


def _sellmeier3T(dispersion_coeffs: list[float], wavelengthInMicron: float) -> float:
    if len(dispersion_coeffs) != 6:
        raise ValueError(f"Expected 6 dispersion coefficients for Sellmeier3T, got {len(dispersion_coeffs)}")

    # dispersion_coeffs = [B1, B2, B3, C1, C2, C3]
    # C values are raw resonance wavelengths in μm (not squared).
    # Formula: n² − 1 = B1·λ²/(λ²−C1²) + B2·λ²/(λ²−C2²) + B3·λ²/(λ²−C3²)
    B1, B2, B3, C1, C2, C3 = dispersion_coeffs
    x = wavelengthInMicron
    return (1 + B1 / (1 - C1**2 / x**2) + B2 / (1 - C2**2 / x**2) + B3 / (1 - C3**2 / x**2)) ** 0.5


# mapping the equation type defined by https://refractiveindex.info/ to the actual dispersion equation function
_map_equation_name_to_dispersion_equation: dict[str, callable[[list[float], float], float]] = {
    'formula 1': _sellmeier3T,
}


def _get_caf2_data() -> dict:
    data_path = importlib.resources.files('rayoptics_web_utils') / 'data' / 'CaF2_Malitson.yml'
    with importlib.resources.as_file(data_path) as f:
        caf2_yaml = yaml.safe_load(f.read_text())
    caf2 = create_material(caf2_yaml, 'CaF2', 'rii-main', 'data-nk')

    equation_type = caf2.yaml_data['DATA'][0]['type']
    coeffs_str = caf2.yaml_data['DATA'][0]['coefficients']

    # refractiveindex.info formula 1 stores coefficients as:
    # n0 B1 C1 B2 C2 B3 C3  (n0 is constant term, typically 0 — drop it)
    # Ci are raw resonance wavelengths in μm (not squared).
    raw = [float(x) for x in coeffs_str.split()][1:]
    B1, C1, B2, C2, B3, C3 = raw
    dispersion_coeffs = [B1, B2, B3, C1, C2, C3]

    dispersion_fn = _map_equation_name_to_dispersion_equation[equation_type]

    nC  = dispersion_fn(dispersion_coeffs, _WL_C)
    nd  = dispersion_fn(dispersion_coeffs, _WL_D)
    ne  = dispersion_fn(dispersion_coeffs, _WL_E)
    nF  = dispersion_fn(dispersion_coeffs, _WL_F)
    ng  = dispersion_fn(dispersion_coeffs, _WL_G)
    abbe_number_d = (nd - 1) / (nF - nC)
    abbe_number_e = (ne - 1) / (nF - nC)

    denom = nF - nC
    partial_dispersions = {
        "P_F_e": (nF - ne) / denom,
        "P_F_d": (nF - nd) / denom,
        "P_g_F": (ng - nF) / denom,
    }

    return {
        "dispersion_coeff_kind": "Sellmeier3T",
        "dispersion_coeffs": dispersion_coeffs,
        "refractive_index_d": nd,
        "refractive_index_e": ne,
        "abbe_number_d": abbe_number_d,
        "abbe_number_e": abbe_number_e,
        "partial_dispersions": partial_dispersions,
    }


def get_special_materials_data() -> dict[str, dict[str, dict]]:
    """Return {"Special": {"CaF2": glass_entry}} for special materials."""
    return {"Special": {"CaF2": _get_caf2_data()}}
