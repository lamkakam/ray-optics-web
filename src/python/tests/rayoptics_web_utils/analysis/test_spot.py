"""Behavioral tests for spot-diagram tracing and payload construction.

Deterministic tracing and centroid fakes make the finite and afocal geometry
branches observable, including wavelength/focus forwarding, spectral weighting,
blocked-ray policy, and the public JSON field mapping.
"""

import inspect
from types import SimpleNamespace

import numpy as np
import pytest


class _IndexableNamespace(SimpleNamespace):
    """Provide the legacy ``opm["osp"]["pupil"]`` access used by tracing."""

    def __getitem__(self, key):
        if key == "osp":
            return {"pupil": self.optical_spec.pupil}
        raise KeyError(key)


def _spot_model(wavelengths=(550.0, 650.0), weights=(1.0, 2.0)):
    field = SimpleNamespace()
    optical_spec = SimpleNamespace(
        field_of_view=SimpleNamespace(fields=[field]),
        spectral_region=SimpleNamespace(
            wavelengths=list(wavelengths), spectral_wts=list(weights)
        ),
        defocus=SimpleNamespace(get_focus=lambda: 2.5),
        pupil=object(),
    )
    opm = _IndexableNamespace(
        optical_spec=optical_spec,
        seq_model=None,
        system_spec=SimpleNamespace(dimensions="mm"),
    )
    return opm, field


class TestSpotFiniteChiefRay:
    """Verify finite chief-ray spot geometry and trace options."""

    def test_default_image_point_is_chief_ray(self):
        from rayoptics_web_utils.analysis import spot

        signature = inspect.signature(spot.get_spot_data)
        assert signature.parameters["image_point"].default == "chief_ray"

    def test_chief_ray_projects_the_last_segment_and_builds_payload(self, monkeypatch):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.analysis.spot as module

        opm, field = _spot_model((550.0,))
        field.ref_sphere = (np.array([1.0, 2.0, 3.0]), "radius")
        segment = {
            mc.p: np.array([5.0, 7.0, 1.0]),
            mc.d: np.array([1.0, 2.0, 2.0]),
        }
        ray_pkg = [[segment]]
        trace_calls = []

        class FakeSequentialModel:
            def trace_grid(self, callback, fi, **kwargs):
                trace_calls.append((callback, fi, kwargs))
                projected = callback(np.array([0.0, 0.0]), 0, ray_pkg, field, 550.0, 4.0)
                assert callback(
                    np.array([0.0, 0.0]), 0, None, field, 550.0, 4.0
                ) is None
                return [[projected]], "unused-reference"

        opm.seq_model = FakeSequentialModel()
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)

        result = module.get_spot_data(opm, 0)

        assert len(trace_calls) == 1
        assert trace_calls[0][1] == 0
        assert trace_calls[0][2] == {
            "wl": None,
            "num_rays": 21,
            "form": "list",
            "append_if_none": False,
        }
        assert result == [
            {
                "fieldIdx": 0,
                "wvlIdx": 0,
                "x": [6.0],
                "y": [9.0],
                "unitX": "mm",
                "unitY": "mm",
            }
        ]


