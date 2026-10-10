"""Tests for the third-order colour asphere workaround.

WORKAROUND(rayoptics 0.9.10 third-order colour asphere bug): remove with
``rayoptics_web_utils._third_order_color_asphere_workaround`` once
``test_rayoptics_third_order_color_bugs.py::test_aspheric_surface_raises_length_mismatch``
fails.
"""

import numpy as np
from rayoptics.parax import thirdorder

SEIDEL_TYPES = ["S-I", "S-II", "S-III", "S-IV", "S-V"]


def test_aspheric_model_matches_seidel_package_with_zero_asphere_color(make_cooke_triplet):
    """Aspheric rows keep their Seidel terms and contribute no primary colour."""
    from rayoptics_web_utils._third_order_color_asphere_workaround import (
        compute_third_order_and_color_with_aspheres,
    )

    opm = make_cooke_triplet(asphere=True)
    to_pkg = compute_third_order_and_color_with_aspheres(opm)
    seidel_pkg = thirdorder.compute_third_order(opm)

    assert to_pkg.columns.tolist() == [*SEIDEL_TYPES, "C-I", "C-II"]
    assert to_pkg.index.tolist() == seidel_pkg.index.tolist()
    assert "1.asp" in to_pkg.index
    np.testing.assert_allclose(to_pkg[SEIDEL_TYPES].values, seidel_pkg.values, rtol=1e-12, atol=1e-15)
    assert to_pkg.loc["1.asp", "C-I"] == 0.0
    assert to_pkg.loc["1.asp", "C-II"] == 0.0


def test_spherical_model_matches_upstream(make_cooke_triplet):
    """Without aspheres the result equals RayOptics' own colour package."""
    from rayoptics_web_utils._third_order_color_asphere_workaround import (
        compute_third_order_and_color_with_aspheres,
    )

    opm = make_cooke_triplet()

    np.testing.assert_array_equal(
        compute_third_order_and_color_with_aspheres(opm).values,
        thirdorder.compute_third_order_and_color(opm).values,
    )


def test_restores_upstream_aspheric_contribution(make_cooke_triplet):
    """The temporary patch never leaks into RayOptics' module namespace."""
    from rayoptics_web_utils._third_order_color_asphere_workaround import (
        compute_third_order_and_color_with_aspheres,
    )

    original = thirdorder.aspheric_seidel_contribution
    compute_third_order_and_color_with_aspheres(make_cooke_triplet(asphere=True))

    assert thirdorder.aspheric_seidel_contribution is original
    assert len(thirdorder.compute_third_order(make_cooke_triplet(asphere=True)).columns) == 5
