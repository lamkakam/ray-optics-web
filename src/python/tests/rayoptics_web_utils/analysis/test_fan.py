"""Behavioral tests for transverse and OPD fan sampling contracts.

The tests use deterministic tracing fakes to make wavelength forwarding,
reference-point selection, blocked-ray handling, and JSON payload assembly
observable without depending on a particular optical prescription.
"""

from types import SimpleNamespace

import numpy as np
import pytest


def _fan_model(wavelengths=(500.0, 600.0)):
    field = SimpleNamespace()
    optical_spec = SimpleNamespace(
        field_of_view=SimpleNamespace(fields=[field]),
        spectral_region=SimpleNamespace(wavelengths=list(wavelengths)),
        defocus=SimpleNamespace(get_focus=lambda: 2.5),
    )
    opm = SimpleNamespace(
        optical_spec=optical_spec,
        seq_model=SimpleNamespace(central_wavelength=lambda: 550.0),
        system_spec=SimpleNamespace(dimensions="mm"),
    )
    return opm, field


class TestTraceFanSeries:
    """Verify the shared fan tracer's sampling and reference contracts."""

    def test_rejects_non_integer_and_out_of_range_wavelength_indices(self, monkeypatch):
        import rayoptics_web_utils.analysis._fan as module

        opm, _ = _fan_model()
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)

        for index in (-1, 2, 1.5):
            with pytest.raises(
                IndexError,
                match=rf"^wavelength index {index} is out of range$",
            ):
                module._trace_fan_series(
                    opm,
                    0,
                    0,
                    lambda *args: 0.0,
                    wvl_idx=index,
                )

    def test_private_fan_default_image_point_is_chief_ray(self):
        import inspect
        import rayoptics_web_utils.analysis._fan as module

        signature = inspect.signature(module._trace_fan_series)
        assert signature.parameters["image_point"].default == "chief_ray"

    def test_finite_chief_mode_uses_central_reference_and_trace_options(self, monkeypatch):
        import rayoptics_web_utils.analysis._fan as module

        opm, field = _fan_model()
        setup_calls = []
        central_sphere = (np.array([9.0, 8.0, 7.0]), "central-sphere")

        def fake_setup(model, received_field, wavelength, focus, **kwargs):
            setup_calls.append(
                {
                    "model": model,
                    "field": received_field,
                    "wavelength": wavelength,
                    "focus": focus,
                    "image_pt": kwargs.get("image_pt"),
                    "ref_before": getattr(received_field, "ref_sphere", None),
                }
            )
            if wavelength == 550.0:
                return central_sphere, "central-chief"
            return ("sphere", wavelength), ("chief", wavelength)

        trace_calls = []

        def fake_trace_safe(*args, **kwargs):
            trace_calls.append((args, kwargs))
            return SimpleNamespace(err=None, pkg=object())

        def is_finite(model):
            assert model is opm
            return False

        monkeypatch.setattr(module, "is_afocal_image_space", is_finite)
        monkeypatch.setattr(module, "_reference_sphere", lambda *args: "reference")
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(module.trace, "trace_safe", fake_trace_safe)

        x_values, y_values = module._trace_fan_series(
            opm,
            0,
            1,
            lambda pupil, xy, *args: float(pupil[xy]),
            image_point="chief_ray",
        )

        assert [call["wavelength"] for call in setup_calls] == [550.0, 500.0, 600.0]
        assert setup_calls[0]["model"] is opm
        assert setup_calls[0]["field"] is field
        assert setup_calls[0]["focus"] == 2.5
        assert setup_calls[1]["image_pt"] is central_sphere[0]
        assert setup_calls[1]["ref_before"] is central_sphere
        assert len(trace_calls) == 42
        assert all(call[1]["rayerr_filter"] == "summary" for call in trace_calls)
        assert all(call[1]["check_apertures"] is True for call in trace_calls)
        assert x_values[0][0] == pytest.approx(-1.0)
        assert x_values[0][-1] == pytest.approx(1.0)
        assert y_values[1][10] == pytest.approx(0.0)
        assert field.chief_ray == ("chief", 600.0)
        assert field.ref_sphere == "reference"

    def test_centroid_mode_resolves_requested_wavelength_and_coerces_reference_point(
        self, monkeypatch
    ):
        import rayoptics_web_utils.analysis._fan as module

        opm, _ = _fan_model()
        resolve_calls = []
        setup_calls = []

        def fake_resolve(model, **kwargs):
            resolve_calls.append((model, kwargs))
            return ["4.0", "5.0", "6.0"]

        def fake_setup(*args, **kwargs):
            setup_calls.append(kwargs.get("image_pt"))
            return "sphere", "chief"

        def is_finite(model):
            assert model is opm
            return False

        monkeypatch.setattr(module, "is_afocal_image_space", is_finite)
        monkeypatch.setattr(module, "_resolve_image_point", fake_resolve)
        monkeypatch.setattr(module, "_reference_sphere", lambda *args: "reference")
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(
            module.trace,
            "trace_safe",
            lambda *args, **kwargs: SimpleNamespace(err=None, pkg=object()),
        )

        module._trace_fan_series(
            opm,
            0,
            0,
            lambda *args: 0.0,
            image_point="centroid",
            wvl_idx=1,
        )

        assert resolve_calls == [
            (
                opm,
                {
                    "fi": 0,
                    "wavelength_nm": 600.0,
                    "foc": 2.5,
                    "num_rays": 21,
                    "image_point": "centroid",
                },
            )
        ]
        assert setup_calls
        assert setup_calls[0] == ["4.0", "5.0", "6.0"]

    def test_centroid_mode_coerces_an_explicit_reference_point(self, monkeypatch):
        import rayoptics_web_utils.analysis._fan as module

        opm, _ = _fan_model((500.0,))
        setup_calls = []

        def fake_setup(*args, **kwargs):
            setup_calls.append(kwargs["image_pt"])
            return "sphere", "chief"

        def is_finite(model):
            assert model is opm
            return False

        monkeypatch.setattr(module, "is_afocal_image_space", is_finite)
        monkeypatch.setattr(module, "_reference_sphere", lambda *args: "reference")
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(
            module.trace,
            "trace_safe",
            lambda *args, **kwargs: SimpleNamespace(err=None, pkg=object()),
        )

        module._trace_fan_series(
            opm,
            0,
            0,
            lambda *args: 0.0,
            image_point="centroid",
            finite_reference_point=["1.0", "2.0", "3.0"],
        )

        assert setup_calls[0].dtype == float
        np.testing.assert_allclose(setup_calls[0], [1.0, 2.0, 3.0])

    def test_afocal_centroid_mode_does_not_request_a_finite_image_point(self, monkeypatch):
        import rayoptics_web_utils.analysis._fan as module

        opm, _ = _fan_model((550.0,))
        setup_calls = []

        def fail_resolve(*args, **kwargs):
            pytest.fail("afocal fan tracing must not resolve a finite image point")

        def fake_setup(*args, **kwargs):
            setup_calls.append(kwargs)
            return "sphere", "chief"

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(module, "_resolve_image_point", fail_resolve)
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(
            module.trace,
            "trace_safe",
            lambda *args, **kwargs: SimpleNamespace(err=None, pkg=object()),
        )

        module._trace_fan_series(
            opm,
            0,
            1,
            lambda *args: 0.0,
            image_point="centroid",
        )

        assert setup_calls == [{"image_pt": None}]

    def test_blocked_and_missing_packages_are_both_reported_as_none(self, monkeypatch):
        import rayoptics_web_utils.analysis._fan as module

        opm, _ = _fan_model((550.0,))
        results = iter(
            [
                SimpleNamespace(err=RuntimeError("blocked"), pkg=object()),
                SimpleNamespace(err=None, pkg=None),
                *[SimpleNamespace(err=None, pkg=object()) for _ in range(19)],
            ]
        )
        filter_calls = []

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(
            module.trace,
            "setup_pupil_coords",
            lambda *args, **kwargs: ("sphere", "chief"),
        )
        monkeypatch.setattr(module.trace, "trace_safe", lambda *args, **kwargs: next(results))

        def fan_filter(*args):
            filter_calls.append(args)
            return 7.0

        _, y_values = module._trace_fan_series(opm, 0, 0, fan_filter)

        assert y_values == [[None, None] + [7.0] * 19]
        assert len(filter_calls) == 19


