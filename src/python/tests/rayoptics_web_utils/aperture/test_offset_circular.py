"""Tests for offset-aware circular aperture targets."""

import pytest

from rayoptics_web_utils.aperture import OffsetCircular


def test_edge_pt_target_includes_offsets():
    aperture = OffsetCircular(radius=50, x_offset=75, y_offset=-2)

    assert aperture.edge_pt_target([1, 0]) == [125, -2]
    assert aperture.edge_pt_target([0, -1]) == [75, -52]


def test_point_inside_uses_inherited_offset_transform():
    aperture = OffsetCircular(radius=10, x_offset=3, y_offset=-4)

    assert aperture.point_inside(3, -4)
    assert aperture.point_inside(13, -4)
    assert not aperture.point_inside(13.1, -4, fuzz=0)


def test_edge_pt_target_rejects_short_relative_direction():
    aperture = OffsetCircular(radius=10, x_offset=1, y_offset=2)

    with pytest.raises(IndexError):
        aperture.edge_pt_target([1])
