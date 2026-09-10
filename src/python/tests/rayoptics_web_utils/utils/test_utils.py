"""Tests for rayoptics_web_utils.utils module."""

import base64


class TestFigToBase64:
    """Encoding closes registered figures on success and on save failures."""

    def test_closes_figure_when_save_fails(self, monkeypatch):
        import matplotlib.pyplot as plt
        import pytest
        from rayoptics_web_utils.utils import _fig_to_base64

        fig = plt.figure()

        def fail_save(*args, **kwargs):
            raise RuntimeError("save failed")

        monkeypatch.setattr(fig, "savefig", fail_save)
        try:
            with pytest.raises(RuntimeError, match="save failed"):
                _fig_to_base64(fig)
            assert not plt.fignum_exists(fig.number)
        finally:
            plt.close(fig)

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


def test_fig_to_base64_forwards_png_save_options_and_closes_the_same_figure(monkeypatch):
    import rayoptics_web_utils.utils.utils as utils_module

    save_calls = []
    close_calls = []

    class FakeFigure:
        def savefig(self, buffer, **kwargs):
            save_calls.append(kwargs)
            buffer.write(b"synthetic png")

    figure = FakeFigure()
    monkeypatch.setattr(utils_module.plt, "close", close_calls.append)

    result = utils_module._fig_to_base64(figure, dpi=237)

    assert result == base64.b64encode(b"synthetic png").decode("utf-8")
    assert save_calls == [
        {"format": "png", "dpi": 237, "bbox_inches": "tight"}
    ]
    assert close_calls == [figure]


def test_fig_to_base64_uses_150_dpi_by_default(monkeypatch):
    import rayoptics_web_utils.utils.utils as utils_module

    save_calls = []

    class FakeFigure:
        def savefig(self, buffer, **kwargs):
            save_calls.append(kwargs)
            buffer.write(b"synthetic png")

    monkeypatch.setattr(utils_module.plt, "close", lambda figure: None)

    utils_module._fig_to_base64(FakeFigure())

    assert save_calls == [
        {"format": "png", "dpi": 150, "bbox_inches": "tight"}
    ]
