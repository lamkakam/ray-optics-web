"""Tests for the geometric Ronchi ruling clear aperture."""

from math import nan

import numpy as np
import pytest
from pytest import approx
from rayoptics.environment import OpticalModel
from rayoptics.raytr import raytrace
from rayoptics.raytr.traceerror import TraceRayBlockedError
from rayoptics.raytr.vigcalc import set_vig

from rayoptics_web_utils.aperture import RonchiRuling


def test_exported_from_aperture_package_with_documented_defaults():
    aperture = RonchiRuling()

    assert aperture.radius == 1.0
    assert aperture.lpmm == 10.0
    assert aperture.rotation == 0.0
    assert aperture.x_offset == 0.0
    assert aperture.y_offset == 0.0


@pytest.mark.parametrize(
    ("parameter", "value"),
    [
        ("radius", 0),
        ("radius", -1),
        ("radius", float("inf")),
        ("radius", nan),
        ("lpmm", 0),
        ("lpmm", -1),
        ("lpmm", float("inf")),
        ("lpmm", nan),
        ("rotation", float("inf")),
        ("rotation", nan),
        ("x_offset", float("inf")),
        ("x_offset", nan),
        ("y_offset", float("inf")),
        ("y_offset", nan),
    ],
)
def test_rejects_invalid_constructor_values(parameter, value):
    with pytest.raises(ValueError):
        RonchiRuling(**{parameter: value})


def test_point_inside_has_symmetric_clear_and_opaque_half_pitch_bands():
    aperture = RonchiRuling(radius=1, lpmm=10)

    assert aperture.point_inside(0, 0, fuzz=0)
    assert aperture.point_inside(0.025, 0, fuzz=0)
    assert aperture.point_inside(-0.025, 0, fuzz=0)
    assert aperture.point_inside(0.075, 0, fuzz=0)
    assert aperture.point_inside(-0.075, 0, fuzz=0)
    assert not aperture.point_inside(0.025001, 0, fuzz=0)
    assert not aperture.point_inside(-0.025001, 0, fuzz=0)
    assert not aperture.point_inside(0.05, 0, fuzz=0)
    assert aperture.point_inside(0.1, 0, fuzz=0)
    assert aperture.point_inside(-0.1, 0, fuzz=0)


def test_point_inside_applies_fuzz_to_band_and_circular_boundaries():
    aperture = RonchiRuling(radius=1, lpmm=10)

    assert aperture.point_inside(0.025005, 0)
    assert not aperture.point_inside(0.025005, 0, fuzz=0)
    assert aperture.point_inside(0, 1.000005)
    assert not aperture.point_inside(0, 1.000005, fuzz=0)


def test_point_inside_clips_to_an_offset_circular_envelope():
    aperture = RonchiRuling(radius=1, lpmm=10, x_offset=2, y_offset=-3)

    assert aperture.point_inside(2, -3, fuzz=0)
    assert not aperture.point_inside(2.05, -3, fuzz=0)
    assert aperture.point_inside(2, -2, fuzz=0)
    assert not aperture.point_inside(2, -1.999, fuzz=0)


def test_rotation_turns_vertical_lines_toward_positive_x():
    unrotated = RonchiRuling(radius=1, lpmm=10, rotation=0)
    rotated = RonchiRuling(radius=1, lpmm=10, rotation=90)

    assert not unrotated.point_inside(0.05, 0, fuzz=0)
    assert unrotated.point_inside(0, 0.05, fuzz=0)
    assert rotated.point_inside(0.05, 0, fuzz=0)
    assert not rotated.point_inside(0, 0.05, fuzz=0)


def test_dimension_edge_target_and_set_dimension_use_only_outer_radius():
    aperture = RonchiRuling(
        radius=2,
        lpmm=12.5,
        rotation=30,
        x_offset=1,
        y_offset=-2,
    )

    assert aperture.dimension() == (2, 2)
    assert aperture.max_dimension() == 2
    assert aperture.edge_pt_target([1, 0]) == [3, -2]
    assert aperture.edge_pt_target([0, -1]) == [1, -4]

    aperture.set_dimension(5, 4)

    assert aperture.radius == 5
    assert aperture.lpmm == 12.5
    assert aperture.rotation == 30
    assert aperture.x_offset == 1
    assert aperture.y_offset == -2


@pytest.mark.parametrize("radius", [0, -1, float("inf"), nan])
def test_set_dimension_rejects_invalid_outer_radius(radius):
    aperture = RonchiRuling()

    with pytest.raises(ValueError):
        aperture.set_dimension(radius, radius)


def test_apply_scale_factor_scales_radius_and_offsets_only():
    aperture = RonchiRuling(
        radius=2,
        lpmm=12.5,
        rotation=30,
        x_offset=1,
        y_offset=-2,
    )

    aperture.apply_scale_factor(2)

    assert aperture.radius == 4
    assert aperture.lpmm == 12.5
    assert aperture.rotation == 30
    assert aperture.x_offset == 2
    assert aperture.y_offset == -4


def test_rayoptics_auto_aperture_resizes_only_the_outer_envelope():
    from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
    from rayoptics.seq.medium import decode_medium

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=12.5)
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "angle"],
        value=20,
        flds=[0, 0.707, 1],
        is_relative=True,
    )
    osp["wvls"] = WvlSpec(
        [(486.133, 1), (587.562, 2), (656.273, 1)],
        ref_wl=1,
    )
    opm.radius_mode = True
    sm.do_apertures = True
    sm.gaps[0].thi = 10000000000
    sm.gaps[0].medium = decode_medium("air")

    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"])
    aperture = RonchiRuling(
        radius=4,
        lpmm=12.5,
        rotation=20,
        x_offset=1,
        y_offset=-0.5,
    )
    sm.ifcs[sm.cur_surface].clear_apertures = [aperture]
    ruling_surface = sm.ifcs[sm.cur_surface]

    sm.add_surface([7331.288, 5.86, "air"])
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"])
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"])
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"])
    sm.add_surface([-20.4942, 41.2365, "air"])
    sm.ifcs[-1].profile.r = 0

    opm.update_model()
    set_vig(opm)

    resized_aperture = ruling_surface.clear_apertures[0]
    assert resized_aperture.radius == approx(ruling_surface.max_aperture)
    assert resized_aperture.lpmm == 12.5
    assert resized_aperture.rotation == 20
    assert resized_aperture.x_offset == 1
    assert resized_aperture.y_offset == -0.5


def test_aperture_checked_trace_passes_clear_band_and_blocks_opaque_band():
    opm = OpticalModel()
    sm = opm["seq_model"]
    sm.gaps[0].thi = 10
    sm.add_surface([0, 10, "air"])
    sm.ifcs[sm.cur_surface].clear_apertures = [RonchiRuling(radius=1, lpmm=10)]
    opm.update_model()
    wavelength = opm["optical_spec"]["wvls"].central_wvl

    clear_ray = raytrace.trace(
        sm,
        np.array([0.0, 0.0, 0.0]),
        np.array([0.0, 0.0, 1.0]),
        wavelength,
        check_apertures=True,
    )

    assert clear_ray[0][1][0] == approx([0, 0, 0])
    assert clear_ray[0][1][1] == approx([0, 0, 1])

    with pytest.raises(TraceRayBlockedError):
        raytrace.trace(
            sm,
            np.array([0.05, 0.0, 0.0]),
            np.array([0.0, 0.0, 1.0]),
            wavelength,
            check_apertures=True,
        )