class TestSpotCentroid:
    """Verify weighted finite and afocal centroid cloud construction."""

    def test_finite_centroid_flattens_points_and_repeats_spectral_weights(
        self, monkeypatch
    ):
        import rayoptics_web_utils.analysis.spot as module

        opm, field = _spot_model((500.0, 600.0), (1.0, 3.0))
        raw_grids = {500.0: object(), 600.0: object()}
        sample_calls = []
        point_calls = []
        centroid_calls = []

        def fake_sample(model, received_field, wavelength, focus, num_rays):
            sample_calls.append((model, received_field, wavelength, focus, num_rays))
            return raw_grids[wavelength]

        def fake_project(raw_grid, focus):
            point_calls.append((raw_grid, focus))
            if raw_grid is raw_grids[500.0]:
                return [np.array([10.0, 20.0, 0.0]), np.array([30.0, 40.0, 0.0])]
            return [np.array([100.0, 200.0, 0.0]), np.array([300.0, 400.0, 0.0])]

        def fake_centroid(values, weights):
            centroid_calls.append((values, weights))
            return np.array([40.0, 50.0, 0.0])

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)
        monkeypatch.setattr(module, "sample_valid_rays", fake_sample)
        monkeypatch.setattr(module, "projected_image_points", fake_project)
        monkeypatch.setattr(module, "weighted_centroid", fake_centroid)

        result = module.get_spot_data(opm, 0, image_point="centroid")

        assert sample_calls == [
            (opm, field, 500.0, 2.5, 21),
            (opm, field, 600.0, 2.5, 21),
        ]
        assert point_calls == [(raw_grids[500.0], 2.5), (raw_grids[600.0], 2.5)]
        assert len(centroid_calls) == 1
        values, weights = centroid_calls[0]
        np.testing.assert_allclose(values, [
            [10.0, 20.0, 0.0],
            [30.0, 40.0, 0.0],
            [100.0, 200.0, 0.0],
            [300.0, 400.0, 0.0],
        ])
        assert weights == [1.0, 1.0, 3.0, 3.0]
        assert result == [
            {
                "fieldIdx": 0,
                "wvlIdx": 0,
                "x": [-30.0, -10.0],
                "y": [-30.0, -10.0],
                "unitX": "mm",
                "unitY": "mm",
            },
            {
                "fieldIdx": 0,
                "wvlIdx": 1,
                "x": [60.0, 260.0],
                "y": [150.0, 350.0],
                "unitX": "mm",
                "unitY": "mm",
            },
        ]

    def test_finite_centroid_rejects_mismatched_spectral_weights(self, monkeypatch):
        import rayoptics_web_utils.analysis.spot as module

        opm, _ = _spot_model((500.0, 600.0), (1.0,))
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)
        monkeypatch.setattr(
            module,
            "sample_valid_rays",
            lambda *args: object(),
        )
        monkeypatch.setattr(
            module,
            "projected_image_points",
            lambda *args: [np.zeros(3)],
        )

        with pytest.raises(ValueError, match=r"zip\(\) argument 2 is longer"):
            module.get_spot_data(opm, 0, image_point="centroid")

    def test_afocal_centroid_uses_normalized_directions_and_arcsecond_units(
        self, monkeypatch
    ):
        import rayoptics_web_utils.analysis.spot as module

        opm, field = _spot_model((500.0, 600.0), (1.0, 3.0))
        raw_grids = {500.0: "grid-a", 600.0: "grid-b"}
        packages = {
            "grid-a": [
                [(0.0, 0.0, "a")],
                [(0.0, 0.0, None)],
            ],
            "grid-b": [[(0.0, 0.0, "b")]],
        }
        centroid_calls = []
        angular_calls = []

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(
            module,
            "sample_valid_rays",
            lambda model, received_field, wavelength, focus, num_rays: raw_grids[wavelength],
        )
        monkeypatch.setattr(
            module,
            "output_segment",
            lambda package: (np.zeros(3), {"a": np.array([1.0, 0.0, 1.0]), "b": np.array([0.0, 1.0, 1.0])}[package]),
        )
        monkeypatch.setattr(
            module,
            "weighted_centroid",
            lambda values, weights: (
                centroid_calls.append((values, weights))
                or np.array([1.0, 1.0, 2.0])
            ),
        )

        def fake_angular(direction, reference):
            angular_calls.append((direction, reference))
            return np.array([direction[0] * 10.0, direction[1] * 20.0])

        monkeypatch.setattr(module, "angular_coordinates", fake_angular)
        monkeypatch.setattr(
            module,
            "_unit",
            lambda value: np.asarray(value, dtype=float) / np.linalg.norm(value),
        )

        monkeypatch.setattr(
            module,
            "sample_valid_rays",
            lambda model, received_field, wavelength, focus, num_rays: packages[
                raw_grids[wavelength]
            ],
        )

        result = module.get_spot_data(opm, 0, image_point="centroid")

        assert len(centroid_calls) == 1
        values, weights = centroid_calls[0]
        np.testing.assert_allclose(values, [[1.0, 0.0, 1.0], [0.0, 1.0, 1.0]])
        assert weights == [1.0, 3.0]
        assert len(angular_calls) == 2
        assert result[0]["x"] == [10.0]
        assert result[0]["y"] == [0.0]
        assert result[1]["x"] == [0.0]
        assert result[1]["y"] == [20.0]
        assert result[0]["unitX"] == result[0]["unitY"] == "arcsec"


