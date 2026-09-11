"""Behavioral tests for complete, rollback-safe optimization failure reports.

The fakes model setup failures, solver-family penalties, restored variable and
pickup state, progress copying, and glass-report setting fallbacks without
running a numerical optimizer.
"""

from types import SimpleNamespace

import numpy as np
import pytest


def test_continuous_failure_report_uses_setup_defaults_and_solver_family_penalty():
    from rayoptics_web_utils.optimization.failure_reports import (
        build_optimization_failure_report,
    )

    report = build_optimization_failure_report(
        RuntimeError("setup failed"),
        {"optimizer": {"kind": "differential_evolution"}},
    )

    assert report["success"] is False
    assert report["status"] == "error"
    assert report["message"] == "setup failed"
    assert report["optimizer"] == {
        "kind": "differential_evolution",
        "nfev": 0,
        "nit": 0,
    }
    assert report["initial_values"] == []
    assert report["final_values"] == []
    assert report["pickups"] == []
    assert report["merit_function"] == {"sum_of_squares": 1e6, "rss": 1000.0}


def test_continuous_failure_report_restores_snapshot_and_preserves_metadata():
    from rayoptics_web_utils.optimization.failure_reports import (
        build_optimization_failure_report,
    )

    variable = {"kind": "radius", "surface_index": 1, "value": 20.0}
    pickup = {
        "kind": "thickness",
        "surface_index": 2,
        "source_surface_index": 1,
        "scale": 2.0,
        "offset": 1.0,
    }
    initial_values = [{"kind": "radius", "surface_index": 1, "value": 20.0}]
    problem = SimpleNamespace(
        optimizer={"kind": "least_squares", "method": "lm"},
        optimization_progress=[{"iteration": 0, "merit_function_value": 4.0}],
        pickups=[pickup],
        penalty_residual_vector=lambda: np.full(3, 1e6),
    )
    snapshot = {
        ("thickness", 2): {
            "entry": pickup,
            "value": 5.5,
        }
    }

    report = build_optimization_failure_report(
        ValueError("solver failed"),
        {"optimizer": {"kind": "least_squares", "method": "lm"}},
        problem=problem,
        initial_values=initial_values,
        snapshot=snapshot,
        solver_result={"nfev": 8, "njev": 3},
    )

    assert report["optimizer"] == {
        "kind": "least_squares",
        "method": "lm",
        "nfev": 8,
        "njev": 3,
        "cost": pytest.approx(1.5e12),
        "optimality": 0.0,
    }
    assert report["initial_values"] == initial_values
    assert report["final_values"] == initial_values
    assert report["pickups"] == [{**pickup, "value": 5.5}]
    assert report["optimization_progress"] == problem.optimization_progress
    assert report["merit_function"]["sum_of_squares"] == pytest.approx(3e12)
    problem.optimization_progress[0]["merit_function_value"] = 99.0
    assert report["optimization_progress"][0]["merit_function_value"] == 4.0


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, 7),
        (True, 7),
        (0, 7),
        (-2, 7),
        (3, 3),
        ("3", 7),
    ],
)
def test_positive_integer_report_setting_accepts_only_positive_ints(value, expected):
    from rayoptics_web_utils.optimization.failure_reports import _positive_integer_setting

    assert _positive_integer_setting({"setting": value}, "setting", 7) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, 0.5),
        (True, 0.5),
        ("2.5", 2.5),
        (float("nan"), 0.5),
        (float("inf"), 0.5),
        (0.0, 0.5),
        (-1.0, 0.5),
        (2, 2.0),
    ],
)
def test_positive_float_report_setting_accepts_only_positive_finite_values(value, expected):
    from rayoptics_web_utils.optimization.failure_reports import _positive_float_setting

    assert _positive_float_setting({"setting": value}, "setting", 0.5) == pytest.approx(expected)


def test_glass_failure_report_uses_safe_settings_and_empty_state_before_initialization():
    from rayoptics_web_utils.optimization.failure_reports import (
        build_glass_optimization_failure_report,
    )

    report = build_glass_optimization_failure_report(
        RuntimeError("glass setup failed"),
        {
            "glass_optimizer": {
                "num_neighbours": 0,
                "maxiter": "bad",
                "tol": float("nan"),
            }
        },
    )

    assert report["optimizer"] == {
        "kind": "glass_expert",
        "method": "L-BFGS-B",
        "runs": 0,
        "nfev": 0,
        "nit": 0,
        "num_neighbours": 7,
        "maxiter": 1000,
        "tol": 1e-3,
    }
    assert report["initial_glasses"] == []
    assert report["final_glasses"] == []
    assert report["residuals"] == []
    assert report["merit_function"]["sum_of_squares"] == 1e10
