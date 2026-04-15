"""Tests for rayoptics_web_utils.optimization."""

import json

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


class TestEvaluateOptimizationProblem:
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

    def test_evaluates_opd_operand_using_combined_tangential_and_sagittal_fans(self, fresh_cooke_triplet):
        from rayoptics_web_utils.analysis import get_opd_fan_data
        from rayoptics_web_utils.optimization import evaluate_optimization_problem

        field_index = 1
        wavelength_index = 1
        opd_data = get_opd_fan_data(fresh_cooke_triplet, fi=field_index)
        fan_entry = opd_data[wavelength_index]
        samples = [*fan_entry["Tangential"]["y"], *fan_entry["Sagittal"]["y"]]
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

        def fake_get_opd_fan_data(opm, fi):
            del opm, fi
            return [
                {
                    "fieldIdx": 0,
                    "wvlIdx": 0,
                    "Tangential": {"x": [0.0], "y": [float("nan")]},
                    "Sagittal": {"x": [0.0], "y": [float("nan")]},
                    "unitX": "",
                    "unitY": "waves",
                }
            ]

        monkeypatch.setattr(optimization_module, "get_opd_fan_data", fake_get_opd_fan_data, raising=False)

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


class TestOptimizeOpm:
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

        assert result["success"] is True
        assert result["merit_function"]["sum_of_squares"] < before["merit_function"]["sum_of_squares"]
        assert fresh_cooke_triplet["seq_model"].gaps[-1].thi == pytest.approx(result["final_values"][0]["value"])

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

        def fake_least_squares(func, x0, bounds, method, ftol, xtol, gtol, max_nfev):
            captured["func"] = func
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

        def fake_least_squares(func, x0, bounds, method, ftol, xtol, gtol, max_nfev):
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


class TestOptimizationPackageExports:
    def test_root_package_exports_optimizer_functions(self):
        import rayoptics_web_utils as package

        assert callable(package.evaluate_optimization_problem)
        assert callable(package.optimize_opm)