class TestRayFanPayload:
    """Verify the public ray-fan payload and callback geometry."""

    def test_default_arguments_and_two_axes_are_stable(self):
        import inspect
        from rayoptics_web_utils.analysis import ray_fan

        signature = inspect.signature(ray_fan.get_ray_fan_data)
        assert signature.parameters["image_point"].default == "chief_ray"

    def test_payload_forwards_image_point_and_preserves_axis_series(self, monkeypatch):
        import rayoptics_web_utils.analysis.ray_fan as module

        opm, _ = _fan_model((500.0,))
        calls = []

        def fake_trace(model, fi, xy, fan_filter, **kwargs):
            calls.append((model, fi, xy, kwargs))
            if xy == 0:
                return [[-1.0, 0.0, 1.0]], [[1.0, None, 3.0]]
            return [[-0.5, 0.5]], [[4.0, 5.0]]

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)
        monkeypatch.setattr(module, "_trace_fan_series", fake_trace)
        monkeypatch.setattr(
            module,
            "_system_units",
            lambda model: "mm",
        )

        result = module.get_ray_fan_data(opm, 4, image_point="centroid")

        assert calls == [
            (opm, 4, 0, {"image_point": "centroid"}),
            (opm, 4, 1, {"image_point": "centroid"}),
        ]
        assert result == [
            {
                "fieldIdx": 4,
                "wvlIdx": 0,
                "Sagittal": {"x": [-1.0, 0.0, 1.0], "y": [1.0, None, 3.0]},
                "Tangential": {"x": [-0.5, 0.5], "y": [4.0, 5.0]},
                "unitX": "",
                "unitY": "mm",
            }
        ]

    def test_afocal_callback_uses_direction_reference_and_requested_axis(self, monkeypatch):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.analysis.ray_fan as module

        opm, field = _fan_model((550.0,))
        ray_pkg = [{mc.ray: object()}]
        reference_calls = []
        angular_calls = []

        def fake_reference(model, fi, wavelength, **kwargs):
            reference_calls.append((model, fi, wavelength, kwargs))
            return np.array([0.0, 0.0, 1.0]), "chief"

        def fake_output_segment(package):
            assert package is ray_pkg
            return np.zeros(3), np.array([0.0, 0.0, 1.0])

        def fake_angular(direction, reference):
            angular_calls.append((direction, reference))
            return np.array([11.0, 22.0])

        def fake_trace(model, fi, xy, fan_filter, **kwargs):
            return [[-1.0, 1.0]], [[
                fan_filter(np.array([0.0, 0.0]), xy, ray_pkg, field, 550.0, 2.5),
                fan_filter(np.array([0.0, 0.0]), xy, ray_pkg, field, 550.0, 2.5),
            ]]

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(module, "reference_direction", fake_reference)
        monkeypatch.setattr(module, "output_segment", fake_output_segment)
        monkeypatch.setattr(module, "angular_coordinates", fake_angular)
        monkeypatch.setattr(module, "_trace_fan_series", fake_trace)

        result = module.get_ray_fan_data(opm, 0, image_point="centroid")

        assert len(reference_calls) == 1
        assert reference_calls[0][2] == 550.0
        assert reference_calls[0][3] == {"image_point": "centroid"}
        assert len(angular_calls) == 4
        assert result[0]["Sagittal"]["y"] == [11.0, 11.0]
        assert result[0]["Tangential"]["y"] == [22.0, 22.0]
        assert result[0]["unitY"] == "arcsec"

    def test_finite_callback_projects_last_ray_segment_to_reference_sphere(self, monkeypatch):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.analysis.ray_fan as module

        opm, field = _fan_model((550.0,))
        field.ref_sphere = (np.array([1.0, 2.0, 0.0]), "radius")
        ray_segment = {mc.p: np.array([5.0, 7.0, 1.0]), mc.d: np.array([1.0, 2.0, 2.0])}
        ray_pkg = [[ray_segment]]
        callbacks = []

        def fake_trace(model, fi, xy, fan_filter, **kwargs):
            callbacks.append(fan_filter)
            fan_filter(np.array([0.0, 0.0]), xy, ray_pkg, field, 550.0, 4.0)
            return [[-1.0]], [[0.0]]

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)
        monkeypatch.setattr(module, "_trace_fan_series", fake_trace)

        module.get_ray_fan_data(opm, 0)

        assert len(callbacks) == 2
        assert callbacks[0](np.array([0.0, 0.0]), 0, ray_pkg, field, 550.0, 4.0) == pytest.approx(6.0)
        assert callbacks[1](np.array([0.0, 0.0]), 1, ray_pkg, field, 550.0, 4.0) == pytest.approx(9.0)
