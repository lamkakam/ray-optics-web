"""# `python/src/rayoptics_web_utils/analysis/first_order.py`

First-order paraxial data extraction."""

from rayoptics.environment import OpticalModel


def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data as a dict of floats.

    ## Purpose

    Extract first-order paraxial data from a RayOptics `OpticalModel`.

    ## Behavior

    - Reads `opm["parax_model"].opt_model["analysis_results"]["parax_data"].fod`.
    - Returns a flat `dict[str, float]`.
    - Includes only `int` and `float` attributes from `fod.__dict__`.
    - Casts all included values to `float` for JSON serialisability."""
    pm = opm["parax_model"]
    fod = pm.opt_model["analysis_results"]["parax_data"].fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}
