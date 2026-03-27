"""Tests for rayoptics_web_utils.utils module."""


class TestFigToBase64:
    """Tests for the _fig_to_base64 helper."""

    def test_returns_base64_string(self):
        import matplotlib.pyplot as plt
        from rayoptics_web_utils.utils import _fig_to_base64
        fig, ax = plt.subplots()
        ax.plot([0, 1], [0, 1])
        result = _fig_to_base64(fig)
        assert isinstance(result, str)
        # Should be valid base64 — starts with PNG header in base64
        assert result.startswith('iVBOR')


class TestGetWvlLbl:
    """Tests for the _get_wvl_lbl helper."""

    def test_returns_wavelength_string(self):
        from rayoptics_web_utils.utils import _get_wvl_lbl

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
