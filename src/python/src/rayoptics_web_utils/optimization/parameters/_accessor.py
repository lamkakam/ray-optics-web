"""Shared contract and helpers for constructional-parameter accessors.

A ``ParameterAccessor`` reads and writes the RayOptics value addressed by one
family of parameter references. Each surface-property module (``radius``,
``thickness``, ``aspherical``, ``decenter``) defines one accessor, and the
package registry dispatches on the reference ``kind``.
"""

from __future__ import annotations

import math
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
        natural_unit: Returns the referenced parameter's characteristic step in
            optimizer units (curvature for radius), used by least squares to
            scale its variables. Properties that shape the surface sag return
            the change that moves the edge sag by about one model unit;
            others keep the default ``1.0``. It never mutates the model.
    """

    kinds: frozenset[ConstructionalParameterKind]
    read: Callable[[OpticalModel, MutableParameter], float]
    write: Callable[[OpticalModel, MutableParameter, float], None]
    natural_unit: Callable[[OpticalModel, MutableParameter], float] = lambda _opm, _entry: 1.0


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


def surface_semi_diameter(opm: OpticalModel, surface_index: int) -> float | None:
    """Returns the semi-diameter of interface ``surface_index``, or ``None`` unless finite and positive."""
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, surface_index, "surface_index")
    semi_diameter = float(sm.ifcs[surface_index].surface_od())
    if not math.isfinite(semi_diameter) or semi_diameter <= 0.0:
        return None
    return semi_diameter


def edge_sag_unit(opm: OpticalModel, surface_index: int, power: int) -> float:
    """Returns ``h**-power`` for semi-diameter ``h``, the term coefficient that adds one unit of edge sag.

    Falls back to ``1.0`` when the surface has no usable semi-diameter.
    """
    semi_diameter = surface_semi_diameter(opm, surface_index)
    if semi_diameter is None:
        return 1.0
    return semi_diameter ** -power