class TestSpotAfocalChiefRay:
    """Verify afocal chief-ray tracing uses one angular cloud per wavelength."""

    def test_afocal_chief_ray_forwards_setup_and_grid_options(self, monkeypatch):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.analysis.spot as module

        opm, field = _spot_model((500.0, 600.0), (1.0, 2.0))
        setup_calls = []
        grid_calls = []
        reference_calls = []
        angular_calls = []
        ray_pkg = [{mc.ray: object()}]

        def fake_setup(model, received_field, wavelength, focus):
            setup_calls.append((model, received_field, wavelength, focus))
            return ("sphere", wavelength), ("chief", wavelength)

        def fake_grid(model, grid_def, received_field, wavelength, focus, **kwargs):
            grid_calls.append((model, grid_def, received_field, wavelength, focus, kwargs))
            callback = kwargs["img_filter"]
            point = callback(np.array([0.0, 0.0]), ray_pkg)
            assert callback(np.array([0.0, 0.0]), None) is None
            return [point]

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(
            field,
            "vignetting_bbox",
            lambda pupil: (np.array([-2.0, -3.0]), np.array([4.0, 5.0])),
            raising=False,
        )
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(module.trace, "trace_grid", fake_grid)
        monkeypatch.setattr(
            module,
            "reference_direction",
            lambda model, fi, wavelength, **kwargs: (
                reference_calls.append((model, fi, wavelength, kwargs))
                or (np.array([0.0, 0.0, 1.0]), "reference")
            ),
        )
        monkeypatch.setattr(module, "output_segment", lambda package: (np.zeros(3), np.ones(3)))
        monkeypatch.setattr(
            module,
            "angular_coordinates",
            lambda direction, reference: (
                angular_calls.append((direction, reference))
                or np.array([13.0, 17.0])
            ),
        )

        result = module.get_spot_data(opm, 0, image_point="chief_ray")

        assert setup_calls == [
            (opm, field, 500.0, 2.5),
            (opm, field, 600.0, 2.5),
        ]
        assert len(grid_calls) == 2
        np.testing.assert_allclose(grid_calls[0][1][0], [-2.0, -3.0])
        np.testing.assert_allclose(grid_calls[0][1][1], [4.0, 5.0])
        assert grid_calls[0][1][2] == 21
        assert [call[3] for call in grid_calls] == [500.0, 600.0]
        assert grid_calls[0][4] == 2.5
        assert grid_calls[0][5] == {
            "form": "list",
            "append_if_none": False,
            "apply_vignetting": False,
            "img_filter": grid_calls[0][5]["img_filter"],
        }
        assert len(reference_calls) == 2
        assert [call[2] for call in reference_calls] == [500.0, 600.0]
        assert all(call[3] == {"image_point": "chief_ray"} for call in reference_calls)
        assert field.chief_ray == ("chief", 600.0)
        assert field.ref_sphere == ("sphere", 600.0)
        assert len(angular_calls) == 2
        assert [entry["x"] for entry in result] == [[13.0], [13.0]]
        assert [entry["y"] for entry in result] == [[17.0], [17.0]]
        assert all(entry["unitX"] == entry["unitY"] == "arcsec" for entry in result)


class TestSpotFiniteCustomReference:
    """Verify the explicit non-chief finite tracing branch."""

    def test_custom_finite_branch_forwards_geometry_and_updates_field_caches(
        self, monkeypatch
    ):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.analysis.spot as module

        opm, field = _spot_model((550.0,))
        monkeypatch.setattr(
            field,
            "vignetting_bbox",
            lambda pupil: (np.array([-1.0, -2.0]), np.array([3.0, 4.0])),
            raising=False,
        )
        segment = {
            mc.p: np.array([5.0, 7.0, 1.0]),
            mc.d: np.array([1.0, 2.0, 2.0]),
        }
        ray_pkg = [[segment]]
        setup_calls = []
        grid_calls = []

        def fake_setup(model, received_field, wavelength, focus):
            setup_calls.append((model, received_field, wavelength, focus))
            return (np.array([1.0, 2.0, 3.0]), "radius"), ("chief", wavelength)

        def fake_grid(model, grid_def, received_field, wavelength, focus, **kwargs):
            grid_calls.append((model, grid_def, received_field, wavelength, focus, kwargs))
            point = kwargs["img_filter"](np.array([0.0, 0.0]), ray_pkg)
            return [point]

        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: False)
        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup)
        monkeypatch.setattr(module.trace, "trace_grid", fake_grid)

        result = module.get_spot_data(opm, 0, image_point="custom")

        assert setup_calls == [(opm, field, 550.0, 2.5)]
        assert len(grid_calls) == 1
        assert grid_calls[0][3:] == (
            550.0,
            2.5,
            {
                "form": "list",
                "append_if_none": False,
                "apply_vignetting": False,
                "img_filter": grid_calls[0][5]["img_filter"],
            },
        )
        np.testing.assert_allclose(grid_calls[0][1][0], [-1.0, -2.0])
        np.testing.assert_allclose(grid_calls[0][1][1], [3.0, 4.0])
        assert field.chief_ray == ("chief", 550.0)
        assert field.ref_sphere[1] == "radius"
        assert result[0]["x"] == [5.25]
        assert result[0]["y"] == [7.5]

    def test_afocal_centroid_rejects_mismatched_spectral_weights(self, monkeypatch):
        import rayoptics_web_utils.analysis.spot as module

        opm, _ = _spot_model((500.0, 600.0), (1.0,))
        monkeypatch.setattr(module, "is_afocal_image_space", lambda model: True)
        monkeypatch.setattr(
            module,
            "sample_valid_rays",
            lambda *args: [],
        )
        monkeypatch.setattr(module, "weighted_centroid", lambda values, weights: np.array([0.0, 0.0, 1.0]))
        monkeypatch.setattr(
            module,
            "_unit",
            lambda value: np.asarray(value, dtype=float),
        )

        with pytest.raises(ValueError, match=r"zip\(\) argument 2 is longer"):
            module.get_spot_data(opm, 0, image_point="centroid")
