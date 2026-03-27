"""Tests for rayoptics_web_utils.plotting module."""

import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()

# TODO: this fixture is duplicated in other tests; consider moving to a shared conftest.py
@pytest.fixture(scope="module")
def cooke_triplet():
    """Build a configured Cooke Triplet optical model."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

    opm = OpticalModel()
    osp = opm['optical_spec']
    sm = opm['seq_model']
    opm.system_spec.dimensions = 'mm'
    osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)
    osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp['wvls'] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 10000000000
    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=10.009)
    sm.add_surface([7331.288, 5.86, "air"], sd=8.9482)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=4.7919)
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"], sd=4.7761)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=8.0217)
    sm.add_surface([-20.4942, 41.2365, "air"], sd=8.3321)
    sm.ifcs[-1].profile.r = 0
    opm.update_model()
    return opm


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


class TestFigToBase64:
    """Tests for the _fig_to_base64 helper."""

    def test_returns_base64_string(self):
        import matplotlib.pyplot as plt
        from rayoptics_web_utils._utils import _fig_to_base64
        fig, ax = plt.subplots()
        ax.plot([0, 1], [0, 1])
        result = _fig_to_base64(fig)
        assert isinstance(result, str)
        # Should be valid base64 — starts with PNG header in base64
        assert result.startswith('iVBOR')


class TestGetWvlLbl:
    """Tests for the _get_wvl_lbl helper."""

    def test_returns_wavelength_string(self):
        from rayoptics_web_utils._utils import _get_wvl_lbl

        class MockWvls:
            wavelengths = [656.3, 587.0, 486.1]

        class MockOptSpec:
            def __getitem__(self, key):
                if key == 'wvls':
                    return MockWvls()
                raise KeyError(key)

        class MockOpm:
            def __getitem__(self, key):
                if key == 'optical_spec':
                    return MockOptSpec()
                raise KeyError(key)

        result = _get_wvl_lbl(MockOpm(), 0)
        assert result == '656.3nm'

        result = _get_wvl_lbl(MockOpm(), 1)
        assert result == '587.0nm'


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