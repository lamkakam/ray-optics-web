"""Shared contract and helpers for constructional-parameter accessors.

A ``ParameterAccessor`` reads and writes the RayOptics value addressed by one
family of parameter references. Each surface-property module (``radius``,
``thickness``, ``aspherical``, ``decenter``) defines one accessor, and the
package registry dispatches on the reference ``kind``.
"""

from __future__ import annotations

from collections.abc import Callable, Sized
from dataclasses import dataclass
from typing import TYPE_CHECKING

from .._types import ConstructionalParameterKind, MutableParameter

if TYPE_CHECKING:
    from rayoptics.elem.profiles import SurfaceProfile
    from rayoptics.optical.opticalmodel import OpticalModel


@dataclass(frozen=True)
class ParameterAccessor:
    """Reads and writes the parameters of one surface property.

    Attributes:
        kinds: Wire kinds handled by this accessor.
        read: Returns the referenced value from the model.
        write: Stores a value into the model, materializing missing structures.
    """

    kinds: frozenset[ConstructionalParameterKind]
    read: Callable[[OpticalModel, MutableParameter], float]
    write: Callable[[OpticalModel, MutableParameter, float], None]


def radius_to_curvature(radius: float) -> float:
    """Converts a radius to curvature; zero (flat) maps to zero."""
    if radius == 0.0:
        return 0.0
    return 1.0 / radius


def curvature_to_radius(curvature: float) -> float:
    """Converts a curvature to radius; zero (flat) maps to zero."""
    if curvature == 0.0:
        return 0.0
    return 1.0 / curvature


def validate_surface_index(seq: Sized, index: object, label: str) -> None:
    """Raises ``IndexError`` unless ``index`` is an integer position within ``seq``."""
    if not isinstance(index, int) or index < 0 or index >= len(seq):
        raise IndexError(f"{label} {index} is out of range")


def surface_profile(opm: OpticalModel, surface_index: int) -> SurfaceProfile:
    """Returns the profile of interface ``surface_index`` after validating the index."""
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, surface_index, "surface_index")
    return sm.ifcs[surface_index].profile
