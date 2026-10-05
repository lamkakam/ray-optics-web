"""Tests for the transverse-aberration spot helpers shared by focusing, operands, and analysis."""

from types import SimpleNamespace

import numpy as np
import pytest


def _field(image_point):
    return SimpleNamespace(ref_sphere=(np.asarray(image_point, dtype=float), None))


def _ray_pkg(point, direction):
    return [[[np.asarray(point, dtype=float), np.asarray(direction, dtype=float)]]]


class TestTransverseAberration:
    def test_projects_final_ray_by_focus_along_z_and_subtracts_reference_point(self):
        from rayoptics_web_utils._spot import _transverse_aberration

        result = _transverse_aberration(
            _ray_pkg([1.0, 2.0, 3.0], [0.0, 0.0, 2.0]), _field([0.5, 1.0, 0.0]), 4.0
        )

        assert result.tolist() == [pytest.approx(0.5), pytest.approx(1.0)]

    def test_oblique_ray_moves_laterally_with_focus(self):
        from rayoptics_web_utils._spot import _transverse_aberration

        ray_pkg = _ray_pkg([0.0, 0.0, 0.0], [0.6, 0.0, 0.8])

        result = _transverse_aberration(ray_pkg, _field([0.0, 0.0, 0.0]), 0.8)

        assert result.tolist() == [pytest.approx(0.6), pytest.approx(0.0)]


class TestSpotFn:
    def test_returns_transverse_aberration_and_none_for_blocked_ray(self):
        from rayoptics_web_utils._spot import _spot_fn

        field = _field([0.5, 1.0, 0.0])
        ray_pkg = _ray_pkg([1.0, 2.0, 3.0], [0.0, 0.0, 2.0])

        assert _spot_fn(None, None, ray_pkg, field, None, 4.0).tolist() == [
            pytest.approx(0.5),
            pytest.approx(1.0),
        ]
        assert _spot_fn(None, None, None, field, None, 4.0) is None

    def test_operands_and_focusing_share_the_same_adapter(self):
        from rayoptics_web_utils._spot import _spot_fn
        from rayoptics_web_utils.focusing import focusing
        from rayoptics_web_utils.optimization import operands

        assert operands._spot_fn is _spot_fn
        assert focusing._spot_fn is _spot_fn


class TestRmsRadius:
    def test_returns_root_mean_square_radius_of_points(self):
        from rayoptics_web_utils._spot import _rms_radius

        points = [np.array([3.0, 4.0]), np.array([0.0, 0.0])]

        assert _rms_radius(points) == pytest.approx(np.sqrt(12.5))

    def test_returns_penalty_for_empty_points(self):
        from rayoptics_web_utils._spot import _rms_radius

        assert _rms_radius([]) == 1.0e6
