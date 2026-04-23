"""Architecture tests for the optimization solver abstraction."""

import numpy as np
import pytest


@pytest.fixture
def optimization_config():
    return {
        "optimizer": {"kind": "least_squares", "method": "trf", "max_nfev": 5},
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


def test_problem_exposes_scalar_objective_from_merit_function(monkeypatch, cooke_triplet, optimization_config):
    from rayoptics_web_utils.optimization.problem import OptimizationProblem

    problem = OptimizationProblem(cooke_triplet, optimization_config)

    evaluation = {
        "residuals": [{"weighted_residual": 3.0}],
        "merit_function": {"sum_of_squares": 9.0, "rss": 3.0},
    }

    monkeypatch.setattr(problem, "evaluate", lambda values=None: evaluation)

    merit_value = problem.scalar_objective(problem.current_vector())

    assert merit_value == pytest.approx(9.0)
    assert problem.optimization_progress == [
        {
            "iteration": 0,
            "merit_function_value": 9.0,
            "log10_merit_function_value": pytest.approx(0.9542425094393249),
        }
    ]


def test_optimize_opm_dispatches_through_solver_registry(monkeypatch, cooke_triplet, optimization_config):
    import rayoptics_web_utils.optimization.optimization as optimization_module

    captured = {}
    original_image_distance = cooke_triplet["seq_model"].gaps[6].thi

    class FakeSolver:
        def __init__(self, problem):
            captured["problem"] = problem

        def solve(self, progress_reporter=None):
            captured["progress_reporter"] = progress_reporter
            return {
                "x": np.array([42.0]),
                "success": True,
                "status": 7,
                "message": "stub",
                "nfev": 3,
                "njev": 2,
                "cost": 1.25,
                "optimality": 0.5,
            }

    monkeypatch.setitem(optimization_module._SOLVER_REGISTRY, "least_squares", FakeSolver)

    try:
        result = optimization_module.optimize_opm(cooke_triplet, optimization_config)
    finally:
        cooke_triplet["seq_model"].gaps[6].thi = original_image_distance
        cooke_triplet.update_model()

    assert captured["problem"].optimizer["kind"] == "least_squares"
    assert result["success"] is True
    assert result["status"] == 7
    assert result["message"] == "stub"


def test_least_squares_adapter_calls_scipy_with_problem_interfaces(monkeypatch, cooke_triplet, optimization_config):
    from rayoptics_web_utils.optimization.problem import OptimizationProblem
    from rayoptics_web_utils.optimization.solvers.least_squares import LeastSquaresSolver

    captured = {}
    problem = OptimizationProblem(cooke_triplet, optimization_config)

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

    monkeypatch.setattr("rayoptics_web_utils.optimization.solvers.least_squares.least_squares", fake_least_squares)

    result = LeastSquaresSolver(problem).solve()

    assert result["success"] is True
    assert captured["func"] == problem.residual_objective
    assert captured["method"] == "trf"
    assert "bounds" in captured


def test_least_squares_adapter_omits_bounds_for_lm(monkeypatch, cooke_triplet, optimization_config):
    from rayoptics_web_utils.optimization.problem import OptimizationProblem
    from rayoptics_web_utils.optimization.solvers.least_squares import LeastSquaresSolver

    captured = {}
    config = {
        **optimization_config,
        "optimizer": {**optimization_config["optimizer"], "method": "lm"},
        "variables": [
            {"kind": "thickness", "surface_index": 6},
        ],
    }
    problem = OptimizationProblem(cooke_triplet, config)

    def fake_least_squares(func, x0, method, ftol, xtol, gtol, max_nfev, **kwargs):
        captured["func"] = func
        captured["x0"] = x0
        captured["method"] = method
        captured["kwargs"] = kwargs

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

    monkeypatch.setattr("rayoptics_web_utils.optimization.solvers.least_squares.least_squares", fake_least_squares)

    result = LeastSquaresSolver(problem).solve()

    assert result["success"] is True
    assert captured["func"] == problem.residual_objective
    assert captured["method"] == "lm"
    assert "bounds" not in captured["kwargs"]
