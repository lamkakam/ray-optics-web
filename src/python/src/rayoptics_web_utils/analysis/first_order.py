"""First-order paraxial data extraction."""

from rayoptics.environment import OpticalModel


def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data as a dict of floats."""
    pm = opm["parax_model"]
    fod = pm.opt_model["analysis_results"]["parax_data"].fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}
