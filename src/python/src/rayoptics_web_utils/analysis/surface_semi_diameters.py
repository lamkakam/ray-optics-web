"""# `surface_semi_diameters.py`

Sequential-interface semi-diameter extraction."""


def get_surface_semi_diameters(opm) -> list[float]:
    """Return ``surface_od`` for Object, physical surfaces, and Image in order.

    Returns built-in `float` values from `surface_od()` for every `opm.seq_model.ifcs` entry in sequential order, including Object and Image.
    """
    return [float(ifc.surface_od()) for ifc in opm.seq_model.ifcs]
