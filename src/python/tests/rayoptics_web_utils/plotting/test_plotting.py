"""Tests for rayoptics_web_utils.plotting module."""


class TestPlotFunctionSignatures:
    """Verify that all plotting functions accept the expected parameters."""

    def test_plot_lens_layout_accepts_opm(self):
        from rayoptics_web_utils.plotting import plot_lens_layout
        import inspect
        sig = inspect.signature(plot_lens_layout)
        params = list(sig.parameters.keys())
        assert params == ['opm']

    def test_plot_ray_fan_accepts_fi_and_opm(self):
        from rayoptics_web_utils.plotting import plot_ray_fan
        import inspect
        sig = inspect.signature(plot_ray_fan)
        params = list(sig.parameters.keys())
        assert params == ['fi', 'opm']

    def test_plot_opd_fan_accepts_fi_and_opm(self):
        from rayoptics_web_utils.plotting import plot_opd_fan
        import inspect
        sig = inspect.signature(plot_opd_fan)
        params = list(sig.parameters.keys())
        assert params == ['fi', 'opm']

    def test_plot_spot_diagram_accepts_fi_and_opm(self):
        from rayoptics_web_utils.plotting import plot_spot_diagram
        import inspect
        sig = inspect.signature(plot_spot_diagram)
        params = list(sig.parameters.keys())
        assert params == ['fi', 'opm']

    def test_plot_surface_by_surface_accepts_opm(self):
        from rayoptics_web_utils.plotting import plot_surface_by_surface_3rd_order_aberr
        import inspect
        sig = inspect.signature(plot_surface_by_surface_3rd_order_aberr)
        params = list(sig.parameters.keys())
        assert params == ['opm']

    def test_plot_wavefront_map_accepts_fi_wvl_index_opm_num_rays(self):
        from rayoptics_web_utils.plotting import plot_wavefront_map
        import inspect
        sig = inspect.signature(plot_wavefront_map)
        assert list(sig.parameters.keys()) == ['fi', 'wvl_index', 'opm', 'num_rays']
        assert sig.parameters['num_rays'].default == 64

    def test_plot_geo_psf_accepts_fi_wvl_index_opm_num_rays(self):
        from rayoptics_web_utils.plotting import plot_geo_psf
        import inspect
        sig = inspect.signature(plot_geo_psf)
        assert list(sig.parameters.keys()) == ['fi', 'wvl_index', 'opm', 'num_rays']
        assert sig.parameters['num_rays'].default == 64

    def test_plot_diffraction_psf_accepts_fi_wvl_index_opm_num_rays_max_dims(self):
        from rayoptics_web_utils.plotting import plot_diffraction_psf
        import inspect
        sig = inspect.signature(plot_diffraction_psf)
        assert list(sig.parameters.keys()) == ['fi', 'wvl_index', 'opm', 'num_rays', 'max_dims']
        assert sig.parameters['num_rays'].default == 64
        assert sig.parameters['max_dims'].default == 256


class TestPlotWavefrontMap:
    """Tests for the plot_wavefront_map function."""

    def test_plot_wavefront_map_returns_base64_png_for_all_fields(self, cooke_triplet):
        from rayoptics_web_utils.plotting import plot_wavefront_map
        for wvl_index in range(len(cooke_triplet['optical_spec']['wvls'].wavelengths)):
            for fi in range(len(cooke_triplet['optical_spec']['fov'].fields)):
                result = plot_wavefront_map(fi=fi, wvl_index=wvl_index, opm=cooke_triplet, num_rays=21)
                assert isinstance(result, str)
                assert result.startswith('iVBOR')


class TestPlotGeoPSF:
    """Tests for the plot_geo_psf function."""

    def test_plot_geo_psf_returns_base64_png_for_all_fields(self, cooke_triplet):
        from rayoptics_web_utils.plotting import plot_geo_psf
        for wvl_index in range(len(cooke_triplet['optical_spec']['wvls'].wavelengths)):
            for fi in range(len(cooke_triplet['optical_spec']['fov'].fields)):
                result = plot_geo_psf(fi=fi, wvl_index=wvl_index, opm=cooke_triplet, num_rays=21)
                assert isinstance(result, str)
                assert result.startswith('iVBOR')


class TestPlotDiffractionPSF:
    """Tests for the plot_diffraction_psf function."""

    def test_plot_diffraction_psf_returns_base64_png_for_all_fields(self, cooke_triplet):
        from rayoptics_web_utils.plotting import plot_diffraction_psf
        for wvl_index in range(len(cooke_triplet['optical_spec']['wvls'].wavelengths)):
            for fi in range(len(cooke_triplet['optical_spec']['fov'].fields)):
                result = plot_diffraction_psf(fi=fi, wvl_index=wvl_index, opm=cooke_triplet, num_rays=32, max_dims=128)
                assert isinstance(result, str)
                assert result.startswith('iVBOR')


