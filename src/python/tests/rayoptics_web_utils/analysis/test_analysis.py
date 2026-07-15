"""Tests for rayoptics_web_utils.analysis module."""

import json
import numpy as np
import pytest


class TestAnalysisConcreteModuleExports:
    """Verify each analysis getter has a concrete module and stable re-exports."""

    def test_legacy_analysis_module_is_not_available(self):
        import importlib

        with pytest.raises(ModuleNotFoundError):
            importlib.import_module("rayoptics_web_utils.analysis.analysis")

    def test_first_order_module_export_matches_package_exports(self):
        import rayoptics_web_utils as top_level_package
        from rayoptics_web_utils.analysis import get_first_order_data as package_export
        from rayoptics_web_utils.analysis.first_order import get_first_order_data as concrete_export

        assert top_level_package.get_first_order_data is concrete_export
        assert package_export is concrete_export

    def test_seidel_module_export_matches_package_exports(self):
        import rayoptics_web_utils as top_level_package
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data as package_export
        from rayoptics_web_utils.analysis.seidel import get_3rd_order_seidel_data as concrete_export

        assert top_level_package.get_3rd_order_seidel_data is concrete_export
        assert package_export is concrete_export

    @pytest.mark.parametrize(
        ("module_name", "getter_name"),
        [
            ("ray_fan", "get_ray_fan_data"),
            ("opd_fan", "get_opd_fan_data"),
            ("spot", "get_spot_data"),
            ("wavefront", "get_wavefront_data"),
            ("geometric_psf", "get_geo_psf_data"),
            ("diffraction_psf", "get_diffraction_psf_data"),
            ("diffraction_mtf", "get_diffraction_mtf_data"),
            ("strehl_vs_wavelength", "get_strehl_vs_wavelength_data"),
            ("field_curves", "get_field_curvature_data"),
            ("field_curves", "get_astigmatism_curve_data"),
            ("longitudinal_spherical_aberration", "get_lsa_data"),
        ],
    )
    def test_plot_getter_module_export_matches_package_exports(self, module_name, getter_name):
        import importlib
        import rayoptics_web_utils as top_level_package
        import rayoptics_web_utils.analysis as analysis_package

        concrete_module = importlib.import_module(f"rayoptics_web_utils.analysis.{module_name}")
        concrete_export = getattr(concrete_module, getter_name)

        assert getattr(top_level_package, getter_name) is concrete_export
        assert getattr(analysis_package, getter_name) is concrete_export


class TestGetAnalysisPlotDataSignatures:
    """Verify signatures for plot-data extraction helpers."""

    def test_get_ray_fan_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_ray_fan_data
        import inspect

        sig = inspect.signature(get_ray_fan_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "image_point"]
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_get_opd_fan_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_opd_fan_data
        import inspect

        sig = inspect.signature(get_opd_fan_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "image_point"]
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_get_spot_data_accepts_opm_and_fi(self):
        from rayoptics_web_utils.analysis import get_spot_data
        import inspect

        sig = inspect.signature(get_spot_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "image_point"]
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_get_wavefront_data_accepts_opm_fi_wvl_idx_num_rays(self):
        from rayoptics_web_utils.analysis import get_wavefront_data
        import inspect

        sig = inspect.signature(get_wavefront_data)
        assert list(sig.parameters.keys()) == ["opm", "fi", "wvl_idx", "image_point", "num_rays"]
        assert sig.parameters["num_rays"].default == 64
        assert sig.parameters["image_point"].default == "chief_ray"

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
        assert list(sig.parameters.keys()) == ["opm", "fi", "wvl_idx", "image_point", "num_rays", "max_dims"]
        assert sig.parameters["num_rays"].default == 64
        assert sig.parameters["max_dims"].default == 256
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_get_diffraction_mtf_data_accepts_opm_field_idx_wvl_idx_num_rays_and_max_dims(self):
        from rayoptics_web_utils.analysis import get_diffraction_mtf_data
        import inspect

        sig = inspect.signature(get_diffraction_mtf_data)
        assert list(sig.parameters.keys()) == ["opm", "field_idx", "wvl_idx", "image_point", "num_rays", "max_dims"]
        assert sig.parameters["num_rays"].default == 64
        assert sig.parameters["max_dims"].default == 256
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_get_strehl_vs_wavelength_data_accepts_opm_field_index_samples_and_num_rays(self):
        from rayoptics_web_utils.analysis import get_strehl_vs_wavelength_data
        import inspect

        sig = inspect.signature(get_strehl_vs_wavelength_data)
        assert list(sig.parameters.keys()) == ["opm", "fieldIndex", "image_point", "wavelength_samples", "num_rays"]
        assert sig.parameters["wavelength_samples"].default == 32
        assert sig.parameters["num_rays"].default == 21
        assert sig.parameters["image_point"].default == "chief_ray"

    @pytest.mark.parametrize("getter_name", ["get_field_curvature_data", "get_astigmatism_curve_data"])
    def test_field_curve_getters_accept_opm_wvl_idx_and_num_points(self, getter_name):
        import inspect
        import rayoptics_web_utils.analysis as analysis_package

        sig = inspect.signature(getattr(analysis_package, getter_name))
        assert list(sig.parameters.keys()) == ["opm", "wvl_idx", "num_points"]
        assert sig.parameters["num_points"].default == 21

    def test_get_lsa_data_accepts_opm_and_num_points(self):
        from rayoptics_web_utils.analysis import get_lsa_data
        import inspect

        sig = inspect.signature(get_lsa_data)
        assert list(sig.parameters.keys()) == ["opm", "num_points"]
        assert sig.parameters["num_points"].default == 21


