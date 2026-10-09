"""Share finite-image transverse-aberration spot sampling."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING, cast

import numpy as np
import rayoptics.optical.model_constants as mc

if TYPE_CHECKING:
    from numpy.typing import ArrayLike, NDArray
    from rayoptics.raytr import RayPkg
    from rayoptics.raytr.opticalspec import Field

    from rayoptics_web_utils._rayoptics_types import RefSphere

# Returned for an empty spot so optimizers see a large finite metric.
_EMPTY_SPOT_RMS = 1e6


def _transverse_aberration(ray_pkg: RayPkg, fld: Field, foc: float) -> NDArray[np.float64]:
    """Return the xy offset of a final ray from the field reference point after refocus.

    The final ray segment is projected by `foc / direction_z` along its
    direction and compared with `fld.ref_sphere[0]`, the chief-ray image point
    prepared by RayOptics for the same focus.

    Args:
        ray_pkg: Traced RayOptics ray package.
        fld: RayOptics field specification with a prepared `ref_sphere`.
        foc: Focus shift in system length units.

    Returns:
        The transverse aberration `[x, y]` in system length units.
    """
    image_pt = cast("RefSphere", fld.ref_sphere)[0]
    ray = ray_pkg[mc.ray]
    dist = foc / ray[-1][mc.d][2]
    defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
    t_abr = defocused_pt - image_pt
    return np.array([t_abr[0], t_abr[1]])


def _spot_fn(
    p: ArrayLike, wi: int, ray_pkg: RayPkg | None, fld: Field, wvl: float, foc: float
) -> NDArray[np.float64] | None:
    """Transverse aberration function for `trace_grid`.

    Args:
        p: Normalized pupil coordinate.
        wi: Wavelength index.
        ray_pkg: Traced ray package.
        fld: RayOptics field specification.
        wvl: Wavelength in nanometres.
        foc: Focus shift in system length units.

    Returns:
        The transverse aberration vector, or `None` for a blocked ray.
    """
    del p, wi, wvl
    if ray_pkg is not None:
        return _transverse_aberration(ray_pkg, fld, foc)
    return None


def _rms_radius(points: Sequence[NDArray[np.float64]]) -> float:
    """Return the RMS radius of transverse spot points.

    Args:
        points: Sequence of `[x, y]` spot offsets.

    Returns:
        `sqrt(mean(x² + y²))`, or `1e6` when there are no points.
    """
    if len(points) == 0:
        return _EMPTY_SPOT_RMS
    xs = np.array([point[0] for point in points], dtype=float)
    ys = np.array([point[1] for point in points], dtype=float)
    return float(np.sqrt(np.mean(xs ** 2 + ys ** 2)))
