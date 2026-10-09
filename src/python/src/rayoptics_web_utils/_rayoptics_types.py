"""Name the RayOptics tuples that upstream returns without a type alias.

RayOptics 0.9.10 annotates ray packages and coordinate arrays but returns the
chief-ray package, its exit-pupil segment and the reference sphere as bare
tuples, and declares ``Field.chief_ray``/``Field.ref_sphere`` as ``None``.
These aliases describe the values the package reads and stores there. The
RayOptics names are imported only for type checking, so importing this module
never loads RayOptics.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from rayoptics.coord_geometry_types import Dir3d, Tfm3d, Vec3d
    from rayoptics.raytr import RayPkg
    from rayoptics.seq.interface import Interface


type ExitPupilSegment = tuple[Vec3d, Dir3d, float, Interface, Vec3d, Dir3d]
"""Chief-ray exit-pupil point, direction, distance, last interface and pre-transfer point and direction."""

type ChiefRayPkg = tuple[RayPkg, ExitPupilSegment]
"""Chief ray traced at one wavelength paired with its exit-pupil segment."""

type RefSphere = tuple[Vec3d, Dir3d, float, Tfm3d]
"""Image point, reference direction, reference-sphere radius and last local transform."""

type RayGridEntry = Sequence[Any]
"""One raw ray-grid sample ``[p_x, p_y, ray_pkg]``; ``ray_pkg`` is a ``RayPkg`` or ``None`` when blocked."""

type RawRayGrid = Sequence[Sequence[RayGridEntry]]
"""Rows of raw ray-grid samples as returned by RayOptics' ``trace_ray_grid``."""
