"""Tests for rayoptics_web_utils.plotting module."""

import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()


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
