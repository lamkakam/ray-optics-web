"""Tests for the shared bounded best-focus solver."""

from types import SimpleNamespace

import pytest


def _fake_model(img_dist: float, thi: float):
    """Return a minimal model exposing paraxial image distance and the last gap."""
    fod = SimpleNamespace(img_dist=img_dist)
    parts = {
        "analysis_results": {"parax_data": SimpleNamespace(fod=fod)},
        "seq_model": SimpleNamespace(gaps=[SimpleNamespace(thi=1.0), SimpleNamespace(thi=thi)]),
    }

    class FakeOpticalModel:
        def __getitem__(self, key):
            return parts[key]

    return FakeOpticalModel()


class TestParaxialFocusOffset:
    def test_returns_paraxial_image_distance_minus_last_gap(self):
        from rayoptics_web_utils.focusing._solver import _paraxial_focus_offset

        assert _paraxial_focus_offset(_fake_model(img_dist=42.5, thi=40.0)) == pytest.approx(2.5)


class TestMinimizeFocus:
    def test_finds_parabola_minimum_inside_centered_bounds(self):
        from rayoptics_web_utils.focusing._solver import _minimize_focus

        result = _minimize_focus(lambda foc: (foc - 11.25) ** 2, center=10.0)

        assert isinstance(result, float)
        assert result == pytest.approx(11.25, abs=1.0e-4)

    def test_default_bounds_are_five_units_around_center(self):
        from rayoptics_web_utils.focusing._solver import DEFAULT_FOCUS_BOUNDS, _minimize_focus

        assert DEFAULT_FOCUS_BOUNDS == (-5.0, 5.0)
        result = _minimize_focus(lambda foc: (foc - 100.0) ** 2, center=0.0)

        assert result == pytest.approx(5.0, abs=1.0e-4)

    def test_minimum_outside_custom_bounds_is_clamped_to_edge(self):
        from rayoptics_web_utils.focusing._solver import _minimize_focus

        result = _minimize_focus(lambda foc: (foc + 3.0) ** 2, center=1.0, bounds=(-0.5, 0.5))

        assert 0.5 <= result <= 1.5
        assert result == pytest.approx(0.5, abs=1.0e-4)

    def test_looser_tolerance_needs_fewer_evaluations_and_stays_within_it(self):
        from rayoptics_web_utils.focusing._solver import _minimize_focus

        calls = {"default": 0, "loose": 0}

        def objective_for(name):
            def objective(foc: float) -> float:
                calls[name] += 1
                return (foc - 0.123456) ** 2 + 0.1 * (foc - 0.123456) ** 4

            return objective

        _minimize_focus(objective_for("default"), center=0.0)
        result = _minimize_focus(objective_for("loose"), center=0.0, xatol=1.0e-2)

        assert calls["loose"] < calls["default"]
        assert result == pytest.approx(0.123456, abs=1.0e-2)
