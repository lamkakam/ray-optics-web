"""Regression tests for infinite image-conjugate analysis payloads."""

import copy
from types import SimpleNamespace

import numpy as np
import pytest


def _finite_values(values):
    return [value for value in values if value is not None]


def _wide_angle_afocal_model(afocal_two_lens):
    """Return an afocal model whose 40-degree field uses real-pupil aiming."""
    from rayoptics.raytr.opticalspec import FieldSpec

    opm = copy.deepcopy(afocal_two_lens)
    osp = opm.optical_spec
    sm = opm.seq_model
    osp.pupil.value = 1.0
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "angle"],
        value=40.0,
        flds=[0.0, 1.0],
        is_relative=True,
        is_wide_angle=True,
    )
    sm.stop_surface = 3
    for interface in sm.ifcs:
        interface.max_aperture = 100.0
    opm.update_model()
    return opm


def _synthetic_ray_pkg(point, direction):
    """Build the minimal ray package consumed by afocal output-segment helpers."""
    output = (np.asarray(point, dtype=float), np.asarray(direction, dtype=float))
    image = (np.zeros(3), np.array([0.0, 0.0, 1.0]))
    return ([output, image],)


def _synthetic_opm(refractive_index=1.0):
    """Build the model attributes used by output-vergence calculations."""

    class ConstantMedium:
        def rindex(self, _wavelength_nm):
            return refractive_index

    gap = SimpleNamespace(medium=ConstantMedium())
    return SimpleNamespace(
        seq_model=SimpleNamespace(gaps=[gap]),
        system_spec=SimpleNamespace(dimensions="m"),
    )


@pytest.mark.parametrize("image_point", ["chief_ray", "centroid"])
def test_afocal_transverse_analyses_are_angular_and_image_gap_invariant(afocal_two_lens, image_point):
    from rayoptics_web_utils.analysis import get_ray_fan_data, get_spot_data

    first = copy.deepcopy(afocal_two_lens)
    second = copy.deepcopy(afocal_two_lens)
    first.seq_model.gaps[-1].thi = 1.0e9
    second.seq_model.gaps[-1].thi = 1.0e11
    first.update_model()
    second.update_model()

    fan_a = get_ray_fan_data(first, 1, image_point=image_point)
    fan_b = get_ray_fan_data(second, 1, image_point=image_point)
    spot_a = get_spot_data(first, 1, image_point=image_point)
    spot_b = get_spot_data(second, 1, image_point=image_point)

    assert fan_a[0]["unitY"] == "arcsec"
    assert spot_a[0]["unitX"] == spot_a[0]["unitY"] == "arcsec"
    assert _finite_values(fan_a[0]["Sagittal"]["y"]) == pytest.approx(
        _finite_values(fan_b[0]["Sagittal"]["y"]), abs=1e-7
    )
    assert _finite_values(fan_a[0]["Tangential"]["y"]) == pytest.approx(
        _finite_values(fan_b[0]["Tangential"]["y"]), abs=1e-7
    )
    assert spot_a[0]["x"] == pytest.approx(spot_b[0]["x"], abs=1e-7)
    assert spot_a[0]["y"] == pytest.approx(spot_b[0]["y"], abs=1e-7)
    assert np.all(np.isfinite(_finite_values(fan_a[0]["Tangential"]["y"])))


