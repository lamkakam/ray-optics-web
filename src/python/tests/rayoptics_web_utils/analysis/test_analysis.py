"""Tests for rayoptics_web_utils.analysis module."""

import json
import pytest


class TestGetAnalysisPlotDataSignatures:
    """Verify signatures for plot-data extraction helpers."""

    def test_get_ray_fan_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_ray_fan_data
        import inspect

        sig = inspect.signature(get_ray_fan_data)
        assert list(sig.parameters.keys()) == ["opm", "fi"]

    def test_get_opd_fan_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_opd_fan_data
        import inspect

        sig = inspect.signature(get_opd_fan_data)
        assert list(sig.parameters.keys()) == ["opm", "fi"]

    def test_get_spot_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_spot_data
        import inspect

        sig = inspect.signature(get_spot_data)
        assert list(sig.parameters.keys()) == ["opm", "fi"]

    def test_get_wavefront_data_accepts_opm_fi_wvl_idx_num_rays(self):
        from rayoptics_web_utils.analysis import get_wavefront_data
        import inspect

        sig = inspect.signature(get_wavefront_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "wvl_idx", "num_rays"]
        assert sig.parameters["num_rays"].default == 64

    def test_get_geo_psf_data_accepts_opm_fi_wvl_idx_num_rays(self):
        from rayoptics_web_utils.analysis import get_geo_psf_data
        import inspect

        sig = inspect.signature(get_geo_psf_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "wvl_idx", "num_rays"]
        assert sig.parameters["num_rays"].default == 64

    def test_get_diffraction_psf_data_accepts_opm_fi_wvl_idx_num_rays_and_max_dims(self):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data
        import inspect

        sig = inspect.signature(get_diffraction_psf_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "wvl_idx", "num_rays", "max_dims"]
        assert sig.parameters["num_rays"].default == 64
        assert sig.parameters["max_dims"].default == 256

    def test_get_diffraction_mtf_data_accepts_opm_field_idx_wvl_idx_num_rays_and_max_dims(self):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data
        import inspect

        sig = inspect.signature(get_diffraction_mtf_data)
        assert list(sig.parameters.keys()) == ["opm", "field_idx", "wvl_idx", "num_rays", "max_dims"]
        assert sig.parameters["num_rays"].default == 64
        assert sig.parameters["max_dims"].default == 256


