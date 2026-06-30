from math import sqrt

from pytest import approx
from rayoptics.raytr.vigcalc import set_vig

from rayoptics_web_utils.aperture import OffsetRotatedRectangular


def _farthest_corner_radius(aperture):
    return max(
        sqrt(x * x + y * y)
        for x, y in (
            aperture.edge_pt_target([rel_x, rel_y])
            for rel_x in (-1, 1)
            for rel_y in (-1, 1)
        )
    )


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


def test_equal_set_dimension_scales_half_widths_to_farthest_corner_radius():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
    )

    aperture.set_dimension(5, 5)

    assert aperture.x_half_width / aperture.y_half_width == approx(2)
    assert aperture.x_half_width == approx(4 * 5 / sqrt(20))
    assert aperture.y_half_width == approx(2 * 5 / sqrt(20))
    assert _farthest_corner_radius(aperture) == approx(5)


def test_equal_set_dimension_accounts_for_offsets_and_rotation_without_changing_them():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=1.5,
        y_offset=-0.75,
        rotation=30,
    )

    aperture.set_dimension(7, 7)

    assert aperture.x_half_width / aperture.y_half_width == approx(2)
    assert _farthest_corner_radius(aperture) == approx(7)
    assert aperture.x_offset == 1.5
    assert aperture.y_offset == -0.75
    assert aperture.rotation == 30


def test_equal_set_dimension_clamps_to_zero_size_when_target_is_inside_offset():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=5,
        y_offset=0,
        rotation=30,
    )

    aperture.set_dimension(4, 4)

    assert aperture.x_half_width == 0
    assert aperture.y_half_width == 0
    assert aperture.x_offset == 5
    assert aperture.y_offset == 0
    assert aperture.rotation == 30


def test_non_equal_set_dimension_sets_explicit_half_widths_directly():
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=1,
        y_offset=2,
        rotation=45,
    )

    aperture.set_dimension(7, 3)

    assert aperture.x_half_width == 7
    assert aperture.y_half_width == 3
    assert aperture.x_offset == 1
    assert aperture.y_offset == 2
    assert aperture.rotation == 45


def test_rayoptics_auto_aperture_preserves_rectangular_clear_aperture_ratio():
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
    from rayoptics.seq.medium import decode_medium

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=12.5)
    osp["fov"] = FieldSpec(osp, key=["object", "angle"], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp["wvls"] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = True
    sm.gaps[0].thi = 10000000000
    sm.gaps[0].medium = decode_medium("air")

    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"])
    aperture = OffsetRotatedRectangular(
        x_half_width=4,
        y_half_width=2,
        x_offset=1,
        y_offset=-0.5,
        rotation=20,
    )
    sm.ifcs[sm.cur_surface].clear_apertures = [aperture]
    rectangular_surface = sm.ifcs[sm.cur_surface]

    sm.add_surface([7331.288, 5.86, "air"])
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"])
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"])
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"])
    sm.add_surface([-20.4942, 41.2365, "air"])
    sm.ifcs[-1].profile.r = 0

    opm.update_model()
    set_vig(opm)

    resized_aperture = rectangular_surface.clear_apertures[0]
    assert resized_aperture.x_half_width / resized_aperture.y_half_width == approx(2)
    assert _farthest_corner_radius(resized_aperture) == approx(rectangular_surface.max_aperture)
    assert resized_aperture.x_offset == 1
    assert resized_aperture.y_offset == -0.5
    assert resized_aperture.rotation == 20
