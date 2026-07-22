"""Extract first-order paraxial data."""

from rayoptics.environment import OpticalModel


def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data from a RayOptics `OpticalModel`.

    - Reads `opm["parax_model"].opt_model["analysis_results"]["parax_data"].fod`.
    - Returns a flat `dict[str, float]`.
    - Includes only `int` and `float` attributes from `fod.__dict__`.
    - Casts all included values to `float` for JSON serialisability.
    """
    pm = opm["parax_model"]
    fod = pm.opt_model["analysis_results"]["parax_data"].fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}
