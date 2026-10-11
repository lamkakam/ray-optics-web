"""Accessor for the thickness of the gap after a physical surface."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._accessor import ParameterAccessor, validate_surface_index

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

    from .._types import MutableParameter


def _read(opm: OpticalModel, entry: MutableParameter) -> float:
    sm = opm["seq_model"]
    validate_surface_index(sm.gaps, entry["surface_index"], "surface_index")
    return float(sm.gaps[entry["surface_index"]].thi)


def _write(opm: OpticalModel, entry: MutableParameter, value: float) -> None:
    sm = opm["seq_model"]
    validate_surface_index(sm.gaps, entry["surface_index"], "surface_index")
    sm.gaps[entry["surface_index"]].thi = float(value)


THICKNESS_ACCESSOR = ParameterAccessor(kinds=frozenset({"thickness"}), read=_read, write=_write)
"""Reads and writes ``thi`` of ``seq_model.gaps[surface_index]``."""
