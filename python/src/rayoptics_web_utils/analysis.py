"""Analysis functions for extracting optical data from a rayoptics model."""

from typing import Literal
from rayoptics.environment import OpticalModel

from rayoptics.parax.thirdorder import (
    compute_third_order,
    seidel_to_transverse_aberration,
    seidel_to_wavefront,
    seidel_to_field_curv,
)


def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data as a dict of floats."""
    pm = opm['parax_model']
    fod = pm.opt_model['analysis_results']['parax_data'].fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}

key_of_3rd_order_seidel_data = Literal['surfaceBySurface', 'transverse', 'wavefront', 'curvature']
def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]:
    """Return 3rd-order Seidel aberration data as a dict."""
    to_pkg = compute_third_order(opm)
    fod = opm['analysis_results']['parax_data'].fod
    wvls = opm['optical_spec']['wvls']
    seidel_sum = to_pkg.loc['sum']
    surface_by_surface = {
        'aberrTypes': to_pkg.columns.tolist(),
        'surfaceLabels': to_pkg.index.tolist(),
        'data': to_pkg.T.values.tolist(),
    }
    transverse = seidel_to_transverse_aberration(seidel_sum, fod.n_img, fod.img_na)
    wavefront = seidel_to_wavefront(seidel_sum, wvls.central_wvl * 1e-6)  # convert to mm
    curvature = seidel_to_field_curv(seidel_sum, fod.n_img, fod.opt_inv)
    return {
        'surfaceBySurface': surface_by_surface,
        'transverse': transverse.to_dict(),
        'wavefront': wavefront.to_dict(),
        'curvature': curvature.to_dict(),
    }
