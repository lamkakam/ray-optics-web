"""Tests for mixed categorical glass and continuous optimization."""

from __future__ import annotations

from copy import deepcopy
import json
import math
from types import SimpleNamespace

import numpy as np
import pytest


@pytest.fixture
def glass_opm(cooke_triplet):
    """Return a function-scoped Cooke triplet for mutation-heavy tests."""
    return deepcopy(cooke_triplet)


def _config(*, glass_variables=None, variables=None, glass_optimizer=None):
    config = {
        "glass_variables": glass_variables or [],
        "variables": variables or [],
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
    }
    if glass_optimizer is not None:
        config["glass_optimizer"] = glass_optimizer
    return config


def _glass_variable(surface_index=1, candidates=None):
    return {
        "surface_index": surface_index,
        "candidates": candidates
        or [
            {"name": "N-LAK9", "catalog": "Schott"},
            {"name": "N-BK7", "catalog": "Schott"},
        ],
    }


class TestGlassConfig:
    def test_normalizes_defaults_and_resolved_candidate_coordinates(self, glass_opm):
        from rayoptics_web_utils.optimization.glass_config import normalize_glass_optimization_config

        normalized = normalize_glass_optimization_config(
            glass_opm,
            _config(glass_variables=[_glass_variable()]),
        )

        assert normalized["glass_optimizer"] == {
            "num_neighbours": 7,
            "maxiter": 1000,
            "tol": pytest.approx(1e-3),
        }
        candidate = normalized["glass_variables"][0]["candidates"][0]
        assert candidate.name == "N-LAK9"
        assert candidate.catalog == "Schott"
        assert math.isfinite(candidate.nd)
        assert math.isfinite(candidate.vd)

    @pytest.mark.parametrize(
        ("mutator", "message"),
        [
            (
                lambda config: config.update(
                    glass_variables=[_glass_variable(), _glass_variable()]
                ),
                "Duplicate glass variable surface",
            ),
            (
                lambda config: config.update(
                    glass_variables=[
                        _glass_variable(
                            candidates=[
                                {"name": "N-BK7", "catalog": "Schott"},
                                {"name": "N-BK7", "catalog": "Schott"},
                            ]
                        )
                    ]
                ),
                "Duplicate glass candidate",
            ),
            (
                lambda config: config.update(
                    glass_variables=[_glass_variable(surface_index=999)]
                ),
                "surface_index 999 is out of range",
            ),
            (
                lambda config: config.update(
                    glass_variables=[
                        _glass_variable(
                            candidates=[{"name": "N-BK7", "catalog": "Special"}]
                        )
                    ]
                ),
                "Unsupported glass catalog",
            ),
            (
                lambda config: config.update(
                    glass_variables=[
                        _glass_variable(
                            candidates=[{"name": "DOES-NOT-EXIST", "catalog": "Schott"}]
                        )
                    ]
                ),
                "Unable to resolve glass",
            ),
            (
                lambda config: config.update(
                    glass_variables=[
                        _glass_variable(
                            candidates=[{"name": "N-BK7", "catalog": "Schott"}]
                        )
                    ]
                ),
                "Current glass must be included",
            ),
            (
                lambda config: config.update(
                    variables=[
                        {
                            "kind": "thickness",
                            "surface_index": 6,
                            "min": 1.0,
                        }
                    ]
                ),
                "omit both min and max or provide both",
            ),
            (
                lambda config: config.update(
                    variables=[
                        {
                            "kind": "thickness",
                            "surface_index": 6,
                            "min": 2.0,
                            "max": 2.0,
                        }
                    ]
                ),
                "finite min < max",
            ),
            (
                lambda config: config.update(
                    glass_optimizer={"num_neighbours": 0}
                ),
                "num_neighbours must be a positive integer",
            ),
        ],
    )
    def test_rejects_invalid_configuration(self, glass_opm, mutator, message):
        from rayoptics_web_utils.optimization.glass_config import normalize_glass_optimization_config

        config = _config(glass_variables=[_glass_variable()])
        mutator(config)

        with pytest.raises((IndexError, ValueError), match=message):
            normalize_glass_optimization_config(glass_opm, config)

    def test_rejects_unsupported_incumbent_material(self, glass_opm):
        from rayoptics.seq.medium import decode_medium
        from rayoptics_web_utils.optimization.glass_config import normalize_glass_optimization_config

        glass_opm["seq_model"].gaps[1].medium = decode_medium("air")

        with pytest.raises(ValueError, match="Unsupported current material"):
            normalize_glass_optimization_config(
                glass_opm,
                _config(glass_variables=[_glass_variable()]),
            )

    def test_model_glass_is_mapped_to_nearest_allowed_candidate(self, glass_opm):
        from opticalglass.modelglass import ModelGlass
        from rayoptics_web_utils.optimization import optimize_glasses

        glass_opm["seq_model"].gaps[1].medium = ModelGlass(
            1.5168,
            64.17,
            "model target",
        )
        report = optimize_glasses(
            glass_opm,
            _config(
                glass_variables=[
                    _glass_variable(
                        candidates=[
                            {"name": "N-BK7", "catalog": "Schott"},
                            {"name": "N-SF5", "catalog": "Schott"},
                        ]
                    )
                ],
                glass_optimizer={"num_neighbours": 1, "maxiter": 1},
            ),
        )

        assert report["initial_glasses"] == [
            {"surface_index": 1, "name": "model target", "catalog": "user"}
        ]
        assert report["final_glasses"][0] == {
            "surface_index": 1,
            "name": "N-BK7",
            "catalog": "Schott",
        }


