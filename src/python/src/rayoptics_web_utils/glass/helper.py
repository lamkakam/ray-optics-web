from typing import TypedDict


class DispersionCoefficients(TypedDict):
    """Normalized dispersion-formula kind and coefficient values for one glass."""

    dispersion_coeffs_kind: str
    dispersion_coeffs: list[float]


class GlassEntry(TypedDict):
    """One frontend glass entry; camelCase keys match the TypeScript worker contract.

    ``dispersionCoeffs`` holds formula coefficients, or ``(wavelength_nm, index)``
    pairs when ``dispersionCoeffKind`` is ``"tabulated"``.
    """

    refractiveIndexD: float
    refractiveIndexE: float
    abbeNumberD: float
    abbeNumberE: float
    partialDispersions: dict[str, float]
    dispersionCoeffKind: str
    dispersionCoeffs: list[float] | list[tuple[float, float]]


# Fraunhofer wavelengths in μm
_WL_C  = 0.6563   # hydrogen C
_WL_D  = 0.5876   # helium d
_WL_E  = 0.5461   # mercury e
_WL_F  = 0.4861   # hydrogen F
_WL_G  = 0.4358   # mercury g

def _abbe_number(n_center: float, nF: float, nC: float) -> float:
    """Compute Abbe number V = (nD - 1) / (nF - nC)
    Returns 0.0 if any cannot be computed.

    Args:
        n_center: Refractive index at the center wavelength.
        nF: Refractive index at the Fraunhofer F line.
        nC: Refractive index at the Fraunhofer C line.

    Returns:
        Abbe number, or `0.0` when it cannot be computed.
    """
    denom = nF - nC
    if denom == 0.0:
        return 0.0
    return (n_center - 1) / denom

def _partial_dispersion(n_short_wl: float, n_long_wl: float, nF: float, nC: float) -> float:
    """Compute partial dispersion P = (n_long_wl - n_short_wl) / (nF - nC)
    Returns 0.0 if any cannot be computed.

    Args:
        n_short_wl: Refractive index at the shorter wavelength.
        n_long_wl: Refractive index at the longer wavelength.
        nF: Refractive index at the Fraunhofer F line.
        nC: Refractive index at the Fraunhofer C line.

    Returns:
        Partial dispersion, or `0.0` when it cannot be computed.
    """
    denom = nF - nC
    if denom == 0.0:
        return 0.0
    return (n_short_wl - n_long_wl) / denom
