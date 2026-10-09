"""Extract JSON-safe optical-glass catalog data.

Vendor catalogs come from opticalglass's spreadsheet-backed ``xls`` glass library,
whose ``glass_data`` exposes a multi-level series indexed by category and sub-key.
Partial dispersions use ``nF−nC`` as their denominator and return zero when it
cannot be computed, including when a catalog omits a required index. CDGM glasses
export as ``Sellmeier3T`` or ``Schott2x6`` following the formula their catalog row
provides; Hoya, Sumita, and Hikari coefficients export as ``Schott2x6``; Ohara and
Schott export as ``Sellmeier3T``. Glasses listed in ``legacy_glasses`` are appended
from opticalglass's AGF data. Bundled special materials may additionally use
``Sellmeier4T``.
"""


from __future__ import annotations
import math
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, cast

import pandas as pd
from rayoptics_web_utils.glass.helper import (_partial_dispersion)

if TYPE_CHECKING:
    from opticalglass.agf_glass import AGFMedium

    from rayoptics_web_utils.glass.helper import DispersionCoefficients, GlassEntry


def _available_index(indices: Mapping[str, float] | pd.Series, line: str) -> float | None:
    """Return one catalog refractive index, or ``None`` when it is unavailable.

    Args:
        indices: Refractive indices keyed by spectral line.
        line: Spectral line name.

    Returns:
        The finite index as a float, or ``None`` when missing or non-finite.
    """
    value = indices.get(line)
    if value is None or pd.isna(value):
        return None
    value = float(value)
    return value if math.isfinite(value) else None


def _partial_dispersions(data: Mapping[str, Mapping[str, float]] | pd.Series) -> dict[str, float]:
    """Return P_fe, P_Fd, and P_gF from indexed refractive indices.

    A dispersion whose indices are unavailable, or whose F–C denominator is zero,
    is zero.

    Args:
        data: Glass data whose ``"refractive indices"`` maps spectral lines to
            indices.

    Returns:
        P_fe, P_Fd, and P_gF from indexed refractive indices.
    """
    indices = cast("Mapping[str, float] | pd.Series", data["refractive indices"])
    nF, ne, nd, nC, ng = (
        _available_index(indices, line) for line in ("F", "e", "d", "C", "g")
    )

    def partial(n_short: float | None, n_long: float | None) -> float:
        if n_short is None or n_long is None or nF is None or nC is None:
            return 0.0
        return _partial_dispersion(n_short, n_long, nF, nC)

    return {
        "P_fe": partial(nF, ne),
        "P_Fd": partial(nF, nd),
        "P_gF": partial(ng, nF),
    }