class TestGlassSearchHelpers:
    @staticmethod
    def _candidate(name, nd, vd):
        from rayoptics_web_utils.optimization.glass_config import ResolvedGlassCandidate

        return ResolvedGlassCandidate(
            name=name,
            catalog="Schott",
            medium=object(),
            nd=nd,
            vd=vd,
        )

    def test_global_sampling_uses_deterministic_point_seed(self, monkeypatch):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        candidates = [
            self._candidate("A", 1.5, 50.0),
            self._candidate("B", 1.6, 60.0),
            self._candidate("C", 1.7, 30.0),
        ]
        captured = {}

        def fake_kmeans2(data, count, *, minit, seed):
            captured.update(data=data, count=count, minit=minit, seed=seed)
            return np.array([[1.5, 50.0], [1.7, 30.0]]), np.array([0, 0, 1])

        monkeypatch.setattr(module, "kmeans2", fake_kmeans2)

        selected = module.select_global_representatives(candidates, 2)

        assert [entry.name for entry in selected] == ["A", "C"]
        assert captured["count"] == 2
        assert captured["minit"] == "points"
        assert captured["seed"] == 1234
        assert captured["data"].tolist() == [[1.5, 50.0], [1.6, 60.0], [1.7, 30.0]]

    def test_single_candidate_bypasses_kmeans(self, monkeypatch):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        candidate = self._candidate("only", 1.5, 50.0)
        monkeypatch.setattr(module, "kmeans2", pytest.fail)

        assert module.select_global_representatives([candidate], 7) == [candidate]

    def test_neighbours_use_raw_distance_and_stable_tie_order(self):
        from rayoptics_web_utils.optimization.glass_optimizer import nearest_candidates

        current = self._candidate("current", 1.5, 50.0)
        raw_nearest = self._candidate("raw", 1.9, 50.0)
        farther = self._candidate("farther", 1.5, 49.0)
        tie_first = self._candidate("tie-first", 1.1, 50.0)

        neighbours = nearest_candidates(
            current,
            [current, raw_nearest, tie_first, farther],
            3,
        )

        assert [entry.name for entry in neighbours] == ["raw", "tie-first", "farther"]