class TestPlottingDelegatesToAnalysis:
    """Verify plotting functions consume analysis-layer data builders."""

    def test_plot_ray_fan_uses_get_ray_fan_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_ray_fan_data(opm, fi):
            captured["called_with"] = (opm, fi)
            return [{
                "fieldIdx": fi,
                "wvlIdx": 0,
                "Sagittal": {"x": [0.0, 1.0], "y": [0.1, 0.2]},
                "Tangential": {"x": [0.0, 1.0], "y": [0.3, 0.4]},
                "unitX": "",
                "unitY": "mm",
            }]

        monkeypatch.setattr(plotting, "get_ray_fan_data", fake_get_ray_fan_data)

        result = plotting.plot_ray_fan(fi=1, opm=cooke_triplet)

        assert captured["called_with"] == (cooke_triplet, 1)
        assert result.startswith("iVBOR")

    def test_plot_opd_fan_uses_get_opd_fan_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_opd_fan_data(opm, fi):
            captured["called_with"] = (opm, fi)
            return [{
                "fieldIdx": fi,
                "wvlIdx": 1,
                "Sagittal": {"x": [-1.0, 1.0], "y": [0.2, -0.2]},
                "Tangential": {"x": [-1.0, 1.0], "y": [0.1, -0.1]},
                "unitX": "",
                "unitY": "waves",
            }]

        monkeypatch.setattr(plotting, "get_opd_fan_data", fake_get_opd_fan_data)

        result = plotting.plot_opd_fan(fi=2, opm=cooke_triplet)

        assert captured["called_with"] == (cooke_triplet, 2)
        assert result.startswith("iVBOR")

    def test_plot_spot_diagram_uses_get_spot_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_spot_data(opm, fi):
            captured["called_with"] = (opm, fi)
            return [{
                "fieldIdx": fi,
                "wvlIdx": 0,
                "x": [0.0, 0.1, 0.2],
                "y": [0.0, -0.1, -0.2],
                "unitX": "mm",
                "unitY": "mm",
            }]

        monkeypatch.setattr(plotting, "get_spot_data", fake_get_spot_data)

        result = plotting.plot_spot_diagram(fi=0, opm=cooke_triplet)

        assert captured["called_with"] == (cooke_triplet, 0)
        assert result.startswith("iVBOR")

    def test_plot_surface_by_surface_uses_get_3rd_order_seidel_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_3rd_order_seidel_data(opm):
            captured["called_with"] = opm
            return {
                "surfaceBySurface": {
                    "aberrTypes": ["S-I", "S-II"],
                    "surfaceLabels": ["1", "sum"],
                    "data": [[0.1, 0.2], [0.3, 0.4]],
                },
                "transverse": {},
                "wavefront": {},
                "curvature": {},
            }

        monkeypatch.setattr(plotting, "get_3rd_order_seidel_data", fake_get_3rd_order_seidel_data)

        result = plotting.plot_surface_by_surface_3rd_order_aberr(opm=cooke_triplet)

        assert captured["called_with"] == cooke_triplet
        assert result.startswith("iVBOR")

    def test_plot_wavefront_map_uses_get_wavefront_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_wavefront_data(opm, fi, wvl_idx, num_rays):
            captured["called_with"] = (opm, fi, wvl_idx, num_rays)
            return {
                "fieldIdx": fi,
                "wvlIdx": wvl_idx,
                "x": [-1.0, 1.0],
                "y": [-1.0, 1.0],
                "z": [[0.1, None], [0.0, -0.1]],
                "unitX": "",
                "unitY": "",
                "unitZ": "waves",
            }

        monkeypatch.setattr(plotting, "get_wavefront_data", fake_get_wavefront_data)

        result = plotting.plot_wavefront_map(fi=1, wvl_index=2, opm=cooke_triplet, num_rays=32)

        assert captured["called_with"] == (cooke_triplet, 1, 2, 32)
        assert result.startswith("iVBOR")

    def test_plot_geo_psf_uses_get_geo_psf_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_geo_psf_data(opm, fi, wvl_idx, num_rays):
            captured["called_with"] = (opm, fi, wvl_idx, num_rays)
            return {
                "fieldIdx": fi,
                "wvlIdx": wvl_idx,
                "x": [0.0, 0.1, -0.1],
                "y": [0.0, -0.1, 0.1],
                "unitX": "mm",
                "unitY": "mm",
            }

        monkeypatch.setattr(plotting, "get_geo_psf_data", fake_get_geo_psf_data)

        result = plotting.plot_geo_psf(fi=2, wvl_index=1, opm=cooke_triplet, num_rays=32)

        assert captured["called_with"] == (cooke_triplet, 2, 1, 32)
        assert result.startswith("iVBOR")

    def test_plot_diffraction_psf_uses_get_diffraction_psf_data(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        def fake_get_diffraction_psf_data(opm, fi, wvl_idx, num_rays):
            captured["called_with"] = (opm, fi, wvl_idx, num_rays)
            return {
                "fieldIdx": fi,
                "wvlIdx": wvl_idx,
                "x": [-0.5, 0.5],
                "y": [-0.5, 0.5],
                "z": [[0.1, 0.2], [0.3, 0.4]],
                "unitX": "mm",
                "unitY": "mm",
                "unitZ": "",
            }

        monkeypatch.setattr(plotting, "get_diffraction_psf_data", fake_get_diffraction_psf_data)

        result = plotting.plot_diffraction_psf(fi=1, wvl_index=0, opm=cooke_triplet, num_rays=32, max_dims=128)

        assert captured["called_with"] == (cooke_triplet, 1, 0, 32)
        assert result.startswith("iVBOR")
