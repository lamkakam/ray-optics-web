"""Configurable sampling preserves finite/afocal references and wavelength payloads.

Analysis imports stay inside tests, after the shared headless initialization.
"""
import copy

import numpy as np
import pytest


@pytest.mark.parametrize("fixture_name", ["cooke_triplet", "afocal_two_lens"])
@pytest.mark.parametrize("image_point", ["chief_ray", "centroid"])
@pytest.mark.parametrize("count", [21, 32])
def test_public_fans_sample_each_axis(request, fixture_name, image_point, count):
    """Both fan APIs and monochromatic OPD use the requested count on both axes."""
    from rayoptics_web_utils.analysis.ray_fan import get_ray_fan_data
    from rayoptics_web_utils.analysis.opd_fan import (
        get_opd_fan_data, get_opd_fan_data_for_wavelength,
    )

    opm = copy.deepcopy(request.getfixturevalue(fixture_name))
    for function in (get_ray_fan_data, get_opd_fan_data):
        data = function(opm, 0, image_point, num_rays=count)
        assert [entry["wvlIdx"] for entry in data] == list(range(len(opm.optical_spec.spectral_region.wavelengths)))
        for entry in data:
            for axis in ("Sagittal", "Tangential"):
                assert len(entry[axis]["y"]) == count
                np.testing.assert_allclose(entry[axis]["x"], np.linspace(-1, 1, count), atol=1e-14)
        if count == 21:
            assert function(opm, 0, image_point) == data
    mono = get_opd_fan_data_for_wavelength(opm, 0, 0, image_point, num_rays=count)
    assert len(mono["Sagittal"]["x"]) == len(mono["Tangential"]["y"]) == count


@pytest.mark.parametrize("fixture_name", ["cooke_triplet", "afocal_two_lens"])
@pytest.mark.parametrize("image_point", ["chief_ray", "centroid"])
def test_spot_grid_resolution_changes_cloud_density(request, fixture_name, image_point):
    """Higher resolution yields denser clouds without changing wavelength order or units."""
    from rayoptics_web_utils.analysis.spot import get_spot_data

    opm = copy.deepcopy(request.getfixturevalue(fixture_name))
    default = get_spot_data(opm, 0, image_point)
    assert get_spot_data(opm, 0, image_point, num_rays=21) == default
    dense = get_spot_data(opm, 0, image_point, num_rays=32)
    assert len(dense) == len(default)
    for low, high in zip(default, dense, strict=True):
        assert high["wvlIdx"] == low["wvlIdx"]
        assert high["unitX"] == low["unitX"]
        assert len(high["x"]) > len(low["x"])
        assert len(high["x"]) == len(high["y"])


@pytest.mark.parametrize("fixture_name", ["cooke_triplet", "afocal_two_lens"])
@pytest.mark.parametrize("analysis", ["ray_fan", "opd_fan"])
def test_centroid_reference_sampling_matches_selected_count(request, monkeypatch, fixture_name, analysis):
    """Centroid geometry uses the selected grid density as well as the fan density."""
    from rayoptics_web_utils.analysis import _fan, ray_fan, opd_fan

    opm = copy.deepcopy(request.getfixturevalue(fixture_name))
    if analysis == "opd_fan":
        owner, name = opd_fan, "make_ray_grid"
        function = opd_fan.get_opd_fan_data
    elif fixture_name == "afocal_two_lens":
        owner, name = ray_fan, "reference_direction"
        function = ray_fan.get_ray_fan_data
    else:
        owner, name = _fan, "_resolve_image_point"
        function = ray_fan.get_ray_fan_data
    original = getattr(owner, name)
    counts = []

    def sample(*args, **kwargs):
        counts.append(kwargs["num_rays"])
        return original(*args, **kwargs)

    monkeypatch.setattr(owner, name, sample)
    function(opm, 0, "centroid", num_rays=32)
    assert counts and set(counts) == {32}