class TestGetLongitudinalSphericalAberrationData:
    """Tests for get_lsa_data()."""

    def test_returns_per_wavelength_lsa_entries(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_lsa_data

        result = get_lsa_data(cooke_triplet)

        assert isinstance(result, list)
        assert len(result) == len(cooke_triplet["optical_spec"]["wvls"].wavelengths)
        entry = result[0]
        assert entry["wvlIdx"] == 0
        assert entry["unitX"] == "mm"
        assert entry["unitY"] == ""
        assert set(entry["LSA"].keys()) == {"x", "y"}
        assert len(entry["LSA"]["x"]) == 21
        assert len(entry["LSA"]["y"]) == 21
        assert entry["LSA"]["y"][0] == 0.01
        assert entry["LSA"]["y"][-1] == 1.0
        assert all(v > 0.0 for v in entry["LSA"]["y"])
        assert all(isinstance(v, float) for v in entry["LSA"]["x"])
        assert all(isinstance(v, float) for v in entry["LSA"]["y"])

    def test_num_points_controls_rho_sampling(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_lsa_data

        result = get_lsa_data(cooke_triplet, num_points=5)

        assert result[0]["LSA"]["y"] == [0.01, 0.2575, 0.505, 0.7525, 1.0]
        assert len(result[0]["LSA"]["x"]) == 5

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_lsa_data

        result = get_lsa_data(cooke_triplet, num_points=3)

        json.dumps(result)


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
        assert all(v is None or isinstance(v, float) for v in entry["Sagittal"]["y"])
        assert all(isinstance(v, float) for v in entry["Tangential"]["x"])
        assert all(v is None or isinstance(v, float) for v in entry["Tangential"]["y"])

    def test_centroid_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_ray_fan_data

        result = get_ray_fan_data(cooke_triplet, fi=0, image_point="centroid")

        json.dumps(result)

    def test_annular_stop_returns_central_gaps(self):
        from rayoptics.environment import OpticalModel
        from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
        from rayoptics.raytr.vigcalc import set_vig
        from rayoptics_web_utils.analysis import get_ray_fan_data
        from rayoptics_web_utils.aperture import Annular

        opm = OpticalModel()
        osp = opm["optical_spec"]
        sm = opm["seq_model"]
        opm.system_spec.dimensions = "mm"
        osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=100)
        osp["fov"] = FieldSpec(osp, key=["object", "angle"], value=0, flds=[0], is_relative=True)
        osp["wvls"] = WvlSpec([(587.562, 1)], ref_wl=0)
        opm.radius_mode = True
        sm.do_apertures = False
        sm.gaps[0].thi = 1e10
        sm.add_surface([0, 100, "air"], sd=50)
        sm.ifcs[sm.cur_surface].clear_apertures = [Annular(radius=50, obstruction_radius=20)]
        sm.set_stop()
        sm.ifcs[-1].profile.r = 0
        opm.update_model()
        set_vig(opm)

        result = get_ray_fan_data(opm, fi=0)
        tangential = result[0]["Tangential"]

        assert tangential["x"] == pytest.approx([index / 10 for index in range(-10, 11)])
        assert tangential["y"][10] is None
        assert any(value is None for value in tangential["y"])
        assert any(value is not None for value in tangential["y"])


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
        assert all(v is None or isinstance(v, float) for v in entry["Sagittal"]["y"])
        assert all(v is None or isinstance(v, float) for v in entry["Tangential"]["y"])

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

    def test_annular_stop_returns_central_gaps(self):
        from rayoptics.environment import OpticalModel
        from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
        from rayoptics.raytr.vigcalc import set_vig
        from rayoptics_web_utils.analysis import get_opd_fan_data
        from rayoptics_web_utils.aperture import Annular

        opm = OpticalModel()
        osp = opm["optical_spec"]
        sm = opm["seq_model"]
        opm.system_spec.dimensions = "mm"
        osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=100)
        osp["fov"] = FieldSpec(osp, key=["object", "angle"], value=0, flds=[0], is_relative=True)
        osp["wvls"] = WvlSpec([(587.562, 1)], ref_wl=0)
        opm.radius_mode = True
        sm.do_apertures = False
        sm.gaps[0].thi = 1e10
        sm.add_surface([0, 100, "air"], sd=50)
        sm.ifcs[sm.cur_surface].clear_apertures = [Annular(radius=50, obstruction_radius=20)]
        sm.set_stop()
        sm.ifcs[-1].profile.r = 0
        opm.update_model()
        set_vig(opm)

        result = get_opd_fan_data(opm, fi=0)
        tangential = result[0]["Tangential"]

        assert tangential["x"] == pytest.approx([index / 10 for index in range(-10, 11)])
        assert tangential["y"][10] is None
        assert any(value is None for value in tangential["y"])
        assert any(value is not None for value in tangential["y"])


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

    def test_centroid_image_point_recenters_each_wavelength_cloud(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_spot_data

        result = get_spot_data(cooke_triplet, fi=1, image_point="centroid")

        for entry in result:
            assert np.mean(entry["x"]) == pytest.approx(0.0, abs=1e-12)
            assert np.mean(entry["y"]) == pytest.approx(0.0, abs=1e-12)


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

    def test_ray_list_clips_rays_at_apertures(self, cooke_triplet, monkeypatch):
        from rayoptics.raytr.analyses import RayList as RealRayList
        from rayoptics_web_utils.analysis import geometric_psf

        captured_kwargs = {}

        def capturing_ray_list(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return RealRayList(*args, **kwargs)

        monkeypatch.setattr(geometric_psf, "RayList", capturing_ray_list)

        geometric_psf.get_geo_psf_data(cooke_triplet, fi=0, wvl_idx=0, num_rays=16)

        assert captured_kwargs.get("clip_rays") is True
        assert "check_apertures" not in captured_kwargs

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

    def test_enforces_max_dims_floor_of_two_times_num_rays_before_cropping(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16, max_dims=8)

        assert len(result["x"]) > 0
        assert len(result["y"]) > 0
        assert len(result["z"]) == len(result["x"])
        assert len(result["z"][0]) == len(result["y"])

    def test_larger_max_dims_produces_smaller_image_plane_spacing(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        low_resolution = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16, max_dims=32)
        high_resolution = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=16, max_dims=128)

        low_x_spacing = float(np.mean(np.diff(low_resolution["x"])))
        high_x_spacing = float(np.mean(np.diff(high_resolution["x"])))
        low_y_spacing = float(np.mean(np.diff(low_resolution["y"])))
        high_y_spacing = float(np.mean(np.diff(high_resolution["y"])))

        assert high_x_spacing < low_x_spacing
        assert high_y_spacing < low_y_spacing

    def test_crops_to_ten_airy_disc_diameters(self, cooke_triplet):
        from rayoptics.raytr.trace import trace_boundary_rays_at_field
        from rayoptics_web_utils.analysis import get_diffraction_psf_data
        from rayoptics_web_utils.analysis._mtf import _directional_na_from_ray_dirs

        result = get_diffraction_psf_data(cooke_triplet, fi=1, wvl_idx=1, num_rays=128, max_dims=1024)
        wavelength_nm = cooke_triplet.optical_spec.spectral_region.wavelengths[1]
        wavelength_sys_units = cooke_triplet.nm_to_sys_units(wavelength_nm)
        fld = cooke_triplet.optical_spec.field_of_view.fields[1]
        rim_rays = trace_boundary_rays_at_field(cooke_triplet, fld, wavelength_nm, use_named_tuples=True)
        chief_dir = rim_rays[0].ray[-1].d
        na_sagittal = _directional_na_from_ray_dirs(chief_dir, rim_rays[1].ray[-1].d, rim_rays[2].ray[-1].d, axis=0)
        na_tangential = _directional_na_from_ray_dirs(chief_dir, rim_rays[3].ray[-1].d, rim_rays[4].ray[-1].d, axis=1)
        expected_x_span = 10.0 * 2.44 / (2.0 * na_sagittal / wavelength_sys_units)
        expected_y_span = 10.0 * 2.44 / (2.0 * na_tangential / wavelength_sys_units)
        actual_x_span = result["x"][-1] - result["x"][0]
        actual_y_span = result["y"][-1] - result["y"][0]

        assert actual_x_span == pytest.approx(expected_x_span, rel=0.08)
        assert actual_y_span == pytest.approx(expected_y_span, rel=0.08)
        assert len(result["z"]) == len(result["x"])
        assert len(result["z"][0]) == len(result["y"])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(cooke_triplet, fi=0, wvl_idx=0, num_rays=16)

        assert np.all(np.isfinite(np.asarray(result["x"])))
        assert np.all(np.isfinite(np.asarray(result["y"])))
        assert np.all(np.isfinite(np.asarray(result["z"])))
        assert np.all(np.diff(result["x"]) > 0.0)
        assert np.all(np.diff(result["y"]) > 0.0)
        json.dumps(result)

    def test_tilted_system_axes_use_physical_airy_sampling(self, tilted_houghton):
        from rayoptics_web_utils.analysis import get_diffraction_psf_data

        result = get_diffraction_psf_data(tilted_houghton, fi=0, wvl_idx=2, num_rays=32, max_dims=128)
        x_axis = np.asarray(result["x"])
        y_axis = np.asarray(result["y"])

        assert np.all(np.isfinite(x_axis))
        assert np.all(np.isfinite(y_axis))
        assert np.all(np.diff(x_axis) > 0.0)
        assert np.all(np.diff(y_axis) > 0.0)

        x_spacing = float(np.mean(np.diff(x_axis)))
        y_spacing = float(np.mean(np.diff(y_axis)))
        first_dark_ring_radius = 1.22 * tilted_houghton.nm_to_sys_units(546.073) * 8.0

        assert x_spacing == pytest.approx(1.0 / (2.0 * 229.0 * 2.0), rel=0.15)
        assert y_spacing == pytest.approx(1.0 / (2.0 * 229.0 * 2.0), rel=0.15)
        assert first_dark_ring_radius == pytest.approx(0.0053, rel=0.1)
        assert x_spacing < first_dark_ring_radius
        assert y_spacing < first_dark_ring_radius


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


class TestGetStrehlVsWavelengthData:
    """Tests for get_strehl_vs_wavelength_data()."""

    def test_multi_wavelength_model_samples_configured_range(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_strehl_vs_wavelength_data

        result = get_strehl_vs_wavelength_data(
            cooke_triplet,
            fieldIndex=1,
            wavelength_samples=5,
            num_rays=11,
        )

        wavelengths = cooke_triplet["optical_spec"]["wvls"].wavelengths
        assert result["fieldIdx"] == 1
        assert result["unitX"] == "nm"
        assert result["unitY"] == ""
        assert len(result["x"]) == 5
        assert len(result["y"]) == 5
        assert result["x"][0] == pytest.approx(min(wavelengths))
        assert result["x"][-1] == pytest.approx(max(wavelengths))
        assert all(isinstance(v, float) for v in result["x"])
        assert all(isinstance(v, float) for v in result["y"])
        assert all(0.0 <= v <= 1.0 for v in result["y"])

    def test_repeated_wavelength_model_samples_centered_400_nm_span(self, cooke_triplet, monkeypatch):
        import numpy as np
        import rayoptics_web_utils.analysis.strehl_vs_wavelength as module

        spectral_region = cooke_triplet["optical_spec"]["wvls"]
        monkeypatch.setattr(spectral_region, "wavelengths", [587.562, 587.562])
        monkeypatch.setattr(spectral_region, "spectral_wts", [1, 2])
        monkeypatch.setattr(spectral_region, "reference_wvl", 0)

        class FakeRayGrid:
            pass

        requested_wavelengths = []

        def fake_make_ray_grid(opm, fi, wavelength_nm, num_rays, image_point="chief_ray"):
            requested_wavelengths.append(float(wavelength_nm))
            assert opm is cooke_triplet
            assert fi == 2
            assert num_rays == 7
            assert image_point == "chief_ray"
            ray_grid = FakeRayGrid()
            ray_grid.grid = np.array([[[0.0]], [[0.0]], [[wavelength_nm / 1000.0]]])
            return ray_grid

        def fake_scale_opd_grid_to_wavelength(opd_grid, opm, wavelength_nm):
            assert opm is cooke_triplet
            return opd_grid

        def fake_monochromatic_strehl(opd_waves):
            return float(opd_waves[0, 0])

        monkeypatch.setattr(module, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(module, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(module, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)
        monkeypatch.setattr(module, "_monochromatic_strehl", fake_monochromatic_strehl)

        result = module.get_strehl_vs_wavelength_data(
            cooke_triplet,
            fieldIndex=2,
            wavelength_samples=3,
            num_rays=7,
        )

        assert result["x"] == pytest.approx([387.562, 587.562, 787.562])
        assert requested_wavelengths == pytest.approx(result["x"])
        assert result["y"] == pytest.approx([0.387562, 0.587562, 0.787562])

    def test_low_repeated_wavelength_model_clips_axis_start_above_200_nm(self, cooke_triplet, monkeypatch):
        import numpy as np
        import rayoptics_web_utils.analysis.strehl_vs_wavelength as module

        spectral_region = cooke_triplet["optical_spec"]["wvls"]
        monkeypatch.setattr(spectral_region, "wavelengths", [300.0, 300.0])
        monkeypatch.setattr(spectral_region, "spectral_wts", [1, 1])
        monkeypatch.setattr(spectral_region, "reference_wvl", 0)

        class FakeRayGrid:
            pass

        requested_wavelengths = []

        def fake_make_ray_grid(opm, fi, wavelength_nm, num_rays, image_point="chief_ray"):
            requested_wavelengths.append(float(wavelength_nm))
            assert image_point == "chief_ray"
            ray_grid = FakeRayGrid()
            ray_grid.grid = np.array([[[0.0]], [[0.0]], [[wavelength_nm / 1000.0]]])
            return ray_grid

        def fake_scale_opd_grid_to_wavelength(opd_grid, opm, wavelength_nm):
            assert opm is cooke_triplet
            return opd_grid

        def fake_monochromatic_strehl(opd_waves):
            return float(opd_waves[0, 0])

        monkeypatch.setattr(module, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(module, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(module, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)
        monkeypatch.setattr(module, "_monochromatic_strehl", fake_monochromatic_strehl)

        result = module.get_strehl_vs_wavelength_data(
            cooke_triplet,
            fieldIndex=2,
            wavelength_samples=3,
            num_rays=7,
        )

        assert result["x"] == pytest.approx([201.0, 350.5, 500.0])
        assert requested_wavelengths == pytest.approx(result["x"])
        assert result["y"] == pytest.approx([0.201, 0.3505, 0.5])

    def test_result_is_json_encodable(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_strehl_vs_wavelength_data

        result = get_strehl_vs_wavelength_data(
            cooke_triplet,
            fieldIndex=0,
            wavelength_samples=4,
            num_rays=11,
        )

        json.dumps(result)


class TestGetFieldCurveData:
    """Tests for field curvature and astigmatism curve data."""

    def test_field_curvature_returns_wavelength_specific_two_curve_payload(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_field_curvature_data

        result = get_field_curvature_data(cooke_triplet, wvl_idx=2, num_points=7)

        assert result["wvlIdx"] == 2
        assert result["unitX"] == cooke_triplet.system_spec.dimensions
        assert "unitY" in result
        assert set(result["Sagittal"].keys()) == {"x", "y"}
        assert set(result["Tangential"].keys()) == {"x", "y"}
        assert len(result["fieldLabels"]) == 7
        assert len(result["Sagittal"]["x"]) == 7
        assert len(result["Sagittal"]["y"]) == 7
        assert len(result["Tangential"]["x"]) == 7
        assert len(result["Tangential"]["y"]) == 7
        assert result["Sagittal"]["y"] == pytest.approx(list(range(7)))
        assert result["Tangential"]["y"] == pytest.approx(list(range(7)))
        assert all(isinstance(v, str) for v in result["fieldLabels"])
        assert all(isinstance(v, float) for v in result["Sagittal"]["x"])
        assert all(isinstance(v, float) for v in result["Tangential"]["x"])

    def test_astigmatism_returns_wavelength_specific_separation_payload(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_astigmatism_curve_data

        result = get_astigmatism_curve_data(cooke_triplet, wvl_idx=2, num_points=7)

        assert result["wvlIdx"] == 2
        assert result["unitX"] == cooke_triplet.system_spec.dimensions
        assert "unitY" in result
        assert set(result["Astigmatism"].keys()) == {"x", "y"}
        assert "Sagittal" not in result
        assert "Tangential" not in result
        assert len(result["fieldLabels"]) == 7
        assert len(result["Astigmatism"]["x"]) == 7
        assert len(result["Astigmatism"]["y"]) == 7
        assert result["Astigmatism"]["y"] == pytest.approx(list(range(7)))
        assert all(isinstance(v, str) for v in result["fieldLabels"])
        assert all(isinstance(v, float) for v in result["Astigmatism"]["x"])

    def test_astigmatism_curve_is_tangential_minus_sagittal(self, cooke_triplet, monkeypatch):
        import rayoptics_web_utils.analysis.field_curves as module

        def fake_trace_field_curves(opm, wvl_idx, num_points=21):
            return {
                "wvlIdx": wvl_idx,
                "Sagittal": {
                    "x": [1.0, 2.5, -3.0],
                    "y": [0.0, 1.0, 2.0],
                },
                "Tangential": {
                    "x": [4.0, -1.5, -1.0],
                    "y": [0.0, 1.0, 2.0],
                },
                "fieldLabels": ["0", "10", "20"],
                "unitX": "mm",
                "unitY": "deg",
            }

        monkeypatch.setattr(module, "_trace_field_curves", fake_trace_field_curves)

        result = module.get_astigmatism_curve_data(cooke_triplet, wvl_idx=1, num_points=3)

        assert result == {
            "wvlIdx": 1,
            "Astigmatism": {
                "x": pytest.approx([3.0, -4.0, 2.0]),
                "y": pytest.approx([0.0, 1.0, 2.0]),
            },
            "fieldLabels": ["0", "10", "20"],
            "unitX": "mm",
            "unitY": "deg",
        }

    @pytest.mark.parametrize("getter_name", ["get_field_curvature_data", "get_astigmatism_curve_data"])
    def test_result_is_json_encodable(self, cooke_triplet, getter_name):
        import rayoptics_web_utils.analysis as analysis_package

        result = getattr(analysis_package, getter_name)(cooke_triplet, wvl_idx=0, num_points=5)

        json.dumps(result)