def _get_dispersion_coefficients(catalog_name: str, data: pd.Series) -> DispersionCoefficients:
    """Return normalized coefficient kind and values for one catalog glass.

    CDGM rows carrying Sellmeier ``K``/``L`` coefficients export as six-value
    ``Sellmeier3T`` ``[K1, K2, K3, L1, L2, L3]``; other CDGM rows, Hoya, and Sumita
    export six Schott ``A0``–``A5`` values; Hikari exports its nine-term layout;
    Ohara and Schott retain six-value Sellmeier form. Unsupported catalogs raise
    ``ValueError``.

    Args:
        catalog_name: Name of the glass catalog.
        data: Source data to process.

    Returns:
        Normalized coefficient kind and values for one catalog glass.
    """

    def schott2x4() -> DispersionCoefficients:
        keys= ["A0", "A1", "A2", "A3", "A4", "A5"]
        dispersion_coeffs = []
        for key in keys:
            dispersion_coeffs.append(float(data["dispersion coefficients"][key]))  # pyright: ignore[reportArgumentType]  # MultiIndex lookup yields a scalar

            # pad to 6 coeffs to match with schott2x6 used by Hikari
            for _ in range(6 - len(keys)):
                dispersion_coeffs.append(0.0)

        return {
            "dispersion_coeffs_kind": "Schott2x6",
            "dispersion_coeffs": dispersion_coeffs,
        }

    def hikari() -> DispersionCoefficients:
        keys = ["A0", "A1･λ^2", "A2･λ^4", "A3/λ^2", "A4/λ^4", "A5/λ^6", "A6/λ^8", "A7/λ^10", "A8/λ^12"]
        dispersion_coeffs = []
        for key in keys:
            unparsed_coeff = data["dispersion coefficients"][key]
            if unparsed_coeff == "-":
                parsed_coeff = 0.0
            else:
                parsed_coeff = float(unparsed_coeff)  # pyright: ignore[reportArgumentType]  # MultiIndex lookup yields a scalar
            dispersion_coeffs.append(parsed_coeff)
        return {
            "dispersion_coeffs_kind": "Schott2x6",
            "dispersion_coeffs": dispersion_coeffs,
        }

    def sellmeier3t(catalog_name: str) -> DispersionCoefficients:
        if catalog_name == "Schott":
            keys = ["B1", "B2", "B3", "C1", "C2", "C3"]
        elif catalog_name == "Ohara":
            keys = ["A1", "A2", "A3", "B1", "B2", "B3"]
        else:
            raise ValueError(f"Unsupported catalog for Sellmeier3T: {catalog_name}")

        dispersion_coeffs = []
        for key in keys:
            dispersion_coeffs.append(float(data["dispersion coefficients"][key]))  # pyright: ignore[reportArgumentType]  # MultiIndex lookup yields a scalar
        return {
            "dispersion_coeffs_kind": "Sellmeier3T",
            "dispersion_coeffs": dispersion_coeffs,
        }

    def cdgm() -> DispersionCoefficients:
        from opticalglass.cdgm import decode_dispersion_coefs

        coefs, interp_formula = decode_dispersion_coefs(data)
        if interp_formula == "sellmeier":
            # Catalog order is K1, L1, K2, L2, K3, L3.
            return {
                "dispersion_coeffs_kind": "Sellmeier3T",
                "dispersion_coeffs": [float(c) for c in [*coefs[0::2], *coefs[1::2]]],
            }
        return {
            "dispersion_coeffs_kind": "Schott2x6",
            "dispersion_coeffs": [float(c) for c in coefs],
        }

    match catalog_name:
        case "CDGM":
            return cdgm()
        case "Hoya" | "Sumita":
            return schott2x4()
        case "Hikari":
            return hikari()
        case "Schott" | "Ohara":
            return sellmeier3t(catalog_name)
        case _:
            raise ValueError(f"Unsupported catalog: {catalog_name}")



def _build_glass_entry(catalog_name: str, data: pd.Series) -> GlassEntry:
    """Return one frontend glass entry from an ``opticalglass`` data series.

    Includes d/e indices and Abbe numbers, partial dispersions, coefficient kind, and
    coefficient values.

    Args:
        catalog_name: Name of the glass catalog.
        data: Source data to process.

    Returns:
        One frontend glass entry from an ``opticalglass`` data series.
    """
    # MultiIndex lookups yield scalars; pandas types them as ``Series | Any``.
    nd = cast("float", data["refractive indices"]["d"])
    ne = cast("float", data["refractive indices"]["e"])

    vd = cast("float", data["abbe number"]["vd"])
    ve = cast("float", data["abbe number"]["ve"])

    partial_dispersions = _partial_dispersions(data)
    dispersion_coeff_data = _get_dispersion_coefficients(catalog_name, data)

    return {
        "refractiveIndexD": nd,
        "refractiveIndexE": ne,
        "abbeNumberD": vd,
        "abbeNumberE": ve,
        "partialDispersions": partial_dispersions,
        "dispersionCoeffKind": dispersion_coeff_data["dispersion_coeffs_kind"],
        "dispersionCoeffs": dispersion_coeff_data["dispersion_coeffs"],
    }


