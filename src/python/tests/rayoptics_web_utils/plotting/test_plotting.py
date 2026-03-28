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
