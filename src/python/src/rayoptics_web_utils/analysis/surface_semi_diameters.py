"""Sequential-interface semi-diameter extraction."""


def get_surface_semi_diameters(opm) -> list[float]:
    """Return ``surface_od`` for Object, physical surfaces, and Image in order."""
    return [float(ifc.surface_od()) for ifc in opm.seq_model.ifcs]
