"""Exact tests for field-curvature and astigmatism curve orchestration.

The fakes make field sampling, wavelength forwarding, pupil-cache assignment,
vergence axes, field units, and the tangential-minus-sagittal payload contract
observable without relying on a particular lens prescription.
"""

import inspect
from types import SimpleNamespace

import pytest


class _MappingNamespace(SimpleNamespace):
    """Expose attributes through the dictionary access used by RayOptics."""

    def __getitem__(self, key):
        return getattr(self, key)


def _field_model(key):
    """Build a model whose field specification has the requested key."""
    fov = SimpleNamespace(key=key, max_field=lambda: [8.0, 99.0])
    calls = []

    def lookup_fld_wvl_focus(field_idx, *, wl):
        assert field_idx == 0
        assert wl == 2
        calls.append((field_idx, wl))
        return object(), 550.0, 1.25

    optical_spec = _MappingNamespace(
        fov=fov,
        lookup_fld_wvl_focus=lookup_fld_wvl_focus,
    )
    opm = _MappingNamespace(
        optical_spec=optical_spec,
        system_spec=SimpleNamespace(dimensions="mm"),
    )
    return opm, fov, calls


class TestFieldUnit:
    """Exercise every supported field-key convention and fallback."""

    @pytest.mark.parametrize(
        ("key", "expected"),
        [
            (("object", "angle"), "deg"),
            (("object", "height"), "mm"),
            (("object", "other"), ""),
            (("object",), ""),
            (None, ""),
            (["object", "angle"], ""),
        ],
    )
    def test_field_unit_is_key_type_and_value_sensitive(self, key, expected):
        from rayoptics_web_utils.analysis.field_curves import _field_unit

        opm, _, _ = _field_model(key)

        assert _field_unit(opm) == expected


class TestTraceFieldCurves:
    """Verify finite and afocal field sampling with strict dependency fakes."""

    def test_signature_defaults_and_requested_sample_count(self, monkeypatch):
        import rayoptics_web_utils.analysis.field_curves as module

        parameters = inspect.signature(module._trace_field_curves).parameters
        assert parameters["num_points"].default == 21
        opm, fov, lookup_calls = _field_model(("object", "height"))
        observed = {"fields": [], "setup": [], "trace": []}

        class FakeField:
            def __init__(self, *, fov):
                assert fov is fov_reference
                self.yv = None
                self.chief_ray = None
                self.ref_sphere = None
                observed["fields"].append(self)

        fov_reference = fov
        monkeypatch.setattr(module, "Field", FakeField)
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)

        def fake_setup(model, field, wavelength, focus):
            assert model is opm
            assert field in observed["fields"]
            assert wavelength == 550.0
            assert focus == 1.25
            observed["setup"].append((field.yv, wavelength, focus))
            return "reference-sphere", "chief-cache"

        def fake_trace(model, field, wavelength, focus):
            assert model is opm
            assert wavelength == 550.0
            assert focus == 1.25
            assert field.chief_ray == "chief-cache"
            assert field.ref_sphere == "reference-sphere"
            observed["trace"].append(field.yv)
            return field.yv + 1.0, field.yv + 2.0

        monkeypatch.setattr(module, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(module, "trace_astigmatism", fake_trace)

        result = module._trace_field_curves(opm, wvl_idx=2, num_points=3)

        assert lookup_calls == [(0, 2)]
        assert observed["setup"] == [
            (0.0, 550.0, 1.25),
            (4.0, 550.0, 1.25),
            (8.0, 550.0, 1.25),
        ]
        assert observed["trace"] == [0.0, 4.0, 8.0]
        assert result == {
            "wvlIdx": 2,
            "Sagittal": {"x": [1.0, 5.0, 9.0], "y": [0.0, 1.0, 2.0]},
            "Tangential": {"x": [2.0, 6.0, 10.0], "y": [0.0, 1.0, 2.0]},
            "fieldLabels": ["0", "4", "8"],
            "unitX": "mm",
            "unitY": "mm",
        }

    def test_afocal_sampling_forwards_both_axes_and_uses_degree_field_units(self, monkeypatch):
        import rayoptics_web_utils.analysis.field_curves as module

        opm, fov, lookup_calls = _field_model(("object", "angle"))
        observed = []

        class FakeField:
            def __init__(self, *, fov):
                assert fov is fov_reference
                self.yv = None

        fov_reference = fov
        monkeypatch.setattr(module, "Field", FakeField)
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)

        def fake_vergence(model, field, wavelength, *, axis):
            assert model is opm
            assert wavelength == 550.0
            observed.append((field.yv, wavelength, axis))
            return 10.0 * axis + field.yv

        monkeypatch.setattr(module, "differential_output_vergence", fake_vergence)

        result = module._trace_field_curves(opm, wvl_idx=2, num_points=3)

        assert lookup_calls == [(0, 2)]
        assert observed == [
            (0.0, 550.0, 0),
            (0.0, 550.0, 1),
            (4.0, 550.0, 0),
            (4.0, 550.0, 1),
            (8.0, 550.0, 0),
            (8.0, 550.0, 1),
        ]
        assert result["Sagittal"]["x"] == pytest.approx([0.0, 4.0, 8.0])
        assert result["Tangential"]["x"] == pytest.approx([10.0, 14.0, 18.0])
        assert result["unitX"] == "D"
        assert result["unitY"] == "deg"


