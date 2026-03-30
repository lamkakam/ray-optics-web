"""Glass catalog data extraction from opticalglass."""

from __future__ import annotations

import math

import pandas as pd


def _safe_float(data: pd.Series, key: tuple) -> float | None:
    """Return float value for key, or None if key is missing or NaN."""
    try:
        val = data[key]
    except KeyError:
        return None
    if val is None:
        return None
    try:
        f = float(val)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def _partial_dispersions(data: pd.Series) -> dict[str, float] | None:
    """Compute P_F_e, P_F_d, P_g_F from refractive index lines. Returns None if any cannot be computed."""
    nF = _safe_float(data, ("refractive indices", "F"))
    ne = _safe_float(data, ("refractive indices", "e"))
    nd = _safe_float(data, ("refractive indices", "d"))
    nC = _safe_float(data, ("refractive indices", "C"))
    ng = _safe_float(data, ("refractive indices", "g"))

    if nF is None or ne is None or nd is None or nC is None or ng is None:
        return None
    denom = nF - nC
    if denom == 0.0:
        return None
    return {
        "P_F_e": (nF - ne) / denom,
        "P_F_d": (nF - nd) / denom,
        "P_g_F": (ng - nF) / denom,
    }


def _build_glass_entry(data: pd.Series) -> dict | None:
    """Build a single glass dict from a glass_data() Series. Returns None if nd, ne, vd, ve, or any partial dispersion is missing."""
    nd = _safe_float(data, ("refractive indices", "d"))
    if nd is None:
        nd = _safe_float(data, ("refractive index", "d"))

    ne = _safe_float(data, ("refractive indices", "e"))
    if ne is None:
        ne = _safe_float(data, ("refractive index", "e"))

    if nd is None or ne is None:
        return None

    vd = _safe_float(data, ("abbe number", "vd"))
    ve = _safe_float(data, ("abbe number", "ve"))
    if vd is None or ve is None:
        return None

    partial_dispersions = _partial_dispersions(data)
    if partial_dispersions is None:
        return None

    return {
        "refractive_index_d": nd,
        "refractive_index_e": ne,
        "abbe_number_d": vd,
        "abbe_number_e": ve,
        "partial_dispersions": partial_dispersions,
    }


def get_glass_catalog_data(catalog_name: str) -> dict[str, dict]:
    """Return {glass_name: glass_dict} for all glasses in a catalog."""
    from opticalglass.glassfactory import fill_catalog_list

    catalogs = fill_catalog_list()
    catalog = catalogs[catalog_name]
    result: dict[str, dict] = {}
    for name in catalog.get_glass_names():
        data = catalog.glass_data(name)
        entry = _build_glass_entry(data)
        if entry is not None:
            result[str(name)] = entry
    return result


def get_all_glass_catalogs_data() -> dict[str, dict[str, dict]]:
    """Return {catalog_name: {glass_name: glass_dict}} for all 6 catalogs."""
    catalog_names = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
    return {name: get_glass_catalog_data(name) for name in catalog_names}
