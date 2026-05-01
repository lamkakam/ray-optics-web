"""Tests for rayoptics_web_utils.plotting module."""


class TestPlotFunctionExports:
    """Verify only the active plotting renderer is exported."""

    def test_plotting_package_exports_only_lens_layout(self):
        import rayoptics_web_utils.plotting as plotting_package

        assert plotting_package.__all__ == ["plot_lens_layout"]
        assert hasattr(plotting_package, "plot_lens_layout")

        obsolete_exports = [
            "plot_ray_fan",
            "plot_opd_fan",
            "plot_spot_diagram",
            "plot_surface_by_surface_3rd_order_aberr",
            "plot_wavefront_map",
            "plot_geo_psf",
            "plot_diffraction_psf",
        ]
        for export_name in obsolete_exports:
            assert not hasattr(plotting_package, export_name)

    def test_top_level_lazy_imports_expose_only_lens_layout_plotter(self):
        import rayoptics_web_utils

        assert rayoptics_web_utils._LAZY_IMPORTS["plot_lens_layout"] == "rayoptics_web_utils.plotting.plotting"

        obsolete_exports = [
            "plot_ray_fan",
            "plot_opd_fan",
            "plot_spot_diagram",
            "plot_surface_by_surface_3rd_order_aberr",
            "plot_wavefront_map",
            "plot_geo_psf",
            "plot_diffraction_psf",
        ]
        for export_name in obsolete_exports:
            assert export_name not in rayoptics_web_utils._LAZY_IMPORTS


class TestPlotFunctionSignatures:
    """Verify that the active plotting function accepts the expected parameters."""

    def test_plot_lens_layout_accepts_opm(self):
        from rayoptics_web_utils.plotting import plot_lens_layout
        import inspect
        sig = inspect.signature(plot_lens_layout)
        assert list(sig.parameters.keys()) == ['opm', 'show_ray_fan_vs_wvls', 'is_dark']
        assert sig.parameters['show_ray_fan_vs_wvls'].default is False
        assert sig.parameters['is_dark'].default is False


class TestPlotLensLayout:
    """Tests for the plot_lens_layout function."""

    def test_plot_lens_layout_uses_default_interactive_layout_options(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {}

        class FakeFigure:
            def __init__(self):
                self.plot_called = False

            def plot(self):
                self.plot_called = True

        fake_fig = FakeFigure()

        def fake_figure(**kwargs):
            captured["figure_kwargs"] = kwargs
            return fake_fig

        def fake_fig_to_base64(fig):
            captured["converted_fig"] = fig
            return "encoded-layout"

        monkeypatch.setattr(plotting.plt, "figure", fake_figure)
        monkeypatch.setattr(plotting, "_fig_to_base64", fake_fig_to_base64)

        result = plotting.plot_lens_layout(cooke_triplet, is_dark=True)

        assert result == "encoded-layout"
        assert fake_fig.plot_called is True
        assert captured["converted_fig"] is fake_fig
        assert captured["figure_kwargs"] == {
            "FigureClass": plotting.InteractiveLayout,
            "opt_model": cooke_triplet,
            "do_draw_rays": True,
            "do_paraxial_layout": False,
            "is_dark": True,
        }

    def test_plot_lens_layout_can_render_ray_fan_vs_wavelengths(self, monkeypatch, cooke_triplet):
        from rayoptics_web_utils.plotting import plotting

        captured = {"rayfans": [], "bundles": []}

        class FakeFigure:
            def __init__(self):
                self.plot_called = False
                self.sl_so = ("unused", 17.5)

            def plot(self):
                self.plot_called = True

        fake_fig = FakeFigure()

        def fake_figure(**kwargs):
            captured["figure_kwargs"] = kwargs
            return fake_fig

        def fake_rayfan(opt_model, **kwargs):
            rayfan = {"opt_model": opt_model, **kwargs}
            captured["rayfans"].append(rayfan)
            return rayfan

        def fake_rayfan_bundle(opt_model, rayfan, start_offset):
            bundle = {
                "opt_model": opt_model,
                "rayfan": rayfan,
                "start_offset": start_offset,
            }
            captured["bundles"].append(bundle)
            return bundle

        def fake_fig_to_base64(fig):
            captured["converted_fig"] = fig
            return "encoded-ray-fans"

        monkeypatch.setattr(plotting.plt, "figure", fake_figure)
        monkeypatch.setattr(plotting, "RayFan", fake_rayfan)
        monkeypatch.setattr(plotting, "RayFanBundle", fake_rayfan_bundle)
        monkeypatch.setattr(plotting, "_fig_to_base64", fake_fig_to_base64)

        result = plotting.plot_lens_layout(cooke_triplet, show_ray_fan_vs_wvls=True, is_dark=True)

        assert result == "encoded-ray-fans"
        assert fake_fig.plot_called is True
        assert captured["converted_fig"] is fake_fig

        figure_kwargs = captured["figure_kwargs"]
        assert figure_kwargs["FigureClass"] is plotting.InteractiveLayout
        assert figure_kwargs["opt_model"] is cooke_triplet
        assert figure_kwargs["do_draw_rays"] is False
        assert figure_kwargs["do_draw_beams"] is False
        assert figure_kwargs["do_draw_edge_rays"] is False
        assert figure_kwargs["do_paraxial_layout"] is False
        assert figure_kwargs["is_dark"] is True

        entity_factory_list = figure_kwargs["entity_factory_list"]
        assert len(entity_factory_list) == 1

        entity_factory, args, kwargs = entity_factory_list[0]
        assert args == (cooke_triplet,)
        assert kwargs == {"num_rays": 3}

        bundles = entity_factory(fake_fig, *args, **kwargs)
        assert bundles == captured["bundles"]

        wvls = cooke_triplet["optical_spec"]["wvls"]
        fov = cooke_triplet["optical_spec"]["fov"]
        assert len(captured["rayfans"]) == len(wvls.wavelengths)
        assert len(captured["bundles"]) == len(wvls.wavelengths)

        for idx, rayfan in enumerate(captured["rayfans"]):
            assert rayfan["opt_model"] is cooke_triplet
            assert rayfan["f"] is fov.fields[0]
            assert rayfan["wl"] == wvls.wavelengths[idx]
            assert rayfan["xyfan"] == "y"
            assert rayfan["num_rays"] == 3
            assert rayfan["label"] == fov.index_labels[0]
            assert rayfan["color"] == wvls.render_colors[idx]

        for idx, bundle in enumerate(captured["bundles"]):
            assert bundle["opt_model"] is cooke_triplet
            assert bundle["rayfan"] is captured["rayfans"][idx]
            assert bundle["start_offset"] == 17.5
