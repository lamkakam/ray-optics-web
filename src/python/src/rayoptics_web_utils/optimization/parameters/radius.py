"""Accessor for the curvature radius of an interface (physical surfaces and the image plane)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._accessor import ParameterAccessor, validate_surface_index

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

    from .._types import MutableParameter


def _read(opm: OpticalModel, entry: MutableParameter) -> float:
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    return float(sm.ifcs[entry["surface_index"]].profile.r)


def _write(opm: OpticalModel, entry: MutableParameter, value: float) -> None:
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    sm.ifcs[entry["surface_index"]].profile.r = float(value)


RADIUS_ACCESSOR = ParameterAccessor(kinds=frozenset({"radius"}), read=_read, write=_write)
"""Reads and writes ``profile.r`` (radius, not curvature) of ``seq_model.ifcs[surface_index]``."""
