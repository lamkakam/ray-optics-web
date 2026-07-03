# Fraunhofer wavelengths in μm
_WL_C  = 0.6563   # hydrogen C
_WL_D  = 0.5876   # helium d
_WL_E  = 0.5461   # mercury e
_WL_F  = 0.4861   # hydrogen F
_WL_G  = 0.4358   # mercury g

def _abbe_number(n_center, nF, nC) -> float:
    """
    Compute Abbe number V = (nD - 1) / (nF - nC)
    Returns 0.0 if any cannot be computed.
    """
    denom = nF - nC
    if denom == 0.0:
        return 0.0
    return (n_center - 1) / denom

def _partial_dispersion(n_short_wl, n_long_wl, nF, nC) -> float:
    """
    Compute partial dispersion P = (n_long_wl - n_short_wl) / (nF - nC)
    Returns 0.0 if any cannot be computed.
    """
    denom = nF - nC
    if denom == 0.0:
        return 0.0
    return (n_short_wl - n_long_wl) / denom