def _agf_dispersion_coefficients(glass_record: Mapping[str, Any]) -> DispersionCoefficients:
    """Return normalized coefficient kind and values for one Zemax AGF glass.

    AGF formula 1 (Schott) exports six ``Schott2x6`` values, formula 13 (Hikari)
    exports the nine-term ``Schott2x6`` layout, and formula 2 (Sellmeier 1)
    exports ``Sellmeier3T`` ``[K1, K2, K3, L1, L2, L3]``. Other formulas raise
    ``ValueError``.

    Args:
        glass_record: ZemaxGlass record with ``dispform`` and ``cd`` entries.

    Returns:
        Normalized coefficient kind and values.
    """
    coefficients = [float(c) for c in glass_record["cd"]]
    match glass_record["dispform"]:
        case 1:
            return {"dispersion_coeffs_kind": "Schott2x6", "dispersion_coeffs": coefficients[:6]}
        case 13:
            return {"dispersion_coeffs_kind": "Schott2x6", "dispersion_coeffs": coefficients[:9]}
        case 2:
            # AGF order is K1, L1, K2, L2, K3, L3.
            return {
                "dispersion_coeffs_kind": "Sellmeier3T",
                "dispersion_coeffs": [*coefficients[0:6:2], *coefficients[1:6:2]],
            }
        case unsupported:
            raise ValueError(f"Unsupported AGF dispersion formula: {unsupported}")


def _build_agf_glass_entry(medium: AGFMedium) -> GlassEntry:
    """Return one frontend glass entry computed from an opticalglass AGF medium.

    Indices are evaluated from the AGF dispersion formula. ``vd`` uses the d, F,
    and C lines; ``ve`` uses the e, F', and C' lines.

    Args:
        medium: opticalglass ``AGFMedium`` exposing ``rindex`` and ``glass_rec``.

    Returns:
        One frontend glass entry with the same keys as spreadsheet entries.
    """
    lines = ("d", "e", "F", "C", "g", "F'", "C'")
    indices = {line: float(medium.rindex(line)) for line in lines}
    dispersion_coeff_data = _agf_dispersion_coefficients(medium.glass_rec)

    return {
        "refractiveIndexD": indices["d"],
        "refractiveIndexE": indices["e"],
        "abbeNumberD": (indices["d"] - 1.0) / (indices["F"] - indices["C"]),
        "abbeNumberE": (indices["e"] - 1.0) / (indices["F'"] - indices["C'"]),
        "partialDispersions": _partial_dispersions({"refractive indices": indices}),
        "dispersionCoeffKind": dispersion_coeff_data["dispersion_coeffs_kind"],
        "dispersionCoeffs": dispersion_coeff_data["dispersion_coeffs"],
    }


def get_glass_catalog_data(catalog_name: str) -> dict[str, GlassEntry]:
    """Return every valid glass entry in a named vendor catalog.

    Reads the vendor spreadsheet catalog from opticalglass's central ``xls``
    library, then appends the catalog's ``LEGACY_AGF_GLASSES`` resolved through
    ``create_glass``. Spreadsheet catalog lookup is case-insensitive and the
    nested values are JSON serialisable.

    Args:
        catalog_name: Name of the glass catalog.

    Returns:
        Every valid glass entry in a named catalog.
    """
    from opticalglass.glassfactory import create_glass, og_glass_libs
    from rayoptics_web_utils.glass.legacy_glasses import LEGACY_AGF_GLASSES

    catalog = og_glass_libs["xls"][catalog_name]
    result: dict[str, GlassEntry] = {}
    for name in catalog.get_glass_names():
        data = catalog.glass_data(name)
        entry = _build_glass_entry(catalog_name, data)
        result[str(name)] = entry
    for name in LEGACY_AGF_GLASSES.get(catalog_name, ()):
        if name not in result:
            # Legacy names resolve only through opticalglass's AGF library.
            result[name] = _build_agf_glass_entry(cast("AGFMedium", create_glass(name, catalog_name)))
    return result


def get_all_glass_catalogs_data() -> dict[str, dict[str, GlassEntry]]:
    """Return the six standard catalogs plus bundled ``Special`` materials.

    Args:
        None.

    Returns:
        The six standard catalogs plus bundled ``Special`` materials.
    """
    from .custom_materials import get_special_materials_data
    catalog_names = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
    result = {name: get_glass_catalog_data(name) for name in catalog_names}
    result.update(get_special_materials_data())
    return result
