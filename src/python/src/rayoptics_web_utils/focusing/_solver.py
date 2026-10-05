"""Share one bounded best-focus search between focusing and focus analyses."""

from collections.abc import Callable

from scipy.optimize import minimize_scalar

# Search window, in system length units, around the paraxial image position.
DEFAULT_FOCUS_BOUNDS: tuple[float, float] = (-5.0, 5.0)


def _paraxial_focus_offset(opm) -> float:
    """Return the paraxial image distance minus the current final gap thickness.

    This is the focus shift from the current image plane to the paraxial image
    for the current conjugates, in system length units.

    Args:
        opm: RayOptics optical model.

    Returns:
        The paraxial focus offset from the current image plane.
    """
    img_dist = float(opm['analysis_results']['parax_data'].fod.img_dist)
    return img_dist - float(opm['seq_model'].gaps[-1].thi)


def _minimize_focus(
    objective: Callable[[float], float],
    center: float,
    bounds: tuple[float, float] = DEFAULT_FOCUS_BOUNDS,
    xatol: float | None = None,
) -> float:
    """Return the focus shift minimizing `objective` within bounds around `center`.

    Uses SciPy's bounded Brent search over `[center + bounds[0], center + bounds[1]]`,
    so a minimum outside the window is clamped to its nearest edge.

    Args:
        objective: Scalar focus metric to minimize, taking a focus shift.
        center: Focus shift at the centre of the search window.
        bounds: `(lo, hi)` offsets from `center` in system length units.
        xatol: Absolute focus tolerance in system length units, or `None` for
            SciPy's default (`1e-5`). A looser tolerance stops after fewer
            objective evaluations.

    Returns:
        The minimizing focus shift.
    """
    options = {} if xatol is None else {'xatol': xatol}
    result = minimize_scalar(
        objective,
        bounds=(center + bounds[0], center + bounds[1]),
        method='bounded',
        options=options,
    )
    return float(result.x)
