"""Extract third-order Seidel and primary chromatic aberration data."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from rayoptics.parax.thirdorder import (
    seidel_to_field_curv,
    seidel_to_transverse_aberration,
    seidel_to_wavefront,
)

from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_model_view
from rayoptics_web_utils._third_order_color_asphere_workaround import (
    compute_third_order_and_color_with_aspheres,
)

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

key_of_3rd_order_seidel_data = Literal["surfaceBySurface", "transverse", "wavefront", "curvature"]

SEIDEL_TYPES = ["S-I", "S-II", "S-III", "S-IV", "S-V"]
"""Seidel columns accepted by RayOptics' ``seidel_to_*`` converters."""


def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]:
    """Return third-order Seidel and primary colour data from an `OpticalModel`.

    The result maps `surfaceBySurface` to per-surface coefficients,
    `transverse` to transverse aberration, `wavefront` to wavefront error, and
    `curvature` to field curvature. `surfaceBySurface` contains `aberrTypes`
    (`S-I`..`S-V`, then the primary colour coefficients `C-I` for axial colour
    and `C-II` for lateral colour), `surfaceLabels`, and transposed numeric
    `data` from RayOptics' `compute_third_order_and_color`.

    RayOptics computes `C-I` and `C-II` from the index difference between the
    first and last wavelengths in the spectral list, so reversing the list flips
    their sign; RayOptics 0.9.10 reports zeros unless at least three
    wavelengths are defined.

    Aggregate outputs use the third-order package's `"sum"` row. Transverse,
    curvature and the Seidel wavefront terms use only `S-I`..`S-V`. `wavefront`
    additionally holds the primary colour terms `W020 = C-I / 2` (axial colour)
    and `W111 = C-II` (lateral colour). Every wavefront value is in waves of the
    central wavelength converted to system units, and all returned dict/list
    values are JSON serialisable.

    Coefficients and aggregates use `corrected_parax_model_view`, so an
    NA-specified pupil uses the paraxial axial ray whose NA equals the spec
    rather than RayOptics 0.9.10's index-doubled one. Aspheric surfaces use
    `compute_third_order_and_color_with_aspheres`, so their `"<surface>.asp"`
    rows carry Seidel terms and zero colour terms.

    Args:
        opm: RayOptics optical model.

    Returns:
        Third-order Seidel and primary colour data from a RayOptics `OpticalModel`.
    """
    # WORKAROUND(rayoptics 0.9.10 NA bug): use `opm` and its cached `fod`
    # directly again once
    # tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    paraxial_model = corrected_parax_model_view(opm)
    # WORKAROUND(rayoptics 0.9.10 third-order colour asphere bug): call
    # `compute_third_order_and_color` directly again once
    # tests/rayoptics_web_utils/test_rayoptics_third_order_color_bugs.py::test_aspheric_surface_raises_length_mismatch fails.
    to_pkg = compute_third_order_and_color_with_aspheres(paraxial_model)
    fod = paraxial_model["analysis_results"]["parax_data"].fod
    wvls = opm["optical_spec"]["wvls"]
    central_wvl = opm.nm_to_sys_units(wvls.central_wvl)
    third_order_sum = to_pkg.loc["sum"]
    seidel_sum = third_order_sum[SEIDEL_TYPES]
    surface_by_surface = {
        "aberrTypes": to_pkg.columns.tolist(),
        "surfaceLabels": to_pkg.index.tolist(),
        "data": to_pkg.T.values.tolist(),
    }
    transverse = seidel_to_transverse_aberration(seidel_sum, fod.n_img, fod.img_na)
    wavefront = seidel_to_wavefront(seidel_sum, central_wvl)
    curvature = seidel_to_field_curv(seidel_sum, fod.n_img, fod.opt_inv)
    return {
        "surfaceBySurface": surface_by_surface,
        "transverse": transverse.to_dict(),
        "wavefront": {
            **wavefront.to_dict(),
            "W020": float(0.5 * third_order_sum["C-I"] / central_wvl),
            "W111": float(third_order_sum["C-II"] / central_wvl),
        },
        "curvature": curvature.to_dict(),
    }
