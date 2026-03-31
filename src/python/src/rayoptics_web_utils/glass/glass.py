"""Glass catalog data extraction from opticalglass."""
from __future__ import annotations
import pandas as pd


def _partial_dispersions(data: pd.Series) -> dict[str, float]:
    """
    Compute P_F_e, P_F_d, P_g_F from refractive index lines. Returns 0.0 if any cannot be computed.
    Return type:
    {
        "P_F_e": float,
        "P_F_d": float,
        "P_g_F": float,
    }
    """
    nF = data["refractive indices"]["F"]
    ne = data["refractive indices"]["e"]
    nd = data["refractive indices"]["d"]
    nC = data["refractive indices"]["C"]
    ng = data["refractive indices"]["g"]

    denom = nF - nC
    if denom == 0.0:
        return 0.0
    return {
        "P_F_e": (nF - ne) / denom,
        "P_F_d": (nF - nd) / denom,
        "P_g_F": (ng - nF) / denom,
    }

def _get_dispersion_coefficients(catalog_name: str, data: pd.Series) -> dict[str, str | list[float]]:
    """
    Return type:
    {
        "dispersion_coeffs_kind": str, # "Schott2x6" or "Sellmeier3T"
        "dispersion_coeffs": list[float],
    }

    Raises ValueError if catalog is unsupported.
    """

    def schott2x4() -> dict[str, str | list[float]]:
        keys= ["A0", "A1", "A2", "A3", "A4", "A5"]
        dispersion_coeffs = []
        for key in keys:
            dispersion_coeffs.append(float(data["dispersion coefficients"][key]))

            # pad to 6 coeffs to match with schott2x6 used by Hikari
            for _ in range(6 - len(keys)):
                dispersion_coeffs.append(0.0)

        return {
            "dispersion_coeffs_kind": "Schott2x6",
            "dispersion_coeffs": dispersion_coeffs,
        }

    def hikari() -> dict[str, str | list[float]]:
        keys = ["A0", "A1･λ^2", "A2･λ^4", "A3/λ^2", "A4/λ^4", "A5/λ^6", "A6/λ^8", "A7/λ^10", "A8/λ^12"]
        dispersion_coeffs = []
        for key in keys:
            unparsed_coeff = data["dispersion coefficients"][key]
            if unparsed_coeff == "-":
                parsed_coeff = 0.0
            else:
                parsed_coeff = float(unparsed_coeff)
            dispersion_coeffs.append(parsed_coeff)
        return {
            "dispersion_coeffs_kind": "Schott2x6",
            "dispersion_coeffs": dispersion_coeffs,
        }
    
    def sellmeier3t(catalog_name: str) -> dict[str, str | list[float]]:
        if catalog_name == "Schott":
            keys = ["B1", "B2", "B3", "C1", "C2", "C3"]
        elif catalog_name == "Ohara":
            keys = ["A1", "A2", "A3", "B1", "B2", "B3"]
        else:
            raise ValueError(f"Unsupported catalog for Sellmeier3T: {catalog_name}")

        dispersion_coeffs = []
        for key in keys:
            dispersion_coeffs.append(float(data["dispersion coefficients"][key]))
        return {
            "dispersion_coeffs_kind": "Sellmeier3T",
            "dispersion_coeffs": dispersion_coeffs,
        }
    
    match catalog_name:
        case "CDGM" | "Hoya" |"Sumita":
            return schott2x4()
        case "Hikari":
            return hikari()
        case "Schott" | "Ohara":
            return sellmeier3t(catalog_name)
        case _:
            raise ValueError(f"Unsupported catalog: {catalog_name}")
        


def _build_glass_entry(catalog_name: str, data: pd.Series) -> dict[str, float | dict[str, float] | list[float]]:
    """
    Build a single glass dict from a glass_data() Series.
    Return type:
    {
        "refractive_index_d": float,
        "refractive_index_e": float,
        "abbe_number_d": float,
        "abbe_number_e": float,
        "partial_dispersions": dict[str, float],
        "dispersion_coeff_kind": str, # "Schott2x6" or "Sellmeier3T"
        "dispersion_coeffs": list[float],
    }
    """
    nd = data["refractive indices"]["d"]
    ne = data["refractive indices"]["e"]

    vd = data["abbe number"]["vd"]
    ve = data["abbe number"]["ve"]

    partial_dispersions = _partial_dispersions(data)
    dispersion_coeff_data = _get_dispersion_coefficients(catalog_name, data)

    return {
        "refractive_index_d": nd,
        "refractive_index_e": ne,
        "abbe_number_d": vd,
        "abbe_number_e": ve,
        "partial_dispersions": partial_dispersions,
        "dispersion_coeff_kind": dispersion_coeff_data["dispersion_coeffs_kind"],
        "dispersion_coeffs": dispersion_coeff_data["dispersion_coeffs"],
    }


def get_glass_catalog_data(catalog_name: str) -> dict[str, dict]:
    """Return {glass_name: glass_dict} for all glasses in a catalog."""
    from opticalglass.glassfactory import fill_catalog_list

    catalogs = fill_catalog_list()
    catalog = catalogs[catalog_name]
    result: dict[str, dict] = {}
    for name in catalog.get_glass_names():
        data = catalog.glass_data(name)
        entry = _build_glass_entry(catalog_name, data)
        result[str(name)] = entry
    return result


def get_all_glass_catalogs_data() -> dict[str, dict[str, dict]]:
    """Return {catalog_name: {glass_name: glass_dict}} for all 6 catalogs + Special materials."""
    from .custom_materials import get_special_materials_data
    catalog_names = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
    result = {name: get_glass_catalog_data(name) for name in catalog_names}
    result.update(get_special_materials_data())
    return result
