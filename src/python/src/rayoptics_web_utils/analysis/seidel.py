"""Extract third-order Seidel and primary chromatic aberration data."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

import pandas as pd
from rayoptics.parax.thirdorder import (
    seidel_to_field_curv,
    seidel_to_transverse_aberration,
)

from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_model_view
from rayoptics_web_utils._third_order_color_asphere_workaround import (
    compute_third_order_and_color_with_aspheres,
)

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

    from rayoptics_web_utils._finite_opd import FirstOrderDataModelView

key_of_3rd_order_seidel_data = Literal["surfaceBySurface", "transverse", "wavefront", "curvature"]

SEIDEL_TYPES = ["S-I", "S-II", "S-III", "S-IV", "S-V"]
"""Seidel columns accepted by RayOptics' ``seidel_to_*`` converters."""

_ASPHERIC_ROW_SUFFIX = ".asp"


def _merge_aspheric_rows(third_order: pd.DataFrame) -> pd.DataFrame:
    """Return `third_order` with each `"<surface>.asp"` row added into `"<surface>"`.

    The `.asp` rows are dropped and the remaining rows keep their order, so the
    `"sum"` row, which already includes the aspheric contributions, is unchanged.

    Args:
        third_order: RayOptics third-order package with one row per surface,
            optional `"<surface>.asp"` rows and a `"sum"` row.

    Returns:
        A new frame with one row per surface plus `"sum"`.
    """
    merged = third_order.copy()
    aspheric_labels = [label for label in merged.index if str(label).endswith(_ASPHERIC_ROW_SUFFIX)]
    for label in aspheric_labels:
        surface_label = str(label)[: -len(_ASPHERIC_ROW_SUFFIX)]
        merged.loc[surface_label] += merged.loc[label]
    return merged.drop(index=aspheric_labels)


def seidel_to_surface_by_surface_wavefront(third_order: pd.DataFrame, central_wvl: float) -> pd.DataFrame:
    """Convert third-order Seidel and primary colour rows to wavefront coefficients.

    Every row of `third_order` (each surface and `"sum"`) is converted
    independently, so the `"sum"` row equals the converted system totals. The
    columns are, in order, `W040 = S-I / 8` (spherical), `W131 = S-II / 2`
    (coma), `W222 = S-III / 2` (astigmatism), `W220P = S-IV / 4` (Petzval
    curvature), `W220 = (S-III + S-IV) / 4` (field curvature, as RayOptics'
    `seidel_to_wavefront`), `W311 = S-V / 2` (distortion), `W020 = C-I / 2`
    (axial colour) and `W111 = C-II` (lateral colour), each divided by
    `central_wvl` to give waves.

    Args:
        third_order: Third-order package whose columns include `S-I`..`S-V`,
            `C-I` and `C-II`, with one row per surface and a `"sum"` row.
        central_wvl: Central wavelength in system length units.

    Returns:
        Wavefront coefficients in waves with the same row index as `third_order`.
    """
    wavefront = pd.DataFrame(
        {
            "W040": third_order["S-I"] / 8,
            "W131": third_order["S-II"] / 2,
            "W222": third_order["S-III"] / 2,
            "W220P": third_order["S-IV"] / 4,
            "W220": (third_order["S-III"] + third_order["S-IV"]) / 4,
            "W311": third_order["S-V"] / 2,
            "W020": third_order["C-I"] / 2,
            "W111": third_order["C-II"],
        },
        index=third_order.index,
    )
    return wavefront / central_wvl


def _to_surface_by_surface_payload(frame: pd.DataFrame) -> dict:
    """Return a JSON-safe `{aberrTypes, surfaceLabels, data}` view of `frame`.

    Args:
        frame: Coefficients with one row per surface label and one column per
            aberration type.

    Returns:
        Aberration types, surface labels and the transposed numeric data, so
        each `data` row is one aberration type across all surfaces.
    """
    return {
        "aberrTypes": frame.columns.tolist(),
        "surfaceLabels": [str(label) for label in frame.index],
        "data": frame.T.values.tolist(),
    }