def test_afocal_opd_and_wavefront_are_finite_and_image_gap_invariant(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_opd_fan_data, get_wavefront_data

    first = copy.deepcopy(afocal_two_lens)
    second = copy.deepcopy(afocal_two_lens)
    first.seq_model.gaps[-1].thi = 1.0e9
    second.seq_model.gaps[-1].thi = 1.0e11
    first.update_model()
    second.update_model()

    fan_a = get_opd_fan_data(first, 0)
    fan_b = get_opd_fan_data(second, 0)
    wave_a = get_wavefront_data(first, 0, 1, num_rays=11)
    wave_b = get_wavefront_data(second, 0, 1, num_rays=11)

    assert _finite_values(fan_a[1]["Tangential"]["y"]) == pytest.approx(
        _finite_values(fan_b[1]["Tangential"]["y"]), abs=1e-6
    )
    finite_wave_a = [value for row in wave_a["z"] for value in row if value is not None]
    finite_wave_b = [value for row in wave_b["z"] for value in row if value is not None]
    assert finite_wave_a == pytest.approx(finite_wave_b, abs=1e-6)
    assert max(abs(value) for value in _finite_values(fan_a[1]["Tangential"]["y"])) < 1e5


def test_wide_angle_exit_pupil_is_cache_order_independent(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_ray_fan_data
    from rayoptics_web_utils.analysis._afocal import (
        _chief_ray_pkg,
        exit_pupil_plane,
        output_segment,
    )

    uncached = _wide_angle_afocal_model(afocal_two_lens)
    cached = copy.deepcopy(uncached)
    wavelength_nm = 587.562

    uncached_field = uncached.optical_spec.field_of_view.fields[1]
    uncached_point, _ = exit_pupil_plane(uncached, uncached_field, wavelength_nm)

    get_ray_fan_data(cached, 1)
    cached_field = cached.optical_spec.field_of_view.fields[1]
    cached_point, _ = exit_pupil_plane(cached, cached_field, wavelength_nm)

    chief_pkg = _chief_ray_pkg(uncached, uncached_field, wavelength_nm)
    chief_point, chief_direction = output_segment(chief_pkg)
    exit_pupil_distance = float(np.dot(uncached_point - chief_point, chief_direction))

    assert cached_point == pytest.approx(uncached_point, abs=1e-8)
    assert abs(exit_pupil_distance) > 1.0


def test_wide_angle_wavefront_is_independent_of_ray_fan_order(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_ray_fan_data, get_wavefront_data

    direct = _wide_angle_afocal_model(afocal_two_lens)
    after_ray_fan = copy.deepcopy(direct)

    direct_wavefront = get_wavefront_data(direct, 1, 1, num_rays=9)
    get_ray_fan_data(after_ray_fan, 1)
    reordered_wavefront = get_wavefront_data(after_ray_fan, 1, 1, num_rays=9)

    assert np.asarray(reordered_wavefront["z"]) == pytest.approx(
        np.asarray(direct_wavefront["z"]), abs=1e-8
    )


@pytest.mark.parametrize("boundary", [-90.0, 90.0])
def test_exit_pupil_uses_inward_difference_at_angular_boundary(monkeypatch, boundary):
    from rayoptics.raytr.opticalspec import Field
    from rayoptics_web_utils.analysis import _afocal

    distance = 23.0
    eps = 1.0e-4
    field = Field(y=boundary)
    field.aim_info = object()
    field.chief_ray = object()
    field.ref_sphere = object()
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
    observed_caches = []

    def perturbed_chief_ray(_opm, perturbed_field, _wavelength_nm):
        observed_caches.append(
            (perturbed_field.aim_info, perturbed_field.chief_ray, perturbed_field.ref_sphere)
        )
        if abs(perturbed_field.xv) > 0.0 or abs(perturbed_field.yv) > 90.0:
            return _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, np.nan, 1.0])
        delta = perturbed_field.yv - boundary
        return _synthetic_ray_pkg(
            [0.0, -distance * delta, 0.0],
            [0.0, delta, 1.0],
        )

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", perturbed_chief_ray)

    plane_point, plane_normal = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert plane_point == pytest.approx([0.0, 0.0, distance], abs=2e-7)
    assert plane_normal == pytest.approx([0.0, 0.0, 1.0])
    assert observed_caches
    assert all(cache == (None, None, None) for cache in observed_caches)


def test_exit_pupil_propagates_unexpected_perturbation_errors(monkeypatch):
    from rayoptics.raytr.opticalspec import Field
    from rayoptics_web_utils.analysis import _afocal

    def fail_trace(_opm, _field, _wavelength_nm):
        raise RuntimeError("unexpected trace failure")

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fail_trace)
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])

    with pytest.raises(RuntimeError, match="unexpected trace failure"):
        _afocal.exit_pupil_plane(object(), Field(), 587.562, chief_pkg=chief_pkg)


@pytest.mark.parametrize("field_angle", [0.0, 47.0])
def test_output_vergence_uses_exact_local_direction_slope(monkeypatch, field_angle):
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array(
        [0.0, np.sin(np.deg2rad(field_angle)), np.cos(np.deg2rad(field_angle))]
    )
    axis = _afocal.transverse_axes(reference)[1]
    aperture_angle = np.deg2rad(35.0)
    height = 0.25
    refractive_index = 1.5
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    ray_pkg = _synthetic_ray_pkg(
        height * axis,
        np.cos(aperture_angle) * reference + np.sin(aperture_angle) * axis,
    )
    opm = _synthetic_opm(refractive_index)

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: ray_pkg)

    result = _afocal.output_vergence(opm, object(), 587.562, [0.0, 1.0], axis=1)

    expected = -refractive_index * np.tan(aperture_angle) / height
    assert result == pytest.approx(expected, rel=1e-12)