class TestAstigmatismCurvePayload:
    """Verify wrapper forwarding and tangential-minus-sagittal arithmetic."""

    def test_wrapper_preserves_sampling_argument_and_metadata(self, monkeypatch):
        import rayoptics_web_utils.analysis.field_curves as module

        observed = []

        def fake_trace(model, wvl_idx, num_points=21):
            observed.append((model, wvl_idx, num_points))
            return {
                "wvlIdx": 2,
                "Sagittal": {"x": [1.0, 2.0], "y": [0.0, 1.0]},
                "Tangential": {"x": [5.0, 3.0], "y": [0.0, 1.0]},
                "fieldLabels": ["0", "8"],
                "unitX": "D",
                "unitY": "deg",
            }

        monkeypatch.setattr(module, "_trace_field_curves", fake_trace)
        marker = object()

        result = module.get_astigmatism_curve_data(marker, wvl_idx=7, num_points=2)

        assert observed == [(marker, 7, 2)]
        assert result == {
            "wvlIdx": 2,
            "Astigmatism": {
                "x": pytest.approx([4.0, 1.0]),
                "y": [0.0, 1.0],
            },
            "fieldLabels": ["0", "8"],
            "unitX": "D",
            "unitY": "deg",
        }

    def test_wrapper_truncates_only_to_the_shorter_curve(self, monkeypatch):
        import rayoptics_web_utils.analysis.field_curves as module

        monkeypatch.setattr(
            module,
            "_trace_field_curves",
            lambda *args, **kwargs: {
                "wvlIdx": 0,
                "Sagittal": {"x": [1.0, 2.0], "y": [0.0, 1.0]},
                "Tangential": {"x": [4.0, 5.0, 6.0], "y": [0.0, 1.0, 2.0]},
                "fieldLabels": ["0", "1", "2"],
                "unitX": "mm",
                "unitY": "deg",
            },
        )

        result = module.get_astigmatism_curve_data(object(), wvl_idx=0, num_points=3)

        assert result["Astigmatism"]["x"] == pytest.approx([3.0, 3.0])
        assert result["Astigmatism"]["y"] == [0.0, 1.0]


class TestFieldCurvePublicDefaults:
    """Keep the public sample-count defaults stable."""

    @pytest.mark.parametrize("name", ["get_field_curvature_data", "get_astigmatism_curve_data"])
    def test_public_default_num_points_is_21(self, name):
        from rayoptics_web_utils.analysis import field_curves

        assert inspect.signature(getattr(field_curves, name)).parameters["num_points"].default == 21
