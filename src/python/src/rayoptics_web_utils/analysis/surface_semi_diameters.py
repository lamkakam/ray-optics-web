"""Extract sequential-interface semi-diameters."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel


def get_surface_semi_diameters(opm: OpticalModel) -> list[float]:
    """Return ``surface_od`` for Object, physical surfaces, and Image in order.

    Returns built-in `float` values from `surface_od()` for every `opm.seq_model.ifcs` entry in sequential order, including Object and Image.

    Args:
        opm: RayOptics optical model.

    Returns:
        ``surface_od`` for Object, physical surfaces, and Image in order.
    """
    return [float(ifc.surface_od()) for ifc in opm.seq_model.ifcs]
