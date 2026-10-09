"""Test the wide-angle entrance-pupil search fallback."""

import copy

import numpy as np
import pytest

WAVELENGTH_NM = 587.562


def _wide_angle_afocal_model(afocal_two_lens, field_angle):
    """Return an afocal pair aimed with wide-angle search at ``field_angle``.

    The stop is the second lens, so the real entrance pupil moves far from its
    paraxial location as the field angle grows.
    """
    from rayoptics.raytr.opticalspec import FieldSpec

    opm = copy.deepcopy(afocal_two_lens)
    osp = opm.optical_spec
    sm = opm.seq_model
    osp.pupil.value = 1.0
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "angle"],
        value=field_angle,
        flds=[0.0, 1.0],
        is_relative=True,
        is_wide_angle=True,
    )
    sm.stop_surface = 3
    for interface in sm.ifcs:
        interface.max_aperture = 100.0
    opm.update_model()
    return opm


def _uncached_edge_field(opm):
    """Return a copy of the edge field with no cached aim or chief ray."""
    field = copy.copy(opm.optical_spec.field_of_view.fields[1])
    field.aim_info = None
    field.chief_ray = None
    return field


def test_init_installs_the_fallback_for_chief_ray_aiming():
    from rayoptics.raytr import trace
    from rayoptics_web_utils.env import init
    from rayoptics_web_utils.env.wide_angle import find_real_enp_with_fallback

    init()

    assert trace.find_real_enp is find_real_enp_with_fallback


def test_installation_is_idempotent():
    from rayoptics.raytr import trace
    from rayoptics_web_utils.env.wide_angle import (
        find_real_enp_with_fallback,
        install_wide_angle_pupil_fallback,
    )

    install_wide_angle_pupil_fallback()
    install_wide_angle_pupil_fallback()

    assert trace.find_real_enp is find_real_enp_with_fallback


def test_returns_upstream_result_without_scanning(afocal_two_lens, monkeypatch):
    from rayoptics.raytr import wideangle
    from rayoptics_web_utils.env.wide_angle import find_real_enp_with_fallback

    opm = _wide_angle_afocal_model(afocal_two_lens, 10.0)
    upstream_result = object()

    def fake_find_real_enp(model, stop_idx, fld, wvl):
        return -12.5, upstream_result

    def unexpected_scan(*args):
        raise AssertionError("fallback scan ran although upstream succeeded")

    monkeypatch.setattr(wideangle, "find_real_enp", fake_find_real_enp)
    monkeypatch.setattr(wideangle, "enp_z_coordinate", unexpected_scan)

    z_enp, ray_result = find_real_enp_with_fallback(
        opm, 3, _uncached_edge_field(opm), WAVELENGTH_NM
    )

    assert z_enp == -12.5
    assert ray_result is upstream_result


@pytest.mark.parametrize(
    ("field_angle", "expected_z_enp"),
    [
        (20.0, -114.74),
        (30.0, -78.35),
        (40.0, -51.06),
    ],
)
def test_aims_wide_angle_chief_rays_beyond_the_paraxial_pupil(
    afocal_two_lens, field_angle, expected_z_enp
):
    """Recovers the stop-centered chief ray when the paraxial guess misses."""
    import rayoptics.optical.model_constants as mc
    from rayoptics.raytr import trace
    from rayoptics_web_utils.env import init

    init()
    opm = _wide_angle_afocal_model(afocal_two_lens, field_angle)
    field = _uncached_edge_field(opm)

    z_enp = trace.aim_chief_ray(opm, field, wvl=WAVELENGTH_NM)
    field.aim_info = z_enp
    chief_ray, _ = trace.trace_chief_ray(opm, field, WAVELENGTH_NM, 0.0)

    assert z_enp == pytest.approx(expected_z_enp, abs=0.01)
    # RayOptics' interval refinement stops within about 1e-5 mm of the center
    # of this 0.5 mm stop radius.
    stop_point = chief_ray.ray[opm.seq_model.stop_surface][mc.p]
    assert np.hypot(stop_point[0], stop_point[1]) < 1e-4


def test_keeps_upstream_failure_when_no_ray_brackets_the_stop_center(
    afocal_two_lens, monkeypatch
):
    from rayoptics.raytr import wideangle
    from rayoptics.raytr.traceerror import TraceMissedSurfaceError
    from rayoptics_web_utils.env.wide_angle import find_real_enp_with_fallback

    opm = _wide_angle_afocal_model(afocal_two_lens, 10.0)
    upstream_result = object()
    scanned = []

    def failing_find_real_enp(model, stop_idx, fld, wvl):
        return None, upstream_result

    def missing_trace(z_enp, *args):
        scanned.append(z_enp)
        failed = wideangle.RayResult(None, TraceMissedSurfaceError())
        return np.array([0.0, 0.0, 0.0]), failed

    monkeypatch.setattr(wideangle, "find_real_enp", failing_find_real_enp)
    monkeypatch.setattr(wideangle, "enp_z_coordinate", missing_trace)

    z_enp, ray_result = find_real_enp_with_fallback(
        opm, 3, _uncached_edge_field(opm), WAVELENGTH_NM
    )

    assert z_enp is None
    assert ray_result is upstream_result
    assert len(scanned) > 0