class TestGetFirstOrderData:
    """Tests for get_first_order_data()."""

    def test_returns_dict(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_first_order_data
        result = get_first_order_data(cooke_triplet)
        assert isinstance(result, dict)

    def test_values_are_floats(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_first_order_data
        result = get_first_order_data(cooke_triplet)
        for v in result.values():
            assert isinstance(v, float)


class TestGet3rdOrderSeidelData:
    """Tests for get_3rd_order_seidel_data()."""

    def test_returns_dict_with_expected_keys(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        result = get_3rd_order_seidel_data(cooke_triplet)
        assert isinstance(result, dict)
        assert 'surfaceBySurface' in result
        assert 'transverse' in result
        assert 'wavefront' in result
        assert 'curvature' in result

    def test_surface_by_surface_has_expected_structure(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        result = get_3rd_order_seidel_data(cooke_triplet)
        sbs = result['surfaceBySurface']
        assert 'aberrTypes' in sbs
        assert 'surfaceLabels' in sbs
        assert 'data' in sbs
        assert isinstance(sbs['aberrTypes'], list)
        assert isinstance(sbs['surfaceLabels'], list)
        assert isinstance(sbs['data'], list)


class TestGetRayFanData:
    """Tests for get_ray_fan_data()."""

    def test_returns_per_wavelength_entries_with_fan_axes(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_ray_fan_data

        result = get_ray_fan_data(cooke_triplet, fi=1)

        assert isinstance(result, list)
        assert len(result) == len(cooke_triplet["optical_spec"]["wvls"].wavelengths)

        entry = result[0]
        assert entry["fieldIdx"] == 1
        assert entry["wvlIdx"] == 0
        assert entry["unitX"] == ""
        assert entry["unitY"] == cooke_triplet.system_spec.dimensions
        assert set(entry["Sagittal"].keys()) == {"x", "y"}
        assert set(entry["Tangential"].keys()) == {"x", "y"}
        assert len(entry["Sagittal"]["x"]) == len(entry["Sagittal"]["y"])
        assert len(entry["Tangential"]["x"]) == len(entry["Tangential"]["y"])
        assert all(isinstance(v, float) for v in entry["Sagittal"]["x"])
        assert all(isinstance(v, float) for v in entry["Sagittal"]["y"])
        assert all(isinstance(v, float) for v in entry["Tangential"]["x"])
        assert all(isinstance(v, float) for v in entry["Tangential"]["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_ray_fan_data

        result = get_ray_fan_data(cooke_triplet, fi=0)

        json.dumps(result)


class TestGetOpdFanData:
    """Tests for get_opd_fan_data()."""

    def test_returns_per_wavelength_entries_with_fan_axes(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_opd_fan_data

        result = get_opd_fan_data(cooke_triplet, fi=2)

        assert isinstance(result, list)
        assert len(result) == len(cooke_triplet["optical_spec"]["wvls"].wavelengths)

        entry = result[0]
        assert entry["fieldIdx"] == 2
        assert entry["wvlIdx"] == 0
        assert entry["unitX"] == ""
        assert entry["unitY"] == "waves"
        assert set(entry["Sagittal"].keys()) == {"x", "y"}
        assert set(entry["Tangential"].keys()) == {"x", "y"}
        assert all(isinstance(v, float) for v in entry["Sagittal"]["y"])
        assert all(isinstance(v, float) for v in entry["Tangential"]["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_opd_fan_data

        result = get_opd_fan_data(cooke_triplet, fi=0)

        json.dumps(result)

    def test_handles_sasian_triplet_with_curved_image_surface(self, sasian_triplet_autoaperture):
        from rayoptics_web_utils.analysis import get_opd_fan_data

        sasian_triplet_autoaperture["seq_model"].ifcs[-1].profile.r = 1e-4
        sasian_triplet_autoaperture.update_model()

        result = get_opd_fan_data(sasian_triplet_autoaperture, fi=2)

        assert isinstance(result, list)
        assert len(result) == len(sasian_triplet_autoaperture["optical_spec"]["wvls"].wavelengths)
        json.dumps(result)


class TestGetSpotData:
    """Tests for get_spot_data()."""

    def test_returns_per_wavelength_entries_with_xy_points(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_spot_data

        result = get_spot_data(cooke_triplet, fi=1)

        assert isinstance(result, list)
        assert len(result) == len(cooke_triplet["optical_spec"]["wvls"].wavelengths)

        entry = result[0]
        assert entry["fieldIdx"] == 1
        assert entry["wvlIdx"] == 0
        assert entry["unitX"] == cooke_triplet.system_spec.dimensions
        assert entry["unitY"] == cooke_triplet.system_spec.dimensions
        assert len(entry["x"]) == len(entry["y"])
        assert len(entry["x"]) > 0
        assert all(isinstance(v, float) for v in entry["x"])
        assert all(isinstance(v, float) for v in entry["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_spot_data

        result = get_spot_data(cooke_triplet, fi=0)

        json.dumps(result)


class TestGetWavefrontData:
    """Tests for get_wavefront_data()."""

    def test_returns_grid_axes_and_values(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_wavefront_data

        result = get_wavefront_data(cooke_triplet, fi=1, wvl_idx=2, num_rays=16)

        assert result["fieldIdx"] == 1
        assert result["wvlIdx"] == 2
        assert result["unitX"] == ""
        assert result["unitY"] == ""
        assert result["unitZ"] == "waves"
        assert len(result["x"]) == 16
        assert len(result["y"]) == 16
        assert len(result["z"]) == 16
        assert len(result["z"][0]) == 16
        assert all(isinstance(v, float) for v in result["x"])
        assert all(isinstance(v, float) for v in result["y"])
        assert all(value is None or isinstance(value, float) for row in result["z"] for value in row)

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_wavefront_data

        result = get_wavefront_data(cooke_triplet, fi=0, wvl_idx=0, num_rays=16)

        json.dumps(result)


class TestGetGeoPsfData:
    """Tests for get_geo_psf_data()."""

    def test_returns_xy_point_cloud(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_geo_psf_data

        result = get_geo_psf_data(cooke_triplet, fi=2, wvl_idx=1, num_rays=16)

        assert result["fieldIdx"] == 2
        assert result["wvlIdx"] == 1
        assert result["unitX"] == cooke_triplet.system_spec.dimensions
        assert result["unitY"] == cooke_triplet.system_spec.dimensions
        assert len(result["x"]) == len(result["y"])
        assert len(result["x"]) > 0
        assert all(isinstance(v, float) for v in result["x"])
        assert all(isinstance(v, float) for v in result["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_geo_psf_data

        result = get_geo_psf_data(cooke_triplet, fi=0, wvl_idx=0, num_rays=16)

        json.dumps(result)


class TestGetDiffractionPsfData:
    """Tests for get_diffraction_psf_data()."""

    def test_returns_image_plane_axes_and_psf_grid(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16)

        assert result["fieldIdx"] == 1
        assert result["wvlIdx"] == 1
        assert result["unitX"] == cooke_triplet.system_spec.dimensions
        assert result["unitY"] == cooke_triplet.system_spec.dimensions
        assert result["unitZ"] == ""
        assert len(result["x"]) == len(result["z"])
        assert len(result["y"]) == len(result["z"][0])
        assert all(isinstance(v, float) for v in result["x"])
        assert all(isinstance(v, float) for v in result["y"])
        assert all(isinstance(value, float) for row in result["z"] for value in row)

    def test_enforces_max_dims_floor_of_two_times_num_rays(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16, max_dims=8)

        assert len(result["x"]) == 32
        assert len(result["y"]) == 32
        assert len(result["z"]) == 32
        assert len(result["z"][0]) == 32

    def test_uses_requested_max_dims_when_above_two_times_num_rays(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16, max_dims=80)

        assert len(result["x"]) == 80
        assert len(result["y"]) == 80
        assert len(result["z"]) == 80
        assert len(result["z"][0]) == 80

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=0, wvl_idx=0, num_rays=16)

        json.dumps(result)


class TestGetDiffractionMtfData:
    """Tests for get_diffraction_mtf_data()."""

    def test_returns_mtf_lines_and_metadata(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=1, wvl_idx=1, num_rays=16, max_dims=64)

        assert result["fieldIdx"] == 1
        assert result["wvlIdx"] == 1
        assert result["unitX"] == f"cycles/{cooke_triplet.system_spec.dimensions}"
        assert result["unitY"] == ""
        assert isinstance(result["cutoffTangential"], float)
        assert isinstance(result["cutoffSagittal"], float)
        assert isinstance(result["naTangential"], float)
        assert isinstance(result["naSagittal"], float)
        assert result["cutoffTangential"] > 0.0
        assert result["cutoffSagittal"] > 0.0

        for key in ["Tangential", "Sagittal", "IdealTangential", "IdealSagittal"]:
            assert set(result[key].keys()) == {"x", "y"}
            assert len(result[key]["x"]) == len(result[key]["y"])
            assert len(result[key]["x"]) > 0
            assert all(isinstance(v, float) for v in result[key]["x"])
            assert all(isinstance(v, float) for v in result[key]["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=0, wvl_idx=0, num_rays=16)

        json.dumps(result)

    def test_mtf_lines_are_normalized_at_zero_frequency(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=1, wvl_idx=1, num_rays=16, max_dims=64)

        assert result["Tangential"]["x"][0] == 0.0
        assert result["Sagittal"]["x"][0] == 0.0
        assert result["Tangential"]["y"][0] == 1.0
        assert result["Sagittal"]["y"][0] == 1.0
        assert result["IdealTangential"]["y"][0] == 1.0
        assert result["IdealSagittal"]["y"][0] == 1.0

    def test_ideal_mtf_curves_end_near_zero(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=1, wvl_idx=1, num_rays=16, max_dims=64)

        assert result["IdealTangential"]["y"][-1] <= 0.05
        assert result["IdealSagittal"]["y"][-1] <= 0.05

    def test_enforces_max_dims_floor_of_two_times_num_rays(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=1, wvl_idx=1, num_rays=16, max_dims=8)

        assert len(result["Tangential"]["x"]) == 16
        assert len(result["Sagittal"]["x"]) == 16
        assert len(result["IdealTangential"]["x"]) == 16
        assert len(result["IdealSagittal"]["x"]) == 16

    def test_uses_requested_max_dims_when_above_two_times_num_rays(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(cooke_triplet, field_idx=1, wvl_idx=1, num_rays=16, max_dims=80)

        assert len(result["Tangential"]["x"]) == 40
        assert len(result["Sagittal"]["x"]) == 40
        assert len(result["IdealTangential"]["x"]) == 40
        assert len(result["IdealSagittal"]["x"]) == 40

    def test_tilted_system_ideal_mtf_has_physical_cutoffs(self, tilted_houghton):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(tilted_houghton, field_idx=0, wvl_idx=2, num_rays=32, max_dims=128)

        assert result["cutoffTangential"] == pytest.approx(229.0, rel=0.1)
        assert result["cutoffSagittal"] == pytest.approx(229.0, rel=0.1)
        assert result["IdealTangential"]["y"][1] > 0.9
        assert result["IdealSagittal"]["y"][1] > 0.9

    def test_tilted_system_measured_and_ideal_axes_are_comparable(self, tilted_houghton):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data

        result = get_diffraction_mtf_data(tilted_houghton, field_idx=0, wvl_idx=2, num_rays=32, max_dims=128)

        assert result["Tangential"]["x"] == pytest.approx(result["IdealTangential"]["x"])
        assert result["Sagittal"]["x"] == pytest.approx(result["IdealSagittal"]["x"])
        assert result["Tangential"]["x"][-1] == pytest.approx(result["cutoffTangential"])
        assert result["Sagittal"]["x"][-1] == pytest.approx(result["cutoffSagittal"])
