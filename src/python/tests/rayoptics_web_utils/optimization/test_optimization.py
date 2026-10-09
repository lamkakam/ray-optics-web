"""Behavioral tests for configuration, operand evaluation, and optimization.

The suite exercises normalized configuration contracts, weighted scalar/vector
merit evaluation, pickup and target state, solver dispatch, progress, and
failure behavior through real models and deterministic fakes.
"""

import json
import math
from types import SimpleNamespace

import numpy as np
import pytest


@pytest.fixture
def fresh_cooke_triplet():
    """Build a fresh Cooke Triplet optical model (function-scoped to avoid mutation)."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=12.5)
    osp["fov"] = FieldSpec(osp, key=["object", "angle"], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp["wvls"] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
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


class TestRmsWavefrontErrorOperand:
    def test_uses_scaled_opd_grid_without_exit_pupil_extraction(self, monkeypatch):
        import rayoptics_web_utils.optimization.operands as operands

        class FakeOpticalModel:
            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": type("FakeWavelengths", (), {"wavelengths": [500.0, 1000.0]})()}
                raise KeyError(key)

        class FakeRayGrid:
            grid = np.array([[[0.0, 0.0]], [[0.0, 0.0]], [[1.0, 3.0]]])

        opm = FakeOpticalModel()

        def fake_make_ray_grid(opm_arg, fi, wavelength_nm, num_rays, image_point="chief_ray"):
            assert opm_arg is opm
            assert fi == 3
            assert wavelength_nm == 1000.0
            assert num_rays == 5
            assert image_point == "chief_ray"
            return FakeRayGrid()

        def fake_scale_opd_grid_to_wavelength(opd_grid, opm_arg, wavelength_nm):
            assert opm_arg is opm
            assert wavelength_nm == 1000.0
            return opd_grid * 2.0

        monkeypatch.setattr(operands, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(operands, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(operands, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)

        result = operands.compute_rms_wavefront_error(
            opm,
            field_index=3,
            wavelength_index=1,
            options={"num_rays": 5},
            image_point="chief_ray",
        )

        assert result == pytest.approx(np.std(np.array([2.0, 6.0])))

    def test_returns_penalty_when_scaled_opd_has_no_valid_samples(self, monkeypatch):
        import rayoptics_web_utils.optimization.operands as operands

        class FakeOpticalModel:
            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": type("FakeWavelengths", (), {"wavelengths": [500.0]})()}
                raise KeyError(key)

        class FakeRayGrid:
            grid = np.array([[[0.0]], [[0.0]], [[0.0]]])

        monkeypatch.setattr(operands, "make_ray_grid", lambda *args, **kwargs: FakeRayGrid())
        monkeypatch.setattr(operands, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(operands, "_scale_opd_grid_to_wavelength", lambda *args, **kwargs: np.array([[np.nan]]))

        result = operands.compute_rms_wavefront_error(
            FakeOpticalModel(),
            field_index=0,
            wavelength_index=0,
            options=None,
            image_point="chief_ray",
        )

        assert result == operands.PENALTY_RESIDUAL

    def test_passes_image_point_to_ray_grid(self, monkeypatch):
        import rayoptics_web_utils.optimization.operands as operands

        class FakeOpticalModel:
            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": type("FakeWavelengths", (), {"wavelengths": [587.0]})()}
                raise KeyError(key)

        class FakeRayGrid:
            grid = np.array([[[0.0]], [[0.0]], [[1.0]]])

        captured_kwargs = {}

        def fake_make_ray_grid(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return FakeRayGrid()

        monkeypatch.setattr(operands, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(operands, "_scale_opd_grid_to_wavelength", lambda opd_grid, opm, wavelength_nm: opd_grid)

        operands.compute_rms_wavefront_error(
            FakeOpticalModel(),
            field_index=0,
            wavelength_index=0,
            options=None,
            image_point="centroid",
        )

        assert captured_kwargs["image_point"] == "centroid"


class TestEvaluateOptimizationProblem:
    def test_defaults_image_point_to_chief_ray(self):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_opm
        import inspect

        evaluate_sig = inspect.signature(evaluate_optimization_problem)
        optimize_sig = inspect.signature(optimize_opm)

        assert evaluate_sig.parameters["image_point"].default == "chief_ray"
        assert optimize_sig.parameters["image_point"].default == "chief_ray"

    def test_accepts_ray_fan_without_target(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "ray_fan",
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        assert report["residuals"]
        assert "target" not in report["residuals"][0]

    def test_accepts_lm_variables_without_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [
                    {"kind": "thickness", "surface_index": 6},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["optimizer"]["method"] == "lm"
        assert report["initial_values"] == [
            {
                "kind": "thickness",
                "surface_index": 6,
                "value": pytest.approx(fresh_cooke_triplet["seq_model"].gaps[6].thi),
            }
        ]

    @pytest.mark.parametrize(
        ("variable", "prepare"),
        [
            (
                {
                    "kind": "asphere_polynomial_coefficient",
                    "surface_index": 1,
                    "asphere_kind": "RadialPolynomial",
                    "coefficient_index": 2,
                    "min": -0.002,
                    "max": 0.002,
                },
                "asphere",
            ),
            (
                {
                    "kind": "decenter_alpha",
                    "surface_index": 1,
                    "decenter_type": "bend",
                    "min": -2.0,
                    "max": 2.0,
                },
                "decenter",
            ),
        ],
    )
    def test_reports_bounded_trf_initial_values_outside_bounds(
        self,
        fresh_cooke_triplet,
        variable,
        prepare,
    ):
        from rayoptics.elem.profiles import RadialPolynomial
        from rayoptics.elem.surface import DecenterData
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        if prepare == "asphere":
            fresh_cooke_triplet["seq_model"].ifcs[1].profile = RadialPolynomial(
                r=23.713,
                cc=-1.2,
                coefs=[0.001, 0.002, 0.003],
            )
        else:
            fresh_cooke_triplet["seq_model"].ifcs[1].decenter = DecenterData("bend")
            fresh_cooke_triplet["seq_model"].ifcs[1].decenter.euler[0] = 3.0
        fresh_cooke_triplet.update_model()

        initial_value = (
            fresh_cooke_triplet["seq_model"].ifcs[1].profile.coefs[2]
            if prepare == "asphere"
            else fresh_cooke_triplet["seq_model"].ifcs[1].decenter.euler[0]
        )

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [variable],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {"kind": "focal_length", "target": 100.0, "weight": 1.0}
                    ]
                },
            },
        )

        current_value = (
            fresh_cooke_triplet["seq_model"].ifcs[1].profile.coefs[2]
            if prepare == "asphere"
            else fresh_cooke_triplet["seq_model"].ifcs[1].decenter.euler[0]
        )
        assert report["success"] is False
        assert report["status"] == "error"
        assert report["message"] == "Initial guess is outside of provided bounds"
        assert report["residuals"] == []
        assert report["initial_values"] == report["final_values"]
        assert current_value == pytest.approx(initial_value)

    @pytest.mark.parametrize("initial_radius", [20.0, 30.0])
    def test_accepts_bounded_trf_initial_values_equal_to_radius_bounds(
        self,
        fresh_cooke_triplet,
        initial_radius,
    ):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        fresh_cooke_triplet["seq_model"].ifcs[1].profile.r = initial_radius
        fresh_cooke_triplet.update_model()

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0}
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {"kind": "focal_length", "target": 100.0, "weight": 1.0}
                    ]
                },
            },
        )

        assert report["success"] is True

    def test_lm_evaluation_ignores_configured_initial_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 0.0, "max": 1.0}
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {"kind": "focal_length", "target": 100.0, "weight": 1.0}
                    ]
                },
            },
        )

        assert report["success"] is True

    def test_accepts_differential_evolution_without_method(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "differential_evolution", "max_nfev": 15},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["optimizer"]["kind"] == "differential_evolution"
        assert "method" not in report["optimizer"]

    def test_rejects_differential_evolution_legacy_maxiter(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Unsupported optimizer option for differential_evolution: maxiter"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "differential_evolution", "maxiter": 3},
                    "variables": [
                        {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "focal_length",
                                "target": 100.0,
                                "weight": 1.0,
                            }
                        ]
                    },
                },
            )

    def test_rejects_trf_variables_without_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Variables must provide both min and max bounds"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares", "method": "trf"},
                    "variables": [
                        {"kind": "thickness", "surface_index": 6},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "focal_length",
                                "target": 100.0,
                                "weight": 1.0,
                            }
                        ]
                    },
                },
            )

    def test_rejects_differential_evolution_variables_without_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Differential evolution variables must provide finite min and max bounds"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "differential_evolution"},
                    "variables": [
                        {"kind": "thickness", "surface_index": 6},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "focal_length",
                                "target": 100.0,
                                "weight": 1.0,
                            }
                        ]
                    },
                },
            )

    def test_rejects_differential_evolution_variables_with_non_finite_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Differential evolution variables must provide finite min and max bounds"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "differential_evolution"},
                    "variables": [
                        {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": float("inf")},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "focal_length",
                                "target": 100.0,
                                "weight": 1.0,
                            }
                        ]
                    },
                },
            )

    def test_rejects_lm_when_residual_count_is_smaller_than_variable_count(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Levenberg-Marquardt requires at least as many residuals as variables"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares", "method": "lm"},
                    "variables": [
                        {"kind": "radius", "surface_index": 1},
                        {"kind": "thickness", "surface_index": 6},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "focal_length",
                                "target": 100.0,
                                "weight": 1.0,
                            }
                        ]
                    },
                },
            )

    def test_lm_accepts_nominal_ray_fan_residual_count(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [
                    {"kind": "radius", "surface_index": 1},
                    {"kind": "thickness", "surface_index": 6},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "ray_fan",
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        assert report["optimizer"]["method"] == "lm"

    def test_lm_uses_ray_fan_num_rays_option_for_dimension_validation(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Levenberg-Marquardt requires at least as many residuals as variables"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares", "method": "lm"},
                    "variables": [
                        {"kind": "radius", "surface_index": 1},
                        {"kind": "thickness", "surface_index": 6},
                        {"kind": "radius", "surface_index": 2},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "ray_fan",
                                "weight": 1.0,
                                "fields": [{"index": 0, "weight": 1.0}],
                                "wavelengths": [{"index": 0, "weight": 1.0}],
                                "options": {"num_rays": 1},
                            }
                        ]
                    },
                },
            )

    def test_lm_dimension_validation_ignores_zero_weight_samples(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Levenberg-Marquardt requires at least as many residuals as variables"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares", "method": "lm"},
                    "variables": [
                        {"kind": "radius", "surface_index": 1},
                        {"kind": "thickness", "surface_index": 6},
                    ],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "rms_spot_size",
                                "target": 0.0,
                                "weight": 1.0,
                                "fields": [
                                    {"index": 0, "weight": 1.0},
                                    {"index": 1, "weight": 0.0},
                                ],
                                "wavelengths": [{"index": 0, "weight": 1.0}],
                            }
                        ]
                    },
                },
            )

    def test_returns_json_safe_report_with_merit_breakdown(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [
                    {"kind": "radius", "surface_index": 2, "source_surface_index": 1, "scale": -1.0, "offset": 0.0},
                ],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "rms_spot_size",
                            "target": 0.0,
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}, {"index": 1, "weight": 0.5}],
                            "wavelengths": [{"index": 0, "weight": 1.0}, {"index": 2, "weight": 0.25}],
                            "options": {"num_rays": 11},
                        },
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 0.2,
                        },
                    ]
                },
            },
        )

        assert report["success"] is True
        assert report["optimizer"]["kind"] == "least_squares"
        assert isinstance(report["initial_values"], list)
        assert isinstance(report["final_values"], list)
        assert isinstance(report["pickups"], list)
        assert isinstance(report["residuals"], list)
        assert report["merit_function"]["sum_of_squares"] >= 0.0
        assert report["merit_function"]["rss"] >= 0.0
        assert len(report["residuals"]) == 5
        json.dumps(report)

    def test_applies_pickups_before_evaluating(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
                ],
                "pickups": [
                    {"kind": "radius", "surface_index": 2, "source_surface_index": 1, "scale": -2.0, "offset": 1.5},
                ],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        source_value = report["final_values"][0]["value"]
        pickup_value = report["pickups"][0]["value"]
        assert pickup_value == pytest.approx(-2.0 * source_value + 1.5)
        assert fresh_cooke_triplet["seq_model"].ifcs[2].profile_cv == pytest.approx(1.0 / pickup_value)

    def test_field_and_wavelength_weights_scale_residuals_independently(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "rms_spot_size",
                            "target": 0.0,
                            "weight": 2.0,
                            "fields": [{"index": 0, "weight": 1.0}, {"index": 1, "weight": 9.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                            "options": {"num_rays": 9},
                        }
                    ]
                },
            },
        )

        assert len(report["residuals"]) == 2
        residual_by_field = {entry["field_index"]: entry for entry in report["residuals"]}
        assert residual_by_field[1]["total_weight"] == pytest.approx(6.0)
        assert residual_by_field[0]["total_weight"] == pytest.approx(2.0)

    def test_zero_weight_operand_field_and_wavelength_samples_are_not_evaluated_or_reported(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        calls = []

        def fake_get_opd_fan_data_for_wavelength(opm, fi, wvl_idx, image_point="chief_ray"):
            del opm
            calls.append((fi, wvl_idx, image_point))
            return {
                "fieldIdx": fi,
                "wvlIdx": wvl_idx,
                "Tangential": {"x": [-1.0, 1.0], "y": [1.0, 3.0]},
                "Sagittal": {"x": [-1.0, 1.0], "y": [5.0, 7.0]},
                "unitX": "",
                "unitY": "waves",
            }

        monkeypatch.setattr(
            optimization_module,
            "get_opd_fan_data_for_wavelength",
            fake_get_opd_fan_data_for_wavelength,
            raising=False,
        )

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "opd_difference",
                            "target": 0.0,
                            "weight": 0.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        },
                        {
                            "kind": "opd_difference",
                            "target": 0.0,
                            "weight": 1.0,
                            "fields": [
                                {"index": 0, "weight": 0.0},
                                {"index": 1, "weight": 1.0},
                            ],
                            "wavelengths": [
                                {"index": 0, "weight": 0.0},
                                {"index": 2, "weight": 1.0},
                            ],
                        },
                    ]
                },
            },
            image_point="centroid",
        )

        assert calls == [(1, 2, "centroid")]
        assert len(report["residuals"]) == 1
        assert report["residuals"][0] == {
            "kind": "opd_difference",
            "target": 0.0,
            "value": pytest.approx(2.0),
            "field_index": 1,
            "wavelength_index": 2,
            "operand_weight": 1.0,
            "field_weight": 1.0,
            "wavelength_weight": 1.0,
            "total_weight": 1.0,
            "weighted_residual": pytest.approx(2.0),
        }

    def test_evaluates_opd_operand_using_combined_tangential_and_sagittal_fans(self, fresh_cooke_triplet):
        from rayoptics_web_utils.analysis import get_opd_fan_data
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        field_index = 1
        wavelength_index = 1
        opd_data = get_opd_fan_data(fresh_cooke_triplet, fi=field_index)
        fan_entry = opd_data[wavelength_index]
        # Blocked pupil-edge rays appear as None; the operand ignores
        # non-finite samples.
        samples = [
            sample
            for sample in [*fan_entry["Tangential"]["y"], *fan_entry["Sagittal"]["y"]]
            if sample is not None and math.isfinite(sample)
        ]
        sample_mean = sum(samples) / len(samples)
        expected_value = sum(abs(sample - sample_mean) for sample in samples) / len(samples)

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "opd_difference",
                            "target": 0.0,
                            "weight": 1.0,
                            "fields": [{"index": field_index, "weight": 1.0}],
                            "wavelengths": [{"index": wavelength_index, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        assert report["residuals"] == [
            {
                "kind": "opd_difference",
                "target": 0.0,
                "value": pytest.approx(expected_value),
                "field_index": field_index,
                "wavelength_index": wavelength_index,
                "operand_weight": 1.0,
                "field_weight": 1.0,
                "wavelength_weight": 1.0,
                "total_weight": 1.0,
                "weighted_residual": pytest.approx(expected_value),
            }
        ]

    def test_opd_operand_returns_penalty_when_analysis_fans_have_no_valid_samples(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        def fake_get_opd_fan_data_for_wavelength(opm, fi, wvl_idx, image_point="chief_ray"):
            del opm, fi, wvl_idx
            assert image_point == "chief_ray"
            return {
                "fieldIdx": 0,
                "wvlIdx": 0,
                "Tangential": {"x": [0.0], "y": [float("nan")]},
                "Sagittal": {"x": [0.0], "y": [float("nan")]},
                "unitX": "",
                "unitY": "waves",
            }

        monkeypatch.setattr(
            optimization_module,
            "get_opd_fan_data_for_wavelength",
            fake_get_opd_fan_data_for_wavelength,
            raising=False,
        )

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "opd_difference",
                            "target": 0.0,
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        assert report["residuals"][0]["value"] == pytest.approx(1e6)
        assert report["residuals"][0]["weighted_residual"] == pytest.approx(1e6)

    def test_ray_fan_operand_expands_to_multiple_target_less_residuals(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        def fake_get_ray_fan_data(opm, fi, image_point="chief_ray"):
            del opm, fi, image_point
            return [
                {
                    "fieldIdx": 0,
                    "wvlIdx": 0,
                    "Tangential": {"x": [0.0, 0.1], "y": [1.5, float("nan")]},
                    "Sagittal": {"x": [0.0, 0.1], "y": [-2.0, 0.5]},
                    "unitX": "",
                    "unitY": "mm",
                }
            ]

        monkeypatch.setattr(operands_module, "get_ray_fan_data", fake_get_ray_fan_data)

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "ray_fan",
                            "weight": 2.0,
                            "fields": [{"index": 0, "weight": 4.0}],
                            "wavelengths": [{"index": 0, "weight": 9.0}],
                        }
                    ]
                },
            },
        )

        assert len(report["residuals"]) == 42
        assert report["residuals"][:4] == [
            {
                "kind": "ray_fan",
                "value": pytest.approx(1.5),
                "field_index": 0,
                "wavelength_index": 0,
                "operand_weight": 2.0,
                "field_weight": 4.0,
                "wavelength_weight": 9.0,
                "total_weight": pytest.approx(12.0),
                "weighted_residual": pytest.approx(18.0),
            },
            {
                "kind": "ray_fan",
                "value": pytest.approx(1e6),
                "field_index": 0,
                "wavelength_index": 0,
                "operand_weight": 2.0,
                "field_weight": 4.0,
                "wavelength_weight": 9.0,
                "total_weight": pytest.approx(12.0),
                "weighted_residual": pytest.approx(12e6),
            },
            {
                "kind": "ray_fan",
                "value": pytest.approx(-2.0),
                "field_index": 0,
                "wavelength_index": 0,
                "operand_weight": 2.0,
                "field_weight": 4.0,
                "wavelength_weight": 9.0,
                "total_weight": pytest.approx(12.0),
                "weighted_residual": pytest.approx(-24.0),
            },
            {
                "kind": "ray_fan",
                "value": pytest.approx(0.5),
                "field_index": 0,
                "wavelength_index": 0,
                "operand_weight": 2.0,
                "field_weight": 4.0,
                "wavelength_weight": 9.0,
                "total_weight": pytest.approx(12.0),
                "weighted_residual": pytest.approx(6.0),
            },
        ]
        assert all(entry["value"] == pytest.approx(1e6) for entry in report["residuals"][4:])
        assert report["merit_function"]["sum_of_squares"] == pytest.approx((18.0 ** 2) + (12e6 ** 2) + ((-24.0) ** 2) + (6.0 ** 2) + (38 * (12e6 ** 2)))

    def test_ray_fan_operand_returns_penalty_vector_when_no_valid_samples_remain(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        def fake_get_ray_fan_data(opm, fi, image_point="chief_ray"):
            del opm, fi, image_point
            return [
                {
                    "fieldIdx": 0,
                    "wvlIdx": 0,
                    "Tangential": {"x": [0.0], "y": [float("nan")]},
                    "Sagittal": {"x": [0.0], "y": [float("inf")]},
                    "unitX": "",
                    "unitY": "mm",
                }
            ]

        monkeypatch.setattr(operands_module, "get_ray_fan_data", fake_get_ray_fan_data)

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "ray_fan",
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        assert len(report["residuals"]) == 42
        assert all(entry["value"] == pytest.approx(1e6) for entry in report["residuals"])
        assert all(entry["weighted_residual"] == pytest.approx(1e6) for entry in report["residuals"])

    def test_ray_fan_residual_objective_keeps_a_stable_dimension(self, monkeypatch, fresh_cooke_triplet):
        import numpy as np
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        responses = iter([
            [
                {
                    "fieldIdx": 0,
                    "wvlIdx": 0,
                    "Tangential": {"x": [float(index) for index in range(21)], "y": [0.1] * 21},
                    "Sagittal": {"x": [float(index) for index in range(21)], "y": [0.2] * 21},
                    "unitX": "",
                    "unitY": "mm",
                }
            ],
            [
                {
                    "fieldIdx": 0,
                    "wvlIdx": 0,
                    "Tangential": {"x": [float(index) for index in range(19)], "y": [0.1] * 19},
                    "Sagittal": {"x": [float(index) for index in range(19)], "y": [0.2] * 19},
                    "unitX": "",
                    "unitY": "mm",
                }
            ],
        ])

        monkeypatch.setattr(operands_module, "get_ray_fan_data", lambda opm, fi, image_point="chief_ray": next(responses))

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "ray_fan",
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 0, "weight": 1.0}],
                        }
                    ]
                },
            },
        )

        first = problem.residual_objective(np.array([], dtype=float))
        second = problem.residual_objective(np.array([], dtype=float))

        assert first.shape == (42,)
        assert second.shape == (42,)
        assert second[-4:].tolist() == pytest.approx([1e6, 1e6, 1e6, 1e6])

    def test_restore_state_preserves_asphere_kind_information(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.targets import restore_state, snapshot_state

        variable = {
            "kind": "asphere_conic_constant",
            "surface_index": 1,
            "asphere_kind": "RadialPolynomial",
            "min": -2.0,
            "max": 0.0,
        }

        snapshot = snapshot_state(fresh_cooke_triplet, [variable], [])
        fresh_cooke_triplet["seq_model"].ifcs[1].profile.cc = -0.75

        restore_state(fresh_cooke_triplet, snapshot)

        assert fresh_cooke_triplet["seq_model"].ifcs[1].profile.__class__.__name__ == "RadialPolynomial"
        assert fresh_cooke_triplet["seq_model"].ifcs[1].profile.cc == pytest.approx(0.0)


class TestOptimizeOpm:
    def test_progress_retains_latest_recorded_vector(self):
        from rayoptics_web_utils.optimization.progress import OptimizationProgress

        progress = OptimizationProgress()
        vector = np.array([1.0, 2.0], dtype=float)
        progress.record(
            vector,
            {
                "optimizer": {"kind": "least_squares"},
                "initial_values": [],
                "final_values": [],
                "pickups": [],
                "residuals": [],
                "merit_function": {"sum_of_squares": 4.0, "rss": 2.0},
                "optimization_progress": [],
            },
        )
        vector[0] = 99.0

        assert progress.latest_vector is not None
        assert progress.latest_vector.tolist() == pytest.approx([1.0, 2.0])

    def test_progress_retains_best_recorded_vector(self):
        from rayoptics_web_utils.optimization.progress import OptimizationProgress

        def evaluation(sum_of_squares):
            return {"merit_function": {"sum_of_squares": sum_of_squares, "rss": math.sqrt(sum_of_squares)}}

        progress = OptimizationProgress()
        assert progress.best_vector is None

        first = np.array([1.0], dtype=float)
        progress.record(first, evaluation(4.0))
        progress.record(np.array([2.0], dtype=float), evaluation(9.0))
        progress.record(np.array([3.0], dtype=float), evaluation(4.0))
        first[0] = 99.0

        assert progress.latest_vector.tolist() == pytest.approx([3.0])
        assert progress.best_vector.tolist() == pytest.approx([1.0])

        progress.record(np.array([5.0], dtype=float), evaluation(1.0))
        best = progress.best_vector
        best[0] = -1.0

        assert progress.best_vector.tolist() == pytest.approx([5.0])

    def test_returns_stopped_report_with_best_progress_when_interrupted(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        config = {
            "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
            "variables": [
                {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
            ],
            "pickups": [],
            "merit_function": {"operands": [{"kind": "focal_length", "target": 90.0, "weight": 1.0}]},
        }

        class FakeSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                for value, sum_of_squares in ((42.0, 1.0), (48.0, 5.0)):
                    self.problem.progress.record(
                        np.array([value], dtype=float),
                        {"merit_function": {"sum_of_squares": sum_of_squares, "rss": math.sqrt(sum_of_squares)}},
                        progress_reporter,
                    )
                raise KeyboardInterrupt

        monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "least_squares", FakeSolver)

        report = optimize_opm(fresh_cooke_triplet, config)

        assert report["status"] == "stopped"
        assert report["final_values"][0]["value"] == pytest.approx(42.0)
        assert len(report["optimization_progress"]) == 2

    def test_returns_stopped_report_with_latest_progress_when_interrupted(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        config = {
            "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
            "variables": [
                {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
            ],
            "pickups": [],
            "merit_function": {
                "operands": [
                    {
                        "kind": "focal_length",
                        "target": 90.0,
                        "weight": 1.0,
                    }
                ]
            },
        }

        class FakeSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                evaluation = self.problem.evaluate(np.array([42.0], dtype=float))
                self.problem.progress.record(np.array([42.0], dtype=float), evaluation, progress_reporter)
                raise KeyboardInterrupt

        monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "least_squares", FakeSolver)

        progress_snapshots = []
        report = optimize_opm(fresh_cooke_triplet, config, progress_reporter=progress_snapshots.append)

        assert report["success"] is True
        assert report["status"] == "stopped"
        assert report["message"] == "Optimization stopped by user"
        assert report["final_values"][0]["value"] == pytest.approx(42.0)
        assert report["optimization_progress"] == progress_snapshots[-1]
        assert report["optimizer"]["nfev"] == 1

    def test_interrupt_scope_wraps_only_the_solver(self, monkeypatch, fresh_cooke_triplet):
        import contextlib

        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        events = []
        original_evaluate = optimization_module._OptimizationProblem.evaluate

        def recording_evaluate(self, *args, **kwargs):
            events.append("evaluate")
            return original_evaluate(self, *args, **kwargs)

        monkeypatch.setattr(optimization_module._OptimizationProblem, "evaluate", recording_evaluate)

        class FakeSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                del progress_reporter
                events.append("solve")
                return {
                    "x": self.problem.current_vector(),
                    "success": True,
                    "status": 1,
                    "message": "accepted",
                    "nfev": 1,
                }

        monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "least_squares", FakeSolver)

        @contextlib.contextmanager
        def recording_scope():
            events.append("enter")
            try:
                yield
            finally:
                events.append("exit")

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "focal_length", "target": 90.0, "weight": 1.0}]
                },
            },
            interrupt_scope=recording_scope,
        )

        assert report["status"] == 1
        assert events[-4:] == ["enter", "solve", "exit", "evaluate"]
        assert "enter" not in events[:-4]

    def test_stop_pending_when_interrupt_scope_arms_returns_initial_stopped_report(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        import contextlib

        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        class UnreachableSolver:
            def __init__(self, problem):
                del problem

            def solve(self, progress_reporter=None):
                raise AssertionError("solver must not run after a pending stop")

        monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "least_squares", UnreachableSolver)

        @contextlib.contextmanager
        def pending_stop_scope():
            raise KeyboardInterrupt
            yield

        original_thickness = fresh_cooke_triplet["seq_model"].gaps[6].thi
        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "focal_length", "target": 90.0, "weight": 1.0}]
                },
            },
            interrupt_scope=pending_stop_scope,
        )

        assert report["success"] is True
        assert report["status"] == "stopped"
        assert report["message"] == "Optimization stopped by user"
        assert report["optimization_progress"] == []
        assert report["optimizer"]["nfev"] == 0
        assert report["final_values"] == report["initial_values"]
        assert report["final_values"][0]["value"] == pytest.approx(original_thickness)
        json.dumps(report, allow_nan=False)

    def test_setup_error_returns_complete_empty_json_safe_report(
        self,
        fresh_cooke_triplet,
    ):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "least_squares",
                    "method": "unsupported",
                },
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["success"] is False
        assert report["status"] == "error"
        assert report["message"] == "Unknown least-squares method: unsupported"
        assert report["initial_values"] == report["final_values"] == []
        assert report["pickups"] == []
        assert report["residuals"] == []
        assert report["optimization_progress"] == []
        assert report["optimizer"] == {
            "kind": "least_squares",
            "nfev": 0,
            "njev": 0,
            "cost": pytest.approx(5e11),
            "optimality": 0.0,
        }
        assert report["merit_function"] == {
            "sum_of_squares": pytest.approx(1e12),
            "rss": pytest.approx(1e6),
        }
        json.dumps(report, allow_nan=False)

    def test_runtime_error_restores_state_without_retrying_failed_merit_evaluation(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        original_thickness = fresh_cooke_triplet["seq_model"].gaps[6].thi
        original_pickup_thickness = fresh_cooke_triplet["seq_model"].gaps[5].thi
        evaluation_calls = 0

        class FakeSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                vector = np.array([42.0], dtype=float)
                self.problem.apply_vector(vector)
                evaluation = {
                    "optimizer": {"kind": "least_squares", "method": "trf"},
                    "initial_values": self.problem.variable_state(),
                    "final_values": self.problem.variable_state(),
                    "pickups": [],
                    "residuals": [],
                    "merit_function": {
                        "sum_of_squares": 25.0,
                        "rss": 5.0,
                    },
                    "optimization_progress": [],
                }
                self.problem.progress.record(
                    vector,
                    evaluation,
                    progress_reporter,
                )
                return {
                    "x": vector,
                    "success": True,
                    "status": 1,
                    "message": "solver completed",
                    "nfev": 7,
                    "njev": 3,
                }

        def fail_final_evaluation(self, values=None):
            nonlocal evaluation_calls
            del self, values
            evaluation_calls += 1
            raise RuntimeError("final merit failed")

        monkeypatch.setitem(
            optimization_module._SOLVER_REGISTRY,
            "least_squares",
            FakeSolver,
        )
        monkeypatch.setattr(
            optimization_module._OptimizationProblem,
            "evaluate",
            fail_final_evaluation,
        )

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "least_squares",
                    "method": "trf",
                    "max_nfev": 10,
                },
                "variables": [
                    {
                        "kind": "thickness",
                        "surface_index": 6,
                        "min": 35.0,
                        "max": 50.0,
                    }
                ],
                "pickups": [
                    {
                        "kind": "thickness",
                        "surface_index": 5,
                        "source_surface_index": 6,
                        "scale": 1.0,
                        "offset": 0.0,
                    }
                ],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        },
                        {
                            "kind": "f_number",
                            "target": 4.0,
                            "weight": 1.0,
                        },
                    ]
                },
            },
        )

        assert evaluation_calls == 1
        assert fresh_cooke_triplet["seq_model"].gaps[6].thi == pytest.approx(
            original_thickness
        )
        assert fresh_cooke_triplet["seq_model"].gaps[5].thi == pytest.approx(
            original_pickup_thickness
        )
        assert report["success"] is False
        assert report["status"] == "error"
        assert report["message"] == "final merit failed"
        assert report["initial_values"] == report["final_values"]
        assert report["final_values"][0]["value"] == pytest.approx(
            original_thickness
        )
        assert report["pickups"][0]["value"] == pytest.approx(
            original_pickup_thickness
        )
        assert report["residuals"] == []
        assert len(report["optimization_progress"]) == 1
        assert report["optimizer"]["nfev"] == 7
        assert report["optimizer"]["njev"] == 3
        assert report["optimizer"]["cost"] == pytest.approx(1e12)
        assert report["optimizer"]["optimality"] == 0.0
        assert report["merit_function"] == {
            "sum_of_squares": pytest.approx(2e12),
            "rss": pytest.approx(math.sqrt(2) * 1e6),
        }
        json.dumps(report, allow_nan=False)

    def test_differential_evolution_runtime_error_uses_scalar_penalty(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        original_thickness = fresh_cooke_triplet["seq_model"].gaps[6].thi

        class FailingSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                del progress_reporter
                self.problem.apply_vector(np.array([42.0], dtype=float))
                raise RuntimeError("differential evolution failed")

        monkeypatch.setitem(
            optimization_module._SOLVER_REGISTRY,
            "differential_evolution",
            FailingSolver,
        )

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "differential_evolution",
                    "max_nfev": 10,
                },
                "variables": [
                    {
                        "kind": "thickness",
                        "surface_index": 6,
                        "min": 35.0,
                        "max": 50.0,
                    }
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert fresh_cooke_triplet["seq_model"].gaps[6].thi == pytest.approx(
            original_thickness
        )
        assert report["success"] is False
        assert report["status"] == "error"
        assert report["optimizer"] == {
            "kind": "differential_evolution",
            "nfev": 0,
            "nit": 0,
        }
        assert report["merit_function"] == {
            "sum_of_squares": pytest.approx(1e6),
            "rss": pytest.approx(1e3),
        }

    def test_reports_differential_evolution_metadata_without_method(self, monkeypatch, fresh_cooke_triplet):
        import numpy as np
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.optimization import optimize_opm

        config = {
            "optimizer": {"kind": "differential_evolution", "max_nfev": 15},
            "variables": [
                {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
            ],
            "pickups": [],
            "merit_function": {
                "operands": [
                    {
                        "kind": "focal_length",
                        "target": 90.0,
                        "weight": 1.0,
                    }
                ]
            },
        }

        class FakeSolver:
            def __init__(self, problem):
                self.problem = problem

            def solve(self, progress_reporter=None):
                del progress_reporter
                return {
                    "x": np.array([42.0]),
                    "success": True,
                    "status": 5,
                    "message": "de ok",
                    "nfev": 6,
                    "nit": 4,
                }

        monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "differential_evolution", FakeSolver)

        report = optimize_opm(fresh_cooke_triplet, config)

        assert report["optimizer"]["kind"] == "differential_evolution"
        assert "method" not in report["optimizer"]
        assert "max_nfev" in config["optimizer"]
        assert "maxiter" not in report["optimizer"]
        assert report["optimizer"]["nfev"] == 6
        assert report["optimizer"]["nit"] == 4
        assert "njev" not in report["optimizer"]
        assert "cost" not in report["optimizer"]
        assert "optimality" not in report["optimizer"]

    def test_optimizes_image_distance_to_reduce_rms_spot(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_opm

        fresh_cooke_triplet["seq_model"].gaps[-1].thi += 2.0
        fresh_cooke_triplet.update_model()

        config = {
            "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 40},
            "variables": [
                {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
            ],
            "pickups": [],
            "merit_function": {
                "operands": [
                    {
                        "kind": "rms_spot_size",
                        "target": 0.0,
                        "weight": 1.0,
                        "fields": [{"index": 0, "weight": 1.0}],
                        "wavelengths": [{"index": 1, "weight": 1.0}],
                        "options": {"num_rays": 15},
                    }
                ]
            },
        }

        before = evaluate_optimization_problem(fresh_cooke_triplet, config)
        result = optimize_opm(fresh_cooke_triplet, config)

    def test_evaluates_asphere_conic_and_polynomial_targets(self, fresh_cooke_triplet):
        from rayoptics.elem.profiles import RadialPolynomial
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        fresh_cooke_triplet["seq_model"].ifcs[1].profile = RadialPolynomial(r=23.713, cc=-1.2, coefs=[0.001, 0.002])
        fresh_cooke_triplet.update_model()

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [
                    {
                        "kind": "asphere_conic_constant",
                        "surface_index": 1,
                        "asphere_kind": "RadialPolynomial",
                        "min": -2.0,
                        "max": 0.0,
                    },
                    {
                        "kind": "asphere_polynomial_coefficient",
                        "surface_index": 1,
                        "asphere_kind": "RadialPolynomial",
                        "coefficient_index": 1,
                        "min": -0.01,
                        "max": 0.01,
                    },
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["initial_values"] == [
            {
                "kind": "asphere_conic_constant",
                "surface_index": 1,
                "asphere_kind": "RadialPolynomial",
                "value": pytest.approx(-1.2),
                "min": -2.0,
                "max": 0.0,
            },
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 1,
                "asphere_kind": "RadialPolynomial",
                "coefficient_index": 1,
                "value": pytest.approx(0.002),
                "min": -0.01,
                "max": 0.01,
            },
        ]

    def test_can_aspherize_a_spherical_surface_into_xtoroid(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [
                    {
                        "kind": "asphere_conic_constant",
                        "surface_index": 1,
                        "asphere_kind": "XToroid",
                        "min": -2.0,
                        "max": 0.0,
                    },
                    {
                        "kind": "asphere_toric_sweep_radius",
                        "surface_index": 1,
                        "asphere_kind": "XToroid",
                        "min": 20.0,
                        "max": 30.0,
                    },
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["initial_values"][0]["kind"] == "asphere_conic_constant"
        assert report["initial_values"][0]["asphere_kind"] == "XToroid"
        assert report["initial_values"][1]["kind"] == "asphere_toric_sweep_radius"
        assert fresh_cooke_triplet["seq_model"].ifcs[1].profile.__class__.__name__ == "XToroid"

    def test_supports_asphere_pickups_for_polynomial_terms(self, fresh_cooke_triplet):
        from rayoptics.elem.profiles import RadialPolynomial
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        fresh_cooke_triplet["seq_model"].ifcs[1].profile = RadialPolynomial(r=23.713, cc=-1.2, coefs=[0.001, 0.002, 0.003])
        fresh_cooke_triplet.update_model()

        report = evaluate_optimization_problem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares"},
                "variables": [
                    {
                        "kind": "asphere_polynomial_coefficient",
                        "surface_index": 1,
                        "asphere_kind": "RadialPolynomial",
                        "coefficient_index": 1,
                        "min": -0.01,
                        "max": 0.01,
                    },
                ],
                "pickups": [
                    {
                        "kind": "asphere_polynomial_coefficient",
                        "surface_index": 1,
                        "asphere_kind": "RadialPolynomial",
                        "coefficient_index": 2,
                        "source_surface_index": 1,
                        "source_coefficient_index": 1,
                        "scale": 2.0,
                        "offset": 0.5,
                    },
                ],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 100.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        assert report["pickups"] == [
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 1,
                "asphere_kind": "RadialPolynomial",
                "coefficient_index": 2,
                "source_surface_index": 1,
                "source_coefficient_index": 1,
                "scale": 2.0,
                "offset": 0.5,
                "value": pytest.approx(2.0 * report["final_values"][0]["value"] + 0.5),
            }
        ]

    def test_keeps_pickups_consistent_after_optimization(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        result = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 22.0, "max": 26.0},
                ],
                "pickups": [
                    {"kind": "radius", "surface_index": 2, "source_surface_index": 1, "scale": -1.0, "offset": 0.0},
                ],
                "merit_function": {
                    "operands": [
                        {"kind": "focal_length", "target": 95.0, "weight": 1.0},
                    ]
                },
            },
        )

        source_value = result["final_values"][0]["value"]
        pickup_value = result["pickups"][0]["value"]
        assert pickup_value == pytest.approx(-source_value)
        assert fresh_cooke_triplet["seq_model"].ifcs[2].profile_cv == pytest.approx(1.0 / pickup_value)

    def test_problem_objective_returns_penalty_when_evaluation_fails(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module

        problem = optimization_module._OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        def fail_evaluate(values=None):
            del values
            raise RuntimeError("boom")

        monkeypatch.setattr(problem, "evaluate", fail_evaluate)

        residuals = problem.objective(problem.current_vector())

        assert residuals.tolist() == pytest.approx([1e6])

    def test_problem_optimize_invokes_least_squares_with_class_objective(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module

        captured = {}
        problem = optimization_module._OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )
        expected_residual = 12.5

        def fake_objective(values=None):
            del values
            return {"residuals": [{"weighted_residual": expected_residual}]}

        def fake_least_squares(func, x0, bounds, method, ftol, xtol, gtol, max_nfev, jac):
            captured["func"] = func
            captured["jac"] = jac
            captured["x0"] = x0
            captured["bounds"] = bounds
            captured["method"] = method
            captured["ftol"] = ftol
            captured["xtol"] = xtol
            captured["gtol"] = gtol
            captured["max_nfev"] = max_nfev

            class _Result:
                x = x0
                success = True
                status = 1
                message = "ok"
                nfev = 1
                njev = 1
                cost = 0.0
                optimality = 0.0

            return _Result()

        monkeypatch.setattr(problem, "evaluate", fake_objective)
        monkeypatch.setattr(optimization_module, "least_squares", fake_least_squares)

        result = problem.optimize()

        assert result.success is True
        assert captured["func"] == problem.objective
        assert captured["method"] == "trf"
        assert captured["max_nfev"] == 30
        assert captured["func"](captured["x0"]).tolist() == pytest.approx([expected_residual])

    def test_problem_objective_records_progress_for_distinct_vectors_only(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module

        problem = optimization_module._OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        evaluations = [
            {
                "residuals": [{"weighted_residual": 2.0}],
                "merit_function": {"sum_of_squares": 4.0, "rss": 2.0},
            },
            {
                "residuals": [{"weighted_residual": 3.0}],
                "merit_function": {"sum_of_squares": 9.0, "rss": 3.0},
            },
            {
                "residuals": [{"weighted_residual": 5.0}],
                "merit_function": {"sum_of_squares": 25.0, "rss": 5.0},
            },
        ]

        def fake_evaluate(values=None):
            del values
            return evaluations.pop(0)

        monkeypatch.setattr(problem, "evaluate", fake_evaluate)

        first_vector = problem.current_vector()
        second_vector = first_vector + 1.0

        assert problem.objective(first_vector).tolist() == pytest.approx([2.0])
        assert problem.objective(first_vector).tolist() == pytest.approx([3.0])
        assert problem.objective(second_vector).tolist() == pytest.approx([5.0])

        assert problem.optimization_progress == [
            {
                "iteration": 0,
                "merit_function_value": 4.0,
                "log10_merit_function_value": pytest.approx(0.6020599913279624),
            },
            {
                "iteration": 1,
                "merit_function_value": 25.0,
                "log10_merit_function_value": pytest.approx(1.3979400086720377),
            },
        ]

    def test_problem_optimize_reports_progress_snapshots(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.optimization as optimization_module

        reported_progress = []
        problem = optimization_module._OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 30},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "focal_length",
                            "target": 90.0,
                            "weight": 1.0,
                        }
                    ]
                },
            },
        )

        def fake_least_squares(func, x0, bounds, method, ftol, xtol, gtol, max_nfev, jac):
            del bounds, method, ftol, xtol, gtol, max_nfev
            func(x0)
            func(x0 + 1.0)

            class _Result:
                x = x0 + 1.0
                success = True
                status = 1
                message = "ok"
                nfev = 2
                njev = 1
                cost = 0.0
                optimality = 0.0

            return _Result()

        evaluations = [
            {
                "residuals": [{"weighted_residual": 4.0}],
                "merit_function": {"sum_of_squares": 16.0, "rss": 4.0},
            },
            {
                "residuals": [{"weighted_residual": 2.0}],
                "merit_function": {"sum_of_squares": 4.0, "rss": 2.0},
            },
        ]

        def fake_evaluate(values=None):
            del values
            return evaluations.pop(0)

        monkeypatch.setattr(optimization_module, "least_squares", fake_least_squares)
        monkeypatch.setattr(problem, "evaluate", fake_evaluate)

        problem.optimize(reported_progress.append)

        assert reported_progress == [
            [
                {
                    "iteration": 0,
                    "merit_function_value": 16.0,
                    "log10_merit_function_value": pytest.approx(1.2041199826559248),
                }
            ],
            [
                {
                    "iteration": 0,
                    "merit_function_value": 16.0,
                    "log10_merit_function_value": pytest.approx(1.2041199826559248),
                },
                {
                    "iteration": 1,
                    "merit_function_value": 4.0,
                    "log10_merit_function_value": pytest.approx(0.6020599913279624),
                },
            ],
        ]

    def test_optimize_opm_returns_progress_history(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        result = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 5},
                "variables": [
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "rms_spot_size",
                            "target": 0.0,
                            "weight": 1.0,
                            "fields": [{"index": 0, "weight": 1.0}],
                            "wavelengths": [{"index": 1, "weight": 1.0}],
                            "options": {"num_rays": 9},
                        }
                    ]
                },
            },
        )

        assert len(result["optimization_progress"]) >= 1
        assert result["optimization_progress"][0]["iteration"] == 0
        assert result["optimization_progress"][0]["merit_function_value"] >= 0.0
        assert "log10_merit_function_value" in result["optimization_progress"][0]

    def test_optimizes_sasian_triplet_image_surface_radius_for_opd_difference(
        self,
        monkeypatch,
        sasian_triplet_autoaperture,
    ):
        import rayoptics_web_utils.optimization.optimization as optimization_module
        from rayoptics_web_utils.analysis import get_opd_fan_data_for_wavelength
        from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_opm

        requested_samples = []

        def recording_get_opd_fan_data_for_wavelength(opm, fi, wvl_idx, image_point="chief_ray"):
            requested_samples.append((fi, wvl_idx))
            return get_opd_fan_data_for_wavelength(opm, fi, wvl_idx, image_point=image_point)

        monkeypatch.setattr(
            optimization_module,
            "get_opd_fan_data_for_wavelength",
            recording_get_opd_fan_data_for_wavelength,
            raising=False,
        )

        image_surface_index = len(sasian_triplet_autoaperture["seq_model"].ifcs) - 1
        config = {
            "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 40},
            "variables": [
                {"kind": "radius", "surface_index": image_surface_index, "min": -500.0, "max": 500.0},
            ],
            "pickups": [],
            "merit_function": {
                "operands": [
                    {
                        "kind": "opd_difference",
                        "target": 0.0,
                        "weight": 100.0,
                        "fields": [
                            {"index": 0, "weight": 0.0},
                            {"index": 1, "weight": 0.0},
                            {"index": 2, "weight": 1.0},
                        ],
                        "wavelengths": [
                            {"index": 0, "weight": 0.0},
                            {"index": 1, "weight": 1.0},
                            {"index": 2, "weight": 0.0},
                        ],
                    }
                ]
            },
        }

        before = evaluate_optimization_problem(sasian_triplet_autoaperture, config)
        result = optimize_opm(sasian_triplet_autoaperture, config)

        assert result["success"] is True
        assert result["final_values"][0]["surface_index"] == image_surface_index
        assert result["final_values"][0]["value"] != pytest.approx(before["final_values"][0]["value"])
        assert result["merit_function"]["sum_of_squares"] < before["merit_function"]["sum_of_squares"]
        assert requested_samples
        assert set(requested_samples) == {(2, 1)}


class TestOptimizationValidation:
    def test_rejects_unknown_operand_kind(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Unknown operand kind"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares"},
                    "variables": [],
                    "pickups": [],
                    "merit_function": {"operands": [{"kind": "unknown_metric", "target": 0.0, "weight": 1.0}]},
                },
            )

    def test_rejects_all_zero_effective_merit_samples(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(
            ValueError,
            match="merit_function.operands must include at least one non-zero weighted sample",
        ):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares"},
                    "variables": [],
                    "pickups": [],
                    "merit_function": {
                        "operands": [
                            {
                                "kind": "opd_difference",
                                "target": 0.0,
                                "weight": 1.0,
                                "fields": [{"index": 0, "weight": 0.0}],
                                "wavelengths": [{"index": 0, "weight": 1.0}],
                            }
                        ]
                    },
                },
            )

    @pytest.mark.parametrize(
        ("fields", "wavelengths", "error"),
        [
            ([{"index": 99, "weight": 0.0}], [{"index": 0, "weight": 0.0}], "field index 99"),
            ([{"index": 0, "weight": 0.0}], [{"index": 99, "weight": 0.0}], "wavelength index 99"),
        ],
    )
    def test_validates_indices_before_filtering_zero_weight_samples(
        self,
        fresh_cooke_triplet,
        fields,
        wavelengths,
        error,
    ):
        from rayoptics_web_utils.optimization.config import normalize_operand_samples

        with pytest.raises(IndexError, match=error):
            normalize_operand_samples(
                fresh_cooke_triplet,
                {
                    "kind": "opd_difference",
                    "target": 0.0,
                    "weight": 0.0,
                    "fields": fields,
                    "wavelengths": wavelengths,
                },
            )

    def test_filters_zero_weight_samples_without_reordering_retained_samples(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.config import normalize_operand_samples

        samples = normalize_operand_samples(
            fresh_cooke_triplet,
            {
                "kind": "opd_difference",
                "target": 0.0,
                "weight": 2.0,
                "fields": [
                    {"index": 2, "weight": 4.0},
                    {"index": 0, "weight": 0.0},
                    {"index": 1, "weight": 9.0},
                ],
                "wavelengths": [
                    {"index": 2, "weight": 16.0},
                    {"index": 1, "weight": 0.0},
                    {"index": 0, "weight": 25.0},
                ],
            },
        )

        assert [
            (sample["field_index"], sample["wavelength_index"])
            for sample in samples
        ] == [(2, 2), (2, 0), (1, 2), (1, 0)]

    def test_rejects_variable_and_pickup_collision(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="cannot be both variable and pickup target"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares"},
                    "variables": [{"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0}],
                    "pickups": [{"kind": "radius", "surface_index": 1, "source_surface_index": 2, "scale": 1.0, "offset": 0.0}],
                    "merit_function": {"operands": [{"kind": "focal_length", "target": 100.0, "weight": 1.0}]},
                },
            )

    def test_rejects_pickup_cycles(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(ValueError, match="Pickup cycle detected"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares"},
                    "variables": [],
                    "pickups": [
                        {"kind": "radius", "surface_index": 1, "source_surface_index": 2, "scale": 1.0, "offset": 0.0},
                        {"kind": "radius", "surface_index": 2, "source_surface_index": 1, "scale": 1.0, "offset": 0.0},
                    ],
                    "merit_function": {"operands": [{"kind": "focal_length", "target": 100.0, "weight": 1.0}]},
                },
            )

    def test_rejects_invalid_surface_index(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        with pytest.raises(IndexError, match="surface_index"):
            evaluate_optimization_problem(
                fresh_cooke_triplet,
                {
                    "optimizer": {"kind": "least_squares"},
                    "variables": [{"kind": "thickness", "surface_index": 999, "min": 0.0, "max": 1.0}],
                    "pickups": [],
                    "merit_function": {"operands": [{"kind": "focal_length", "target": 100.0, "weight": 1.0}]},
                },
            )

    def test_normalizes_least_squares_defaults_and_explicit_options(self):
        from rayoptics_web_utils.optimization.config import normalize_optimizer_config

        defaults = normalize_optimizer_config({})
        explicit = normalize_optimizer_config(
            {
                "optimizer": {
                    "kind": "least_squares",
                    "method": "lm",
                    "ftol": 1e-7,
                    "xtol": 2e-7,
                    "gtol": 3e-7,
                    "max_nfev": 17,
                }
            }
        )

        assert defaults == {"kind": "least_squares", "method": "trf"}
        assert explicit == {
            "kind": "least_squares",
            "method": "lm",
            "ftol": 1e-7,
            "xtol": 2e-7,
            "gtol": 3e-7,
            "max_nfev": 17,
        }

    def test_normalizes_differential_evolution_without_inventing_a_method(self):
        from rayoptics_web_utils.optimization.config import normalize_optimizer_config

        normalized = normalize_optimizer_config(
            {
                "optimizer": {
                    "kind": "differential_evolution",
                    "strategy": "rand1bin",
                    "max_nfev": 40,
                    "popsize": 4,
                    "tol": 1e-4,
                    "mutation": 0.8,
                    "recombination": 0.6,
                    "rng": 9,
                    "polish": True,
                    "init": "random",
                    "atol": 1e-8,
                }
            }
        )

        assert normalized["kind"] == "differential_evolution"
        assert normalized["strategy"] == "rand1bin"
        assert normalized["max_nfev"] == 40
        assert "method" not in normalized

    @pytest.mark.parametrize(
        ("optimizer", "error"),
        [
            ({"kind": "unknown"}, "Unknown optimizer kind: unknown"),
            ({"kind": "least_squares", "method": "dogbox"}, "Unknown least-squares method: dogbox"),
            ({"kind": "least_squares", "bad": 1}, "Unsupported optimizer option"),
            ({"kind": "differential_evolution", "method": "trf"}, "Unsupported optimizer option"),
        ],
    )
    def test_rejects_unknown_optimizer_kinds_methods_and_options(self, optimizer, error):
        from rayoptics_web_utils.optimization.config import normalize_optimizer_config

        with pytest.raises(ValueError, match=error):
            normalize_optimizer_config({"optimizer": optimizer})

    @pytest.mark.parametrize(
        ("optimizer", "entry", "expected"),
        [
            (
                {"kind": "least_squares", "method": "trf"},
                {"kind": "radius", "surface_index": 1, "min": -20, "max": 30},
                {"kind": "radius", "surface_index": 1, "min": -20.0, "max": 30.0},
            ),
            (
                {"kind": "least_squares", "method": "lm"},
                {"kind": "thickness", "surface_index": 1},
                {"kind": "thickness", "surface_index": 1},
            ),
            (
                {"kind": "differential_evolution"},
                {"kind": "thickness", "surface_index": 1, "min": 1, "max": 8},
                {"kind": "thickness", "surface_index": 1, "min": 1.0, "max": 8.0},
            ),
        ],
    )
    def test_normalizes_variable_kinds_bounds_and_numeric_values(
        self,
        fresh_cooke_triplet,
        optimizer,
        entry,
        expected,
    ):
        from rayoptics_web_utils.optimization.config import (
            normalize_optimizer_config,
            normalize_variables,
        )

        normalized = normalize_variables(
            fresh_cooke_triplet,
            [entry],
            normalize_optimizer_config({"optimizer": optimizer}),
        )

        assert normalized == [expected]

    @pytest.mark.parametrize(
        ("optimizer", "entry", "error"),
        [
            (
                {"kind": "least_squares", "method": "trf"},
                {"kind": "radius", "surface_index": 1, "min": 1},
                "both min and max",
            ),
            (
                {"kind": "least_squares", "method": "lm"},
                {"kind": "radius", "surface_index": 1, "min": 1},
                "omit both min and max",
            ),
            (
                {"kind": "differential_evolution"},
                {"kind": "radius", "surface_index": 1, "min": 1, "max": float("inf")},
                "finite min and max",
            ),
            (
                {"kind": "least_squares", "method": "lm"},
                {"kind": "not-a-variable", "surface_index": 1},
                "Unknown variable kind",
            ),
        ],
    )
    def test_rejects_invalid_variable_bound_contracts(
        self,
        fresh_cooke_triplet,
        optimizer,
        entry,
        error,
    ):
        from rayoptics_web_utils.optimization.config import (
            normalize_optimizer_config,
            normalize_variables,
        )

        with pytest.raises(ValueError, match=error):
            normalize_variables(
                fresh_cooke_triplet,
                [entry],
                normalize_optimizer_config({"optimizer": optimizer}),
            )

    def test_normalizes_pickup_defaults_and_dependency_order(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.config import (
            normalize_pickups,
            pickup_order,
        )

        pickups = normalize_pickups(
            fresh_cooke_triplet,
            [
                {"kind": "radius", "surface_index": 3, "source_surface_index": 2},
                {
                    "kind": "radius",
                    "surface_index": 2,
                    "source_surface_index": 1,
                    "scale": -2,
                    "offset": 1.5,
                },
            ],
            set(),
        )

        assert pickups[0]["scale"] == 1.0
        assert pickups[0]["offset"] == 0.0
        assert pickups[1]["scale"] == -2.0
        assert pickups[1]["offset"] == 1.5
        assert [pickup["surface_index"] for pickup in pickup_order(pickups)] == [2, 3]

    @pytest.mark.parametrize(
        ("pickups", "error"),
        [
            (
                [
                    {"kind": "radius", "surface_index": 1, "source_surface_index": 2},
                    {"kind": "radius", "surface_index": 1, "source_surface_index": 3},
                ],
                "Duplicate pickup target",
            ),
            (
                [{"kind": "not-a-pickup", "surface_index": 1, "source_surface_index": 2}],
                "Unknown pickup kind",
            ),
            (
                [{"kind": "radius", "surface_index": 1, "source_surface_index": 999}],
                "source_surface_index",
            ),
        ],
    )
    def test_rejects_invalid_pickup_kind_target_and_source(self, fresh_cooke_triplet, pickups, error):
        from rayoptics_web_utils.optimization.config import normalize_pickups

        with pytest.raises((ValueError, IndexError), match=error):
            normalize_pickups(fresh_cooke_triplet, pickups, set())

    @pytest.mark.parametrize(
        ("operand", "expected_pairs"),
        [
            (
                {
                    "kind": "opd_difference",
                    "target": 2,
                    "weight": 3,
                    "fields": [{"index": 2, "weight": 4}, {"index": 0, "weight": 0}],
                    "wavelengths": [{"index": 1, "weight": 5}, {"index": 0, "weight": 0}],
                },
                [(2, 1)],
            ),
            (
                {"kind": "focal_length", "target": 100, "weight": 2},
                [(None, None)],
            ),
            (
                {"kind": "ray_fan", "weight": 1, "options": {"num_rays": 5}},
                [
                    (0, 0),
                    (0, 1),
                    (0, 2),
                    (1, 0),
                    (1, 1),
                    (1, 2),
                    (2, 0),
                    (2, 1),
                    (2, 2),
                ],
            ),
        ],
    )
    def test_normalizes_scalar_special_and_field_wavelength_operand_samples(
        self,
        fresh_cooke_triplet,
        operand,
        expected_pairs,
    ):
        from rayoptics_web_utils.optimization.config import normalize_operand_samples

        samples = normalize_operand_samples(fresh_cooke_triplet, operand)

        assert [
            (sample["field_index"], sample["wavelength_index"])
            for sample in samples
        ] == expected_pairs
        if operand["kind"] == "opd_difference":
            assert samples[0]["target"] == 2.0
            assert samples[0]["weight"] == 3.0
            assert samples[0]["field_weight"] == 4.0
            assert samples[0]["wavelength_weight"] == 5.0

    @pytest.mark.parametrize("kind", ["focal_length", "f_number"])
    def test_zero_weight_scalar_operand_is_removed(self, fresh_cooke_triplet, kind):
        from rayoptics_web_utils.optimization.config import normalize_operand_samples

        assert normalize_operand_samples(
            fresh_cooke_triplet,
            {"kind": kind, "target": 1.0, "weight": 0.0},
        ) == []

    def test_rejects_duplicate_variables_and_bad_asphere_targets(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.config import (
            normalize_optimizer_config,
            normalize_variables,
        )

        optimizer = normalize_optimizer_config({"optimizer": {"kind": "least_squares", "method": "trf"}})
        variable = {"kind": "radius", "surface_index": 1, "min": 10, "max": 20}
        with pytest.raises(ValueError, match="Duplicate variable target"):
            normalize_variables(fresh_cooke_triplet, [variable, variable], optimizer)

        with pytest.raises(IndexError, match="coefficient_index 10 is out of range"):
            normalize_variables(
                fresh_cooke_triplet,
                [
                    {
                        "kind": "asphere_polynomial_coefficient",
                        "surface_index": 1,
                        "asphere_kind": "EvenAspherical",
                        "coefficient_index": 10,
                        "min": -1,
                        "max": 1,
                    }
                ],
                optimizer,
            )

        with pytest.raises(ValueError, match="Toroid sweep radius target requires"):
            normalize_variables(
                fresh_cooke_triplet,
                [
                    {
                        "kind": "asphere_toric_sweep_radius",
                        "surface_index": 1,
                        "asphere_kind": "EvenAspherical",
                        "min": -1,
                        "max": 1,
                    }
                ],
                optimizer,
            )


class TestOptimizationPackageExports:
    def test_root_package_exports_optimizer_functions(self):
        import rayoptics_web_utils as package

        assert callable(package.evaluate_optimization_problem)
        assert callable(package.optimize_opm)


class TestOptimizationProblemStateAndObjectives:
    def test_radius_vectors_and_bounds_use_curvature_space_including_zero_crossing(
        self,
        fresh_cooke_triplet,
    ):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": -20, "max": 30},
                    {"kind": "thickness", "surface_index": 6, "min": 35, "max": 50},
                ],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "focal_length", "target": 100, "weight": 1}]
                },
            },
        )

        vector = problem.current_vector()
        lower, upper = problem.bounds()

        assert vector[0] == pytest.approx(1.0 / 23.713)
        np.testing.assert_allclose(lower, [-1.0 / 20.0, 35.0])
        np.testing.assert_allclose(upper, [1.0 / 30.0, 50.0])
        assert problem.scipy_bounds() == [
            pytest.approx((-1.0 / 20.0, 1.0 / 30.0)),
            pytest.approx((35.0, 50.0)),
        ]

    def test_optional_bounds_and_variable_state_preserve_public_radius_values(
        self,
        fresh_cooke_triplet,
    ):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [{"kind": "radius", "surface_index": 1}],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "focal_length", "target": 100, "weight": 1}]
                },
            },
        )

        assert problem.bounds()[0].tolist() == [float("-inf")]
        assert problem.bounds()[1].tolist() == [float("inf")]
        assert problem.scipy_bounds() == [(None, None)]
        assert problem.variable_state() == [
            {"kind": "radius", "surface_index": 1, "value": pytest.approx(23.713)}
        ]

    def test_from_normalized_config_binds_image_point_and_empty_variable_bounds(
        self,
        fresh_cooke_triplet,
    ):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        normalized = {
            "optimizer": {"kind": "least_squares", "method": "lm"},
            "variables": [],
            "pickups": [],
            "merit_function": {
                "operands": [
                    {
                        "kind": "focal_length",
                        "target": 100.0,
                        "weight": 1.0,
                        "options": {},
                        "field_index": None,
                        "field_weight": 1.0,
                        "wavelength_index": None,
                        "wavelength_weight": 1.0,
                    }
                ]
            },
        }

        problem = OptimizationProblem.from_normalized_config(
            fresh_cooke_triplet,
            normalized,
            image_point="centroid",
        )

        assert problem.image_point == "centroid"
        assert problem.current_vector().shape == (0,)
        lower, upper = problem.bounds()
        assert lower.shape == (0,)
        assert upper.shape == (0,)

    def test_evaluate_expands_vector_operands_and_applies_all_weight_factors(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {"kind": "focal_length", "target": 5, "weight": 2},
                        {
                            "kind": "ray_fan",
                            "weight": 3,
                            "fields": [{"index": 0, "weight": 4}],
                            "wavelengths": [{"index": 0, "weight": 9}],
                            "options": {"num_rays": 2},
                        },
                    ]
                },
            },
            image_point="centroid",
        )
        calls = []

        def fake_focal(opm, field_index, wavelength_index, options, image_point):
            calls.append(("focal_length", field_index, wavelength_index, options, image_point))
            return 6.0

        def fake_ray_fan(opm, field_index, wavelength_index, options, image_point):
            calls.append(("ray_fan", field_index, wavelength_index, options, image_point))
            return [0.25, -0.5]

        monkeypatch.setitem(operands_module.OPERAND_REGISTRY, "focal_length", fake_focal)
        monkeypatch.setitem(operands_module.OPERAND_REGISTRY, "ray_fan", fake_ray_fan)

        evaluation = problem.evaluate()

        assert calls == [
            ("focal_length", None, None, {}, "centroid"),
            ("ray_fan", 0, 0, {"num_rays": 2}, "centroid"),
        ]
        assert [entry["value"] for entry in evaluation["residuals"]] == [
            pytest.approx(6.0),
            pytest.approx(0.25),
            pytest.approx(-0.5),
        ]
        assert [entry["weighted_residual"] for entry in evaluation["residuals"]] == [
            pytest.approx(2.0),
            pytest.approx(18.0 * 0.25),
            pytest.approx(18.0 * -0.5),
        ]
        assert evaluation["merit_function"]["sum_of_squares"] == pytest.approx(
            2.0**2 + (18.0 * 0.25) ** 2 + (18.0 * -0.5) ** 2
        )
        assert "target" not in evaluation["residuals"][1]
        assert evaluation["residuals"][0]["target"] == 5.0

    def test_evaluate_reports_range_bounds_and_dead_zone_residuals(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        monkeypatch.setattr(operands_module, "RANGE_OPERAND_KINDS", frozenset({"fake_range"}))
        actual_values = iter([0.5, 3.0])
        monkeypatch.setitem(
            operands_module.OPERAND_REGISTRY,
            "fake_range",
            lambda opm, field_index, wavelength_index, options, image_point: next(actual_values),
        )
        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "fake_range",
                            "min": 1.0,
                            "max": 2.0,
                            "weight": 2,
                            "fields": [{"index": 0}],
                            "wavelengths": [{"index": 0}],
                        },
                        {
                            "kind": "fake_range",
                            "min": 1.0,
                            "weight": 1,
                            "fields": [{"index": 0}],
                            "wavelengths": [{"index": 0}],
                        },
                    ]
                },
            },
        )

        residuals = problem.evaluate()["residuals"]

        assert [(entry["value"], entry["weighted_residual"]) for entry in residuals] == [
            (pytest.approx(0.5), pytest.approx(1.0)),
            (pytest.approx(3.0), pytest.approx(0.0)),
        ]
        assert (residuals[0]["min"], residuals[0]["max"]) == (1.0, 2.0)
        assert residuals[1]["min"] == 1.0
        assert "max" not in residuals[1]
        assert all("target" not in entry for entry in residuals)

    def test_evaluate_passes_and_reports_surface_index_for_surface_operands(self, monkeypatch, fresh_cooke_triplet):
        import rayoptics_web_utils.optimization.operands as operands_module
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        monkeypatch.setattr(
            operands_module, "SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS", frozenset({"fake_surface_target"})
        )
        monkeypatch.setattr(operands_module, "SURFACE_FIXED_TARGET_OPERAND_KINDS", frozenset({"fake_surface_fixed"}))
        monkeypatch.setattr(operands_module, "SURFACE_RANGE_OPERAND_KINDS", frozenset({"fake_surface_range"}))
        surface_calls = []

        def fake_surface_evaluator(opm, surface_index, field_index, wavelength_index, options, image_point):
            surface_calls.append((surface_index, field_index, wavelength_index, image_point))
            return float(surface_index)

        for kind in ("fake_surface_target", "fake_surface_fixed", "fake_surface_range"):
            monkeypatch.setitem(operands_module.SURFACE_OPERAND_REGISTRY, kind, fake_surface_evaluator)
        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [
                        {
                            "kind": "fake_surface_target",
                            "surface_index": 1,
                            "target": 0.5,
                            "weight": 2,
                            "fields": [{"index": 0}],
                            "wavelengths": [{"index": 0}],
                        },
                        {
                            "kind": "fake_surface_fixed",
                            "surface_index": 3,
                            "weight": 1,
                            "fields": [{"index": 1}],
                            "wavelengths": [{"index": 0}],
                        },
                        {
                            "kind": "fake_surface_range",
                            "surface_index": 6,
                            "max": 4.0,
                            "weight": 1,
                            "fields": [{"index": 0}],
                            "wavelengths": [{"index": 1}],
                        },
                    ]
                },
            },
            image_point="image_heights",
        )

        residuals = problem.evaluate()["residuals"]

        assert surface_calls == [(1, 0, 0, "image_heights"), (3, 1, 0, "image_heights"), (6, 0, 1, "image_heights")]
        assert [entry["surface_index"] for entry in residuals] == [1, 3, 6]
        assert [entry["weighted_residual"] for entry in residuals] == [
            pytest.approx(1.0),
            pytest.approx(3.0),
            pytest.approx(2.0),
        ]
        assert residuals[0]["target"] == 0.5
        assert residuals[2]["max"] == 4.0
        assert "target" not in residuals[1]

    def test_evaluate_omits_surface_index_for_system_operands(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [],
                "pickups": [],
                "merit_function": {"operands": [{"kind": "focal_length", "target": 100, "weight": 1}]},
            },
        )

        assert "surface_index" not in problem.evaluate()["residuals"][0]

    def test_penalty_residual_vector_has_at_least_one_entry_for_empty_normalized_merit(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem.from_normalized_config(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [],
                "pickups": [],
                "merit_function": {"operands": []},
            },
        )

        assert problem.penalty_residual_vector().tolist() == [1e6]

    def test_glass_scalar_objective_normalizes_nonfinite_merit_and_propagates_errors(
        self,
        monkeypatch,
        fresh_cooke_triplet,
    ):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "focal_length", "target": 100, "weight": 1}]
                },
            },
        )
        monkeypatch.setattr(
            problem,
            "evaluate",
            lambda values=None: {
                "merit_function": {"sum_of_squares": float("nan"), "rss": float("nan")},
                "residuals": [],
            },
        )

        assert problem.glass_scalar_objective(np.array([], dtype=float)) == 1e10
        assert problem.optimization_progress[0]["merit_function_value"] == 1e10

        def fail_evaluate(values=None):
            raise RuntimeError("evaluation failed")

        monkeypatch.setattr(problem, "evaluate", fail_evaluate)
        with pytest.raises(RuntimeError, match="evaluation failed"):
            problem.glass_scalar_objective(np.array([], dtype=float))


@pytest.mark.parametrize("kind", ["least_squares", "differential_evolution"])
def test_optimize_opm_reports_no_variable_metadata_for_each_solver_family(
    fresh_cooke_triplet,
    kind,
):
    from rayoptics_web_utils.optimization import optimize_opm

    report = optimize_opm(
        fresh_cooke_triplet,
        {
            "optimizer": {"kind": kind},
            "variables": [],
            "pickups": [],
            "merit_function": {
                "operands": [{"kind": "focal_length", "target": 100, "weight": 1}]
            },
        },
    )

    assert report["success"] is True
    assert report["status"] == "no_variables"
    assert report["message"] == "No optimization variables supplied"
    assert report["optimizer"]["kind"] == kind
    assert report["optimizer"]["nfev"] == 0
    if kind == "least_squares":
        assert report["optimizer"]["method"] == "trf"
        assert report["optimizer"]["njev"] == 0
        assert report["optimizer"]["cost"] == pytest.approx(
            report["merit_function"]["sum_of_squares"] / 2.0
        )
        assert report["optimizer"]["optimality"] == 0.0
    else:
        assert report["optimizer"]["nit"] == 0


@pytest.mark.parametrize(
    ("kind", "best_vector"),
    [
        ("least_squares", np.array([4.0])),
        ("differential_evolution", None),
    ],
)
def test_stopped_report_uses_best_or_current_vector_and_solver_specific_fields(
    kind,
    best_vector,
):
    import rayoptics_web_utils.optimization.optimization as optimization_module

    evaluated_vectors = []

    class FakeProgress:
        def __init__(self):
            self.best_vector = best_vector
            self.latest_vector = np.array([6.0])

    class FakeProblem:
        optimizer = {
            "kind": kind,
            **({"method": "lm"} if kind == "least_squares" else {}),
        }
        progress = FakeProgress()
        optimization_progress = [{"iteration": 0, "merit_function_value": 9.0}]

        def current_vector(self):
            return np.array([8.0])

        def evaluate(self, vector):
            evaluated_vectors.append(np.array(vector, copy=True))
            return {
                "optimizer": {"kind": kind},
                "merit_function": {"sum_of_squares": 9.0, "rss": 3.0},
                "residuals": [],
            }

    report = optimization_module._build_stopped_report(
        FakeProblem(),
        [{"kind": "radius", "surface_index": 1, "value": 20.0}],
    )

    expected_vector = best_vector if best_vector is not None else np.array([8.0])
    np.testing.assert_allclose(evaluated_vectors, [expected_vector])
    assert report["success"] is True
    assert report["status"] == "stopped"
    assert report["message"] == "Optimization stopped by user"
    assert report["initial_values"] == [
        {"kind": "radius", "surface_index": 1, "value": 20.0}
    ]
    assert report["optimization_progress"] == FakeProblem.optimization_progress
    assert report["optimizer"]["nfev"] == 1
    if kind == "least_squares":
        assert report["optimizer"]["njev"] == 0
        assert report["optimizer"]["cost"] == pytest.approx(4.5)
        assert report["optimizer"]["optimality"] == 0.0
    else:
        assert report["optimizer"]["nit"] == 0


def test_compatibility_problem_optimize_forwards_lm_without_bounds_and_clears_reporter(
    monkeypatch,
    fresh_cooke_triplet,
):
    import rayoptics_web_utils.optimization.optimization as optimization_module
    from rayoptics_web_utils.optimization.optimization import _OptimizationProblem

    problem = _OptimizationProblem(
        fresh_cooke_triplet,
        {
            "optimizer": {"kind": "least_squares", "method": "lm"},
            "variables": [{"kind": "thickness", "surface_index": 6}],
            "pickups": [],
            "merit_function": {
                "operands": [{"kind": "focal_length", "target": 100, "weight": 1}]
            },
        },
    )
    captured = {}
    result = object()

    def fake_least_squares(function, initial, **kwargs):
        captured.update(function=function, initial=initial, kwargs=kwargs)
        return result

    monkeypatch.setattr(optimization_module, "least_squares", fake_least_squares)

    assert problem.optimize(object()) is result
    assert captured["function"] == problem.objective
    assert captured["initial"].shape == (1,)
    assert captured["kwargs"]["method"] == "lm"
    assert "bounds" not in captured["kwargs"]
    assert callable(captured["kwargs"]["jac"])
    assert problem._progress_reporter is None


def test_compatibility_problem_records_progress_with_its_reporter(monkeypatch):
    """The retained compatibility hook forwards the exact progress arguments."""
    from rayoptics_web_utils.optimization.optimization import _OptimizationProblem

    observed = {}

    class FakeProgress:
        def record(self, vector, evaluation, reporter):
            observed.update(vector=vector, evaluation=evaluation, reporter=reporter)
            return "recorded"

    problem = object.__new__(_OptimizationProblem)
    problem.progress = FakeProgress()
    problem._progress_reporter = object()
    vector = np.array([1.0, 2.0])
    evaluation = {"merit_function": {"sum_of_squares": 4.0}}

    assert problem._record_progress(vector, evaluation) == "recorded"
    assert observed == {
        "vector": vector,
        "evaluation": evaluation,
        "reporter": problem._progress_reporter,
    }


def test_f_number_operand_reads_paraxial_f_number_and_ignores_sample_arguments():
    """The f-number operand is scalar and independent of field/wavelength options."""
    from rayoptics_web_utils.optimization.operands import compute_f_number

    opm = {
        "optical_spec": {"pupil": SimpleNamespace(key=("object", "epd"), value=10.0)},
        "analysis_results": {
            "parax_data": SimpleNamespace(fod=SimpleNamespace(fno=7.25)),
        },
    }

    assert compute_f_number(
        opm,
        field_index=99,
        wavelength_index=88,
        options={"num_rays": 3},
        image_point="centroid",
    ) == pytest.approx(7.25)


def test_f_number_operand_defaults_to_chief_ray_image_point():
    """The low-level f-number operand keeps the shared chief-ray default."""
    import inspect

    from rayoptics_web_utils.optimization.operands import compute_f_number

    assert inspect.signature(compute_f_number).parameters["image_point"].default == "chief_ray"


def _budget_merit_function():
    return {
        "operands": [
            {"kind": "focal_length", "target": 45.0, "weight": 1.0},
            {"kind": "rms_spot_size", "target": 0.0, "weight": 1.0},
        ]
    }


class TestOptimizationProgressBudget:
    """The progress history never grows beyond the configured evaluation budget."""

    def test_trf_progress_excludes_finite_difference_jacobian_evaluations(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "least_squares",
                    "method": "trf",
                    "max_nfev": 20,
                    "ftol": 1e-12,
                    "xtol": 1e-12,
                    "gtol": 1e-12,
                },
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 15.0, "max": 40.0},
                    {"kind": "radius", "surface_index": 4, "min": 10.0, "max": 40.0},
                    {"kind": "radius", "surface_index": 6, "min": -40.0, "max": -10.0},
                    {"kind": "thickness", "surface_index": 6, "min": 30.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["optimizer"]["nfev"] == 20
        assert 1 < len(report["optimization_progress"]) <= 20

    def test_lm_progress_excludes_finite_difference_jacobian_evaluations(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "least_squares",
                    "method": "lm",
                    "max_nfev": 15,
                    "ftol": 1e-12,
                    "xtol": 1e-12,
                    "gtol": 1e-12,
                },
                "variables": [
                    {"kind": "radius", "surface_index": 1},
                    {"kind": "radius", "surface_index": 4},
                    {"kind": "thickness", "surface_index": 6},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] != "error"
        assert 1 < len(report["optimization_progress"]) <= 15

    def test_trf_adapter_matches_scipy_default_finite_difference_result(self, fresh_cooke_triplet):
        from scipy.optimize import least_squares

        from rayoptics_web_utils.optimization.problem import OptimizationProblem
        from rayoptics_web_utils.optimization.solvers.least_squares import LeastSquaresSolver

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 15},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 15.0, "max": 40.0},
                    {"kind": "thickness", "surface_index": 6, "min": 30.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )
        x0 = problem.current_vector()
        expected = least_squares(
            problem.residual_objective,
            x0,
            method="trf",
            bounds=problem.bounds(),
            ftol=1e-8,
            xtol=1e-8,
            gtol=1e-8,
            max_nfev=15,
        )
        problem.apply_vector(x0)

        result = LeastSquaresSolver(problem).solve()

        assert result["nfev"] == expected.nfev
        assert np.asarray(result["x"]).tolist() == pytest.approx(expected.x.tolist(), rel=1e-12, abs=1e-15)

    def test_residual_jacobian_does_not_record_progress(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 15.0, "max": 40.0},
                    {"kind": "thickness", "surface_index": 6, "min": 30.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )
        reported = []
        problem._progress_reporter = reported.append
        x0 = problem.current_vector()
        residuals = problem.residual_objective(x0)

        jacobian = problem.residual_jacobian(x0, problem.bounds())

        assert jacobian.shape == (residuals.size, 2)
        assert np.all(np.isfinite(jacobian))
        assert len(problem.optimization_progress) == 1
        assert len(reported) == 1

    def test_residual_jacobian_propagates_user_stop(self, monkeypatch, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm"},
                "variables": [{"kind": "thickness", "surface_index": 6}],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )
        x0 = problem.current_vector()

        def interrupt(values=None):
            raise KeyboardInterrupt

        monkeypatch.setattr(problem, "evaluate", interrupt)

        with pytest.raises(KeyboardInterrupt):
            problem.residual_jacobian(x0, (-np.inf, np.inf))

    def test_differential_evolution_progress_respects_population_floor(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "differential_evolution",
                    "max_nfev": 10,
                    "popsize": 1,
                    "tol": 0.0,
                    "atol": 0.0,
                    "rng": 1,
                },
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["optimizer"]["nfev"] <= 10
        assert len(report["optimization_progress"]) <= 10

    def test_differential_evolution_sobol_progress_respects_power_of_two_population(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {
                    "kind": "differential_evolution",
                    "max_nfev": 32,
                    "init": "sobol",
                    "tol": 0.0,
                    "atol": 0.0,
                    "rng": 1,
                },
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] != "error"
        assert report["optimizer"]["nfev"] <= 32
        assert len(report["optimization_progress"]) <= 32

    def test_differential_evolution_sobol_rejects_budget_below_rounded_population(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "differential_evolution", "max_nfev": 30, "init": "sobol", "rng": 1},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 20.0, "max": 30.0},
                    {"kind": "thickness", "surface_index": 6, "min": 35.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] == "error"
        assert report["message"] == "Differential evolution max_nfev must cover at least one full population"
        assert report["optimization_progress"] == []

    def test_lm_rejects_single_step_budget(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm", "max_nfev": 1},
                "variables": [{"kind": "radius", "surface_index": 1}],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] == "error"
        assert report["message"] == "Levenberg-Marquardt max_nfev must be at least 2"
        assert report["optimization_progress"] == []

    def test_lm_two_step_budget_stays_within_budget(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "lm", "max_nfev": 2},
                "variables": [{"kind": "radius", "surface_index": 1}],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] != "error"
        assert report["optimizer"]["nfev"] <= 2
        assert len(report["optimization_progress"]) <= 2

    def test_differential_evolution_rejects_budget_below_one_population(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "differential_evolution", "max_nfev": 20},
                "variables": [
                    {"kind": "radius", "surface_index": 1, "min": 15.0, "max": 40.0},
                    {"kind": "thickness", "surface_index": 6, "min": 30.0, "max": 50.0},
                ],
                "pickups": [],
                "merit_function": _budget_merit_function(),
            },
        )

        assert report["status"] == "error"
        assert report["message"] == "Differential evolution max_nfev must cover at least one full population"
        assert report["optimization_progress"] == []


class TestEdgeThicknessOperand:
    def test_evaluation_reports_one_surface_scoped_range_residual(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization.operands import compute_edge_thickness
        from rayoptics_web_utils.optimization.problem import OptimizationProblem

        problem = OptimizationProblem(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf"},
                "variables": [],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "edge_thickness", "surface_index": 1, "min": 3.0, "weight": 2.0}]
                },
            },
        )

        residuals = problem.evaluate()["residuals"]
        edge_thickness = compute_edge_thickness(fresh_cooke_triplet, 1, None, None, None, "chief_ray")

        assert edge_thickness < 3.0
        assert len(residuals) == 1
        assert residuals[0]["kind"] == "edge_thickness"
        assert residuals[0]["surface_index"] == 1
        assert residuals[0]["min"] == 3.0
        assert "max" not in residuals[0]
        assert residuals[0]["field_index"] is None
        assert residuals[0]["wavelength_index"] is None
        assert residuals[0]["value"] == pytest.approx(edge_thickness)
        assert residuals[0]["weighted_residual"] == pytest.approx(2.0 * (3.0 - edge_thickness))

    def test_optimization_thickens_a_lens_until_its_edge_satisfies_the_lower_bound(self, fresh_cooke_triplet):
        from rayoptics_web_utils.optimization import optimize_opm
        from rayoptics_web_utils.optimization.operands import compute_edge_thickness

        report = optimize_opm(
            fresh_cooke_triplet,
            {
                "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 50},
                "variables": [{"kind": "thickness", "surface_index": 1, "min": 1.0, "max": 20.0}],
                "pickups": [],
                "merit_function": {
                    "operands": [{"kind": "edge_thickness", "surface_index": 1, "min": 3.0, "weight": 1.0}]
                },
            },
        )

        assert report["success"] is True
        assert report["final_values"][0]["value"] > 4.831
        assert compute_edge_thickness(fresh_cooke_triplet, 1, None, None, None, "chief_ray") >= 3.0 - 1e-6