def test_differential_vergence_uses_both_pupil_signs_and_central_slope(monkeypatch):
    from rayoptics_web_utils.analysis import _afocal

    field_angle = np.deg2rad(40.0)
    reference = np.array([0.0, np.sin(field_angle), np.cos(field_angle)])
    axis = _afocal.transverse_axes(reference)[1]
    refractive_index = 1.3
    heights = {-1.0: -0.002, 1.0: 0.003}
    slopes = {-1.0: -0.006, 1.0: 0.004}
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    calls = []

    def trace_pupil(_opm, pupil, _field, _wavelength_nm):
        sign = float(np.sign(pupil[1]))
        calls.append(float(pupil[1]))
        return _synthetic_ray_pkg(
            heights[sign] * axis,
            reference + slopes[sign] * axis,
        )

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", trace_pupil)

    result = _afocal.differential_output_vergence(
        _synthetic_opm(refractive_index), object(), 587.562, axis=1
    )

    expected = -refractive_index * (
        (slopes[1.0] - slopes[-1.0]) / (heights[1.0] - heights[-1.0])
    )
    assert calls == pytest.approx([-1.0e-4, 1.0e-4])
    assert result == pytest.approx(expected, rel=1e-12)


@pytest.mark.parametrize("case", ["failed", "unresolved-height"])
def test_differential_vergence_preserves_failed_and_unresolved_results(monkeypatch, case):
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    axis = _afocal.transverse_axes(reference)[1]
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)

    def trace_pupil(_opm, pupil, _field, _wavelength_nm):
        sign = float(np.sign(pupil[1]))
        if case == "failed" and sign < 0.0:
            return None
        height = 0.001 if case == "unresolved-height" else sign * 0.001
        return _synthetic_ray_pkg(height * axis, reference + sign * 0.002 * axis)

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", trace_pupil)

    result = _afocal.differential_output_vergence(
        _synthetic_opm(), object(), 587.562, axis=1
    )

    if case == "failed":
        assert np.isnan(result)
    else:
        assert result == 0.0


def test_afocal_diffraction_payloads_use_exit_pupil_angular_scale(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_diffraction_mtf_data, get_diffraction_psf_data

    psf = get_diffraction_psf_data(afocal_two_lens, 0, 1, num_rays=16, max_dims=64)
    mtf = get_diffraction_mtf_data(afocal_two_lens, 0, 1, num_rays=16, max_dims=64)

    assert psf["unitX"] == psf["unitY"] == "arcsec"
    assert mtf["unitX"] == "cycles/arcsec"
    assert mtf["scaleKind"] == "exit-pupil"
    assert mtf["exitPupilDiameterTangential"] > 0.0
    assert mtf["exitPupilDiameterSagittal"] > 0.0
    expected_cutoff = mtf["exitPupilDiameterTangential"] / (587.562e-6) / 206264.806247
    assert mtf["cutoffTangential"] == pytest.approx(expected_cutoff, rel=1e-8)


def test_afocal_geometric_psf_is_an_angular_cloud(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_geo_psf_data

    result = get_geo_psf_data(afocal_two_lens, 1, 1, num_rays=8)

    assert result["unitX"] == result["unitY"] == "arcsec"
    assert len(result["x"]) == len(result["y"]) > 0
    assert np.all(np.isfinite(result["x"]))
    assert np.all(np.isfinite(result["y"]))


def test_finite_mtf_metadata_remains_image_na(cooke_triplet):
    from rayoptics_web_utils.analysis import get_diffraction_mtf_data

    result = get_diffraction_mtf_data(cooke_triplet, 0, 1, num_rays=16, max_dims=64)

    assert result["scaleKind"] == "image-na"
    assert result["naTangential"] > 0.0
    assert result["naSagittal"] > 0.0


def test_afocal_longitudinal_payloads_use_output_vergence(afocal_two_lens):
    from rayoptics_web_utils.analysis import (
        get_astigmatism_curve_data,
        get_field_curvature_data,
        get_lsa_data,
    )

    field = get_field_curvature_data(afocal_two_lens, 1, num_points=3)
    astigmatism = get_astigmatism_curve_data(afocal_two_lens, 1, num_points=3)
    lsa = get_lsa_data(afocal_two_lens, num_points=3)

    assert field["unitX"] == "D"
    assert astigmatism["unitX"] == "D"
    assert all(series["unitX"] == "D" for series in lsa)
    assert np.all(np.isfinite(field["Sagittal"]["x"]))
    assert np.all(np.isfinite(field["Tangential"]["x"]))
    assert np.all(np.isfinite(lsa[1]["LSA"]["x"]))