class TestLBFGSBSolver:
    def test_passes_explicit_method_bounds_maxiter_and_tolerance(self, monkeypatch):
        import rayoptics_web_utils.optimization.solvers.lbfgsb as module

        captured = {}

        class Problem:
            variables = [object(), object()]
            _progress_reporter = None

            @staticmethod
            def current_vector():
                return np.array([1.0, 2.0])

            @staticmethod
            def scipy_bounds():
                return [(0.0, 3.0), (None, None)]

            @staticmethod
            def glass_scalar_objective(vector):
                return float(np.sum(vector**2))

            @staticmethod
            def apply_vector(vector):
                captured["applied"] = vector.tolist()

        def fake_minimize(function, x0, **kwargs):
            captured.update(function=function, x0=x0, kwargs=kwargs)
            return SimpleNamespace(
                x=np.array([1.5, 2.5]),
                fun=8.5,
                success=True,
                status=4,
                message="ok",
                nfev=8,
                nit=3,
            )

        monkeypatch.setattr(module, "minimize", fake_minimize)

        result = module.LBFGSBSolver(Problem(), maxiter=23, tol=2e-4).solve()

        assert captured["kwargs"] == {
            "method": "L-BFGS-B",
            "bounds": [(0.0, 3.0), (None, None)],
            "options": {"maxiter": 23},
            "tol": 2e-4,
        }
        assert captured["applied"] == [1.5, 2.5]
        assert result["status"] == 4

    def test_objective_failures_and_non_finite_values_use_1e10_penalty(self):
        from rayoptics_web_utils.optimization.solvers.lbfgsb import LBFGSBSolver

        class FailingProblem:
            variables = [object()]
            _progress_reporter = None

            @staticmethod
            def glass_scalar_objective(_vector):
                raise ValueError("trace failed")

        class NonFiniteProblem(FailingProblem):
            @staticmethod
            def glass_scalar_objective(_vector):
                return float("nan")

        assert LBFGSBSolver(FailingProblem(), 1, 1e-3).objective(np.array([0.0])) == 1e10
        assert LBFGSBSolver(NonFiniteProblem(), 1, 1e-3).objective(np.array([0.0])) == 1e10


