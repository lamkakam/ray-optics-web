"""Extract third-order Seidel aberration data."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from rayoptics.parax.thirdorder import (
    compute_third_order,
    seidel_to_field_curv,
    seidel_to_transverse_aberration,
    seidel_to_wavefront,
)

from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_model_view

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

key_of_3rd_order_seidel_data = Literal["surfaceBySurface", "transverse", "wavefront", "curvature"]


def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]:
    """Return third-order Seidel data from a RayOptics `OpticalModel`.

    The result maps `surfaceBySurface` to per-surface coefficients,
    `transverse` to transverse aberration, `wavefront` to wavefront error, and
    `curvature` to field curvature. `surfaceBySurface` contains `aberrTypes`,
    `surfaceLabels`, and transposed numeric `data`.

    Aggregate outputs use the third-order package's `"sum"` row. The central
    wavelength is converted to system units for `seidel_to_wavefront`, and all
    returned dict/list values are JSON serialisable.

    Coefficients and aggregates use `corrected_parax_model_view`, so an
    NA-specified pupil uses the paraxial axial ray whose NA equals the spec
    rather than RayOptics 0.9.10's index-doubled one.

    Args:
        opm: RayOptics optical model.

    Returns:
        Third-order Seidel data from a RayOptics `OpticalModel`.
    """
    # WORKAROUND(rayoptics 0.9.10 NA bug): use `opm` and its cached `fod`
    # directly again once
    # tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    paraxial_model = corrected_parax_model_view(opm)
    to_pkg = compute_third_order(paraxial_model)
    fod = paraxial_model["analysis_results"]["parax_data"].fod
    wvls = opm["optical_spec"]["wvls"]
    seidel_sum = to_pkg.loc["sum"]
    surface_by_surface = {
        "aberrTypes": to_pkg.columns.tolist(),
        "surfaceLabels": to_pkg.index.tolist(),
        "data": to_pkg.T.values.tolist(),
    }
    transverse = seidel_to_transverse_aberration(seidel_sum, fod.n_img, fod.img_na)
    wavefront = seidel_to_wavefront(seidel_sum, opm.nm_to_sys_units(wvls.central_wvl))
    curvature = seidel_to_field_curv(seidel_sum, fod.n_img, fod.opt_inv)
    return {
        "surfaceBySurface": surface_by_surface,
        "transverse": transverse.to_dict(),
        "wavefront": wavefront.to_dict(),
        "curvature": curvature.to_dict(),
    }
