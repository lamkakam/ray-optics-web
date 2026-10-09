"""Extract first-order paraxial data."""

from __future__ import annotations
from typing import TYPE_CHECKING

from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_data

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel



def get_first_order_data(opm: OpticalModel) -> dict[str, float]:
    """Return first-order paraxial data from a RayOptics `OpticalModel`.

    - Reads the model's cached `analysis_results["parax_data"]` through
      `corrected_parax_data`, which rescales aperture-dependent values
      (`opt_inv`, `fno`, `obj_na`, `img_na`, `enp_radius`, `exp_radius`) for
      NA-specified pupils so that the reported NA in the specified space equals
      the spec. RayOptics 0.9.10 otherwise applies the refractive index twice.
      Other pupil types return RayOptics' values unchanged.
    - Returns a flat `dict[str, float]`.
    - Includes only `int` and `float` attributes from `fod.__dict__`.
    - Casts all included values to `float` for JSON serialisability.

    Args:
        opm: RayOptics optical model.

    Returns:
        First-order paraxial data from a RayOptics `OpticalModel`.
    """
    # WORKAROUND(rayoptics 0.9.10 NA bug): read `fod` directly from
    # `opm["analysis_results"]["parax_data"]` again once
    # tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    fod = corrected_parax_data(opm).fod
    return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}