class TestOptimizeGlasses:
    def test_processes_surfaces_in_config_order_and_restores_each_incumbent(self, monkeypatch, glass_opm):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        glass_variables = [
            _glass_variable(
                surface_index=3,
                candidates=[
                    {"name": "N-SF5", "catalog": "Schott"},
                    {"name": "N-F2", "catalog": "Schott"},
                ],
            ),
            _glass_variable(surface_index=1),
        ]
        seen = []

        monkeypatch.setattr(
            module,
            "select_global_representatives",
            lambda candidates, _count: list(candidates),
        )
        monkeypatch.setattr(module, "nearest_candidates", lambda *_args: [])

        def fake_solve(self, progress_reporter=None):
            del progress_reporter
            context = self.problem.progress_context
            seen.append(
                (
                    context["phase"],
                    context.get("surface_index"),
                    self.problem.opm["seq_model"].gaps[1].medium.name(),
                    self.problem.opm["seq_model"].gaps[3].medium.name(),
                )
            )
            return {
                "x": self.problem.current_vector(),
                "fun": 1e6,
                "success": True,
                "status": 0,
                "message": "ok",
                "nfev": 1,
                "nit": 0,
            }

        monkeypatch.setattr(module.LBFGSBSolver, "solve", fake_solve)

        module.optimize_glasses(
            glass_opm,
            _config(glass_variables=glass_variables),
        )

        assert seen[:4] == [
            ("global", 3, "N-LAK9", "N-SF5"),
            ("global", 3, "N-LAK9", "N-F2"),
            ("global", 1, "N-LAK9", "N-SF5"),
            ("global", 1, "N-BK7", "N-SF5"),
        ]

    def test_strict_ties_keep_the_incumbent(self, monkeypatch, glass_opm):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        incumbent = glass_opm["seq_model"].gaps[1].medium
        monkeypatch.setattr(
            module.LBFGSBSolver,
            "solve",
            lambda self, progress_reporter=None: {
                "x": self.problem.current_vector(),
                "fun": 1e10,
                "success": True,
                "status": 0,
                "message": "tie",
                "nfev": 1,
                "nit": 0,
            },
        )
        monkeypatch.setattr(
            module,
            "select_global_representatives",
            lambda candidates, _count: list(candidates),
        )
        monkeypatch.setattr(module, "nearest_candidates", lambda *_args: [])

        module.optimize_glasses(
            glass_opm,
            _config(glass_variables=[_glass_variable()]),
        )

        assert glass_opm["seq_model"].gaps[1].medium is incumbent

    def test_unexpected_error_restores_material_and_numeric_pickup_state(self, monkeypatch, glass_opm):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        original_medium = glass_opm["seq_model"].gaps[1].medium
        original_thickness = glass_opm["seq_model"].gaps[6].thi

        def raise_after_mutation(self, progress_reporter=None):
            del progress_reporter
            self.problem.opm["seq_model"].gaps[6].thi = 123.0
            raise RuntimeError("boom")

        monkeypatch.setattr(module.LBFGSBSolver, "solve", raise_after_mutation)

        with pytest.raises(RuntimeError, match="boom"):
            module.optimize_glasses(
                glass_opm,
                _config(
                    glass_variables=[_glass_variable()],
                    variables=[
                        {
                            "kind": "thickness",
                            "surface_index": 6,
                            "min": 35.0,
                            "max": 50.0,
                        }
                    ],
                ),
            )

        assert glass_opm["seq_model"].gaps[1].medium is original_medium
        assert glass_opm["seq_model"].gaps[6].thi == pytest.approx(original_thickness)

    def test_interrupt_discards_partial_candidate_and_returns_best_completed_state(self, monkeypatch, glass_opm):
        import rayoptics_web_utils.optimization.glass_optimizer as module

        calls = 0

        monkeypatch.setattr(
            module,
            "select_global_representatives",
            lambda candidates, _count: list(candidates),
        )
        monkeypatch.setattr(module, "nearest_candidates", lambda *_args: [])

        def solve_then_interrupt(self, progress_reporter=None):
            nonlocal calls
            del progress_reporter
            calls += 1
            if calls == 2:
                self.problem.opm["seq_model"].gaps[6].thi = 999.0
                raise KeyboardInterrupt
            return {
                "x": self.problem.current_vector(),
                "fun": 0.0,
                "success": True,
                "status": 0,
                "message": "accepted",
                "nfev": 1,
                "nit": 0,
            }

        monkeypatch.setattr(module.LBFGSBSolver, "solve", solve_then_interrupt)

        report = module.optimize_glasses(
            glass_opm,
            _config(
                glass_variables=[
                    _glass_variable(
                        candidates=[
                            {"name": "N-BK7", "catalog": "Schott"},
                            {"name": "N-LAK9", "catalog": "Schott"},
                        ]
                    )
                ],
                variables=[
                    {
                        "kind": "thickness",
                        "surface_index": 6,
                        "min": 35.0,
                        "max": 50.0,
                    }
                ],
            ),
        )

        assert report["success"] is True
        assert report["status"] == "stopped"
        assert report["final_glasses"][0]["name"] == "N-BK7"
        assert glass_opm["seq_model"].gaps[6].thi != pytest.approx(999.0)

    def test_progress_is_global_monotonic_and_candidate_aware(self, glass_opm):
        from rayoptics_web_utils.optimization import optimize_glasses

        snapshots = []
        report = optimize_glasses(
            glass_opm,
            _config(
                glass_variables=[_glass_variable()],
                glass_optimizer={"num_neighbours": 1, "maxiter": 1, "tol": 1e-3},
            ),
            progress_reporter=snapshots.append,
        )

        entries = report["optimization_progress"]
        assert [entry["iteration"] for entry in entries] == list(range(len(entries)))
        assert {entry["phase"] for entry in entries} <= {"global", "local", "polish"}
        assert any(
            entry.get("candidate", {}).get("catalog") == "Schott"
            and isinstance(entry.get("surface_index"), int)
            for entry in entries
        )
        assert snapshots[-1] == entries

    def test_glass_only_and_no_variable_statuses_are_json_safe(self, glass_opm):
        from rayoptics_web_utils.optimization import optimize_glasses

        glass_report = optimize_glasses(
            glass_opm,
            _config(
                glass_variables=[_glass_variable()],
                glass_optimizer={"num_neighbours": 1, "maxiter": 1},
            ),
        )
        empty_report = optimize_glasses(glass_opm, _config())

        assert glass_report["status"] == "optimized"
        assert glass_report["optimizer"] == pytest.approx(
            {
                "kind": "glass_expert",
                "method": "L-BFGS-B",
                "runs": 3,
                "nfev": 3,
                "nit": 0,
                "num_neighbours": 1,
                "maxiter": 1,
                "tol": 1e-3,
            }
        )
        assert empty_report["status"] == "no_variables"
        json.dumps(glass_report, allow_nan=False)
        json.dumps(empty_report, allow_nan=False)

    def test_continuous_only_unbounded_run_returns_final_scipy_status(self, glass_opm):
        from rayoptics_web_utils.optimization import optimize_glasses

        report = optimize_glasses(
            glass_opm,
            _config(
                variables=[{"kind": "thickness", "surface_index": 6}],
                glass_optimizer={"maxiter": 1},
            ),
        )

        assert isinstance(report["status"], int)
        assert report["optimizer"]["runs"] == 1
        assert report["optimizer"]["method"] == "L-BFGS-B"
