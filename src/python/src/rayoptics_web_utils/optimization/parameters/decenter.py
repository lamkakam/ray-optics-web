"""Accessor for tilt (Euler angles) and decenter (x/y offsets) components.

References carry the RayOptics coordinate strategy (``decenter_type``); writing
to an interface without decenter data creates it with that strategy, and an
existing decenter with a different strategy is rejected. Pickup sources may be
read without materializing (``materialize: False``), in which case an absent
decenter reads as zero. ``rayoptics.elem.surface`` is GUI-free and safe to import.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from rayoptics.elem.surface import DecenterData

from ._accessor import ParameterAccessor, validate_surface_index

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

    from .._types import ConstructionalParameterKind, MutableParameter

DECENTER_KINDS: dict[ConstructionalParameterKind, tuple[str, int]] = {
    "decenter_alpha": ("euler", 0),
    "decenter_beta": ("euler", 1),
    "decenter_gamma": ("euler", 2),
    "decenter_x": ("dec", 0),
    "decenter_y": ("dec", 1),
}
"""``DecenterData`` attribute and slot written by each tilt/decenter kind."""
DECENTER_TYPES = {"bend", "dec and return", "decenter", "reverse"}


def ensure_decenter_data(opm: OpticalModel, entry: MutableParameter, *, materialize: bool = True) -> DecenterData | None:
    """Return compatible decenter data, optionally leaving an absent source untouched."""
    if entry["kind"] not in DECENTER_KINDS:
        return None
    decenter_type = entry.get("decenter_type")
    if decenter_type not in DECENTER_TYPES:
        raise ValueError(f"Unknown decenter type: {decenter_type}")
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    ifc = sm.ifcs[entry["surface_index"]]
    existing = getattr(ifc, "decenter", None)
    if existing is None:
        if not materialize:
            return None
        ifc.decenter = DecenterData(decenter_type)
        return ifc.decenter
    if existing.dtype != decenter_type and materialize:
        raise ValueError(
            f"Surface {entry['surface_index']} already has decenter type {existing.dtype}, not {decenter_type}"
        )
    return existing


def _read(opm: OpticalModel, entry: MutableParameter) -> float:
    data = ensure_decenter_data(opm, entry, materialize=entry.get("materialize", True))
    if data is None:
        return 0.0
    attribute, index = DECENTER_KINDS[entry["kind"]]
    return float(getattr(data, attribute)[index])


def _write(opm: OpticalModel, entry: MutableParameter, value: float) -> None:
    data = ensure_decenter_data(opm, entry)
    attribute, index = DECENTER_KINDS[entry["kind"]]
    getattr(data, attribute)[index] = float(value)


DECENTER_ACCESSOR = ParameterAccessor(kinds=frozenset(DECENTER_KINDS), read=_read, write=_write)
"""Reads and writes one Euler angle or offset of ``seq_model.ifcs[surface_index].decenter``."""
