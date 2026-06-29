from pytest import approx

from rayoptics_web_utils.aperture import OffsetRotatedRectangular


def test_exported_from_aperture_package():
    assert OffsetRotatedRectangular.__name__ == "OffsetRotatedRectangular"


def test_point_inside_uses_offsets_and_rotation():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=10,
        y_offset=-3,
        rotation=90,
    )

    assert aperture.point_inside(10, -3)
    assert aperture.point_inside(10, 1, fuzz=0)
    assert not aperture.point_inside(14.1, -3, fuzz=0)


def test_edge_pt_target_rotates_then_offsets():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=10,
        y_offset=-3,
        rotation=90,
    )

    assert aperture.edge_pt_target([1, 0]) == approx([10, 1])
    assert aperture.edge_pt_target([0, 1]) == approx([8, -3])


def test_apply_scale_factor_scales_half_widths_and_offsets_but_not_rotation():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=10,
        y_offset=-3,
        rotation=30,
    )

    aperture.apply_scale_factor(2)

    assert aperture.x_half_width == 8
    assert aperture.y_half_width == 4
    assert aperture.x_offset == 20
    assert aperture.y_offset == -6
    assert aperture.rotation == 30
