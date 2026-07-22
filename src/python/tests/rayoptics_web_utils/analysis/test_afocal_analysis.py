"""Regression tests for infinite image-conjugate analysis payloads."""

import copy

import numpy as np
import pytest


def _finite_values(values):
    return [value for value in values if value is not None]


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
