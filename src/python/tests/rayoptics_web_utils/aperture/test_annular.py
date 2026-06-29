"""Tests for annular clear apertures."""

import pytest

from rayoptics_web_utils.aperture import Annular


def test_annular_is_exported():
    aperture = Annular(radius=10, obstruction_radius=3)

    assert aperture.radius == 10
    assert aperture.obstruction_radius == 3


def test_point_inside_uses_annulus_and_offsets():
    aperture = Annular(radius=10, obstruction_radius=3, x_offset=2, y_offset=-1)

    assert not aperture.point_inside(2, -1)
    assert not aperture.point_inside(4.9, -1, fuzz=0)
    assert aperture.point_inside(5.1, -1, fuzz=0)
    assert aperture.point_inside(12, -1)
    assert not aperture.point_inside(12.1, -1, fuzz=0)


def test_edge_pt_target_targets_outer_radius_with_offsets():
    aperture = Annular(radius=50, obstruction_radius=10, x_offset=75, y_offset=-2)

    assert aperture.edge_pt_target([1, 0]) == [125, -2]
    assert aperture.edge_pt_target([0, -1]) == [75, -52]


@pytest.mark.parametrize("obstruction_radius", [0, -1, 10, 11])
def test_rejects_invalid_obstruction_radius(obstruction_radius):
    with pytest.raises(ValueError):
        Annular(radius=10, obstruction_radius=obstruction_radius)


def test_set_dimension_updates_outer_radius_and_keeps_obstruction_valid():
    aperture = Annular(radius=10, obstruction_radius=3)

    aperture.set_dimension(12, 12)

    assert aperture.radius == 12
    assert aperture.dimension() == (12, 12)


def test_set_dimension_rejects_radius_not_larger_than_obstruction():
    aperture = Annular(radius=10, obstruction_radius=3)

    with pytest.raises(ValueError):
        aperture.set_dimension(3, 3)


def test_apply_scale_factor_scales_radii_and_offsets():
    aperture = Annular(radius=10, obstruction_radius=3, x_offset=2, y_offset=-4)

    aperture.apply_scale_factor(2)

    assert aperture.radius == 20
    assert aperture.obstruction_radius == 6
    assert aperture.x_offset == 4
    assert aperture.y_offset == -8