def _compute_merged_third_order(opm: OpticalModel) -> tuple[pd.DataFrame, FirstOrderDataModelView]:
    """Return the merged third-order package and the paraxial model it came from.

    Uses `corrected_parax_model_view`, so an NA-specified pupil uses the
    paraxial axial ray whose NA equals the spec rather than RayOptics 0.9.10's
    index-doubled one, and `compute_third_order_and_color_with_aspheres`, so
    aspheric surfaces contribute their Seidel terms with zero colour terms.
    RayOptics' separate `"<surface>.asp"` rows are added into their surface row.

    Args:
        opm: RayOptics optical model.

    Returns:
        The package with one row per surface (`"1"`..`"n"`) plus `"sum"` and
        columns `S-I`..`S-V`, `C-I` and `C-II`, and the paraxial model view.
    """
    # WORKAROUND(rayoptics 0.9.10 NA bug): use `opm` and its cached `fod`
    # directly again once
    # tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    paraxial_model = corrected_parax_model_view(opm)
    # WORKAROUND(rayoptics 0.9.10 third-order colour asphere bug): call
    # `compute_third_order_and_color` directly again once
    # tests/rayoptics_web_utils/test_rayoptics_third_order_color_bugs.py::test_aspheric_surface_raises_length_mismatch fails.
    to_pkg = _merge_aspheric_rows(compute_third_order_and_color_with_aspheres(paraxial_model))
    return to_pkg, paraxial_model


def _central_wavelength(opm: OpticalModel) -> float:
    """Return the central wavelength of `opm` in system length units."""
    return opm.nm_to_sys_units(opm["optical_spec"]["wvls"].central_wvl)


def get_surface_by_surface_wavefront(opm: OpticalModel) -> pd.DataFrame:
    """Return third-order surface-by-surface wavefront coefficients in waves.

    The frame is `seidel_to_surface_by_surface_wavefront` applied to the
    merged third-order package of `_compute_merged_third_order`, so it equals
    the `wavefront` payload of `get_3rd_order_seidel_data`. Rows are the
    1-based real surfaces as strings (`"1"`..`"n"`) and then `"sum"`;
    columns are `W040`, `W131`, `W222`, `W220P`, `W220`, `W311`, `W020` and
    `W111`, in waves of the central wavelength.

    Args:
        opm: RayOptics optical model.

    Returns:
        Wavefront coefficients with one row per surface plus `"sum"`.
    """
    to_pkg, _ = _compute_merged_third_order(opm)
    return seidel_to_surface_by_surface_wavefront(to_pkg, _central_wavelength(opm))


def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[key_of_3rd_order_seidel_data, dict]:
    """Return third-order Seidel and primary colour data from an `OpticalModel`.

    The result maps `surfaceBySurface` to per-surface coefficients,
    `wavefront` to per-surface wavefront coefficients, `transverse` to
    transverse aberration, and `curvature` to field curvature.
    `surfaceBySurface` contains `aberrTypes` (`S-I`..`S-V`, then the primary
    colour coefficients `C-I` for axial colour and `C-II` for lateral colour),
    `surfaceLabels` (one per surface, then `"sum"`), and transposed numeric
    `data` from RayOptics' `compute_third_order_and_color`. RayOptics'
    separate `"<surface>.asp"` aspheric rows are added into their surface row.

    RayOptics computes `C-I` and `C-II` from the index difference between the
    first and last wavelengths in the spectral list, so reversing the list flips
    their sign; RayOptics 0.9.10 reports zeros unless at least three
    wavelengths are defined.

    `wavefront` has the same layout and surface labels as `surfaceBySurface`,
    with the `aberrTypes` produced by `seidel_to_surface_by_surface_wavefront`
    (`W040`, `W131`, `W222`, `W220P`, `W220`, `W311`, `W020`, `W111`), in
    waves of the central wavelength converted to system units. Transverse and
    curvature use only the `"sum"` row's `S-I`..`S-V`. All returned dict/list
    values are JSON serialisable.

    Coefficients and aggregates come from `_compute_merged_third_order`, so an
    NA-specified pupil uses the paraxial axial ray whose NA equals the spec and
    aspheric surfaces include their aspheric Seidel terms with zero colour terms.

    Args:
        opm: RayOptics optical model.

    Returns:
        Third-order Seidel and primary colour data from a RayOptics `OpticalModel`.
    """
    to_pkg, paraxial_model = _compute_merged_third_order(opm)
    fod = paraxial_model["analysis_results"]["parax_data"].fod
    seidel_sum = to_pkg.loc["sum"][SEIDEL_TYPES]
    transverse = seidel_to_transverse_aberration(seidel_sum, fod.n_img, fod.img_na)
    curvature = seidel_to_field_curv(seidel_sum, fod.n_img, fod.opt_inv)
    return {
        "surfaceBySurface": _to_surface_by_surface_payload(to_pkg),
        "transverse": transverse.to_dict(),
        "wavefront": _to_surface_by_surface_payload(
            seidel_to_surface_by_surface_wavefront(to_pkg, _central_wavelength(opm))
        ),
        "curvature": curvature.to_dict(),
    }
