"""Tests for rayoptics_web_utils.focusing module."""

import json
import numpy as np
import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()


@pytest.fixture
def fresh_cooke_triplet():
    """Build a fresh Cooke Triplet optical model (function-scoped to avoid mutation)."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

    opm = OpticalModel()
    osp = opm['optical_spec']
    sm = opm['seq_model']
    opm.system_spec.dimensions = 'mm'
    osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)
    osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp['wvls'] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
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


class TestFocusByMonoRmsSpot:
    """Tests for focus_by_mono_rms_spot()."""

    def test_returns_dict_with_required_keys(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        result = focus_by_mono_rms_spot(fresh_cooke_triplet)
        assert isinstance(result, dict)
        assert 'delta_thi' in result
        assert 'metric_value' in result

    def test_delta_thi_is_float(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        result = focus_by_mono_rms_spot(fresh_cooke_triplet)
        assert isinstance(result['delta_thi'], float)

    def test_metric_value_is_positive(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        result = focus_by_mono_rms_spot(fresh_cooke_triplet)
        assert result['metric_value'] > 0.0

    def test_opm_gaps_mutated(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        thi_before = sm.gaps[-1].thi
        result = focus_by_mono_rms_spot(opm)
        thi_after = sm.gaps[-1].thi
        assert abs(thi_after - thi_before) == pytest.approx(abs(result['delta_thi']), abs=1e-9)

    def test_focus_improves_rms(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        from rayoptics_web_utils.focusing import _compute_mono_rms_spot
        opm = fresh_cooke_triplet
        # Apply known 2mm defocus to create suboptimal state
        opm['seq_model'].gaps[-1].thi += 2.0
        opm.update_model()
        metric_before = _compute_mono_rms_spot(opm, [0], num_rays=21)
        result = focus_by_mono_rms_spot(opm)
        assert result['metric_value'] < metric_before

    def test_delta_within_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        bounds = (-3.0, 3.0)
        result = focus_by_mono_rms_spot(fresh_cooke_triplet, bounds=bounds)
        assert bounds[0] <= result['delta_thi'] <= bounds[1]

    def test_single_field_index_accepted(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        result = focus_by_mono_rms_spot(fresh_cooke_triplet, field_indices=[0])
        assert isinstance(result, dict)
        assert 'delta_thi' in result
        assert 'metric_value' in result


class TestFocusByMonoStrehl:
    """Tests for focus_by_mono_strehl()."""

    def test_returns_dict_with_required_keys(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        result = focus_by_mono_strehl(fresh_cooke_triplet)
        assert isinstance(result, dict)
        assert 'delta_thi' in result
        assert 'metric_value' in result

    def test_metric_value_in_0_1_range(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        result = focus_by_mono_strehl(fresh_cooke_triplet)
        assert 0.0 <= result['metric_value'] <= 1.0

    def test_opm_gaps_mutated(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        thi_before = sm.gaps[-1].thi
        result = focus_by_mono_strehl(opm)
        thi_after = sm.gaps[-1].thi
        assert abs(thi_after - thi_before) == pytest.approx(abs(result['delta_thi']), abs=1e-9)

    def test_focus_improves_strehl(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        from rayoptics_web_utils.focusing import _compute_mono_strehl
        opm = fresh_cooke_triplet
        # Apply known 2mm defocus to create suboptimal state
        opm['seq_model'].gaps[-1].thi += 2.0
        opm.update_model()
        metric_before = _compute_mono_strehl(opm, [0], num_rays=21)
        result = focus_by_mono_strehl(opm)
        assert result['metric_value'] > metric_before

    def test_delta_within_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        bounds = (-3.0, 3.0)
        result = focus_by_mono_strehl(fresh_cooke_triplet, bounds=bounds)
        assert bounds[0] <= result['delta_thi'] <= bounds[1]


class TestFocusByPolyRmsSpot:
    """Tests for focus_by_poly_rms_spot()."""

    def test_returns_dict_with_required_keys(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        result = focus_by_poly_rms_spot(fresh_cooke_triplet)
        assert isinstance(result, dict)
        assert 'delta_thi' in result
        assert 'metric_value' in result

    def test_metric_value_is_positive(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        result = focus_by_poly_rms_spot(fresh_cooke_triplet)
        assert result['metric_value'] > 0.0

    def test_opm_gaps_mutated(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        thi_before = sm.gaps[-1].thi
        result = focus_by_poly_rms_spot(opm)
        thi_after = sm.gaps[-1].thi
        assert abs(thi_after - thi_before) == pytest.approx(abs(result['delta_thi']), abs=1e-9)

    def test_focus_improves_poly_rms(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        from rayoptics_web_utils.focusing import _compute_poly_rms_spot
        opm = fresh_cooke_triplet
        # Apply known 2mm defocus to create suboptimal state
        opm['seq_model'].gaps[-1].thi += 2.0
        opm.update_model()
        metric_before = _compute_poly_rms_spot(opm, [0], num_rays=21)
        result = focus_by_poly_rms_spot(opm)
        assert result['metric_value'] < metric_before

    def test_delta_within_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        bounds = (-3.0, 3.0)
        result = focus_by_poly_rms_spot(fresh_cooke_triplet, bounds=bounds)
        assert bounds[0] <= result['delta_thi'] <= bounds[1]


class TestFocusByPolyStrehl:
    """Tests for focus_by_poly_strehl()."""

    def test_returns_dict_with_required_keys(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        result = focus_by_poly_strehl(fresh_cooke_triplet)
        assert isinstance(result, dict)
        assert 'delta_thi' in result
        assert 'metric_value' in result

    def test_metric_value_in_0_1_range(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        result = focus_by_poly_strehl(fresh_cooke_triplet)
        assert 0.0 <= result['metric_value'] <= 1.0

    def test_opm_gaps_mutated(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        thi_before = sm.gaps[-1].thi
        result = focus_by_poly_strehl(opm)
        thi_after = sm.gaps[-1].thi
        assert abs(thi_after - thi_before) == pytest.approx(abs(result['delta_thi']), abs=1e-9)

    def test_focus_improves_poly_strehl(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        from rayoptics_web_utils.focusing import _compute_poly_strehl
        opm = fresh_cooke_triplet
        # Apply known 2mm defocus to create suboptimal state
        opm['seq_model'].gaps[-1].thi += 2.0
        opm.update_model()
        metric_before = _compute_poly_strehl(opm, [0], num_rays=21)
        result = focus_by_poly_strehl(opm, field_indices=[0])
        assert result['metric_value'] > metric_before

    def test_delta_within_bounds(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        bounds = (-3.0, 3.0)
        result = focus_by_poly_strehl(fresh_cooke_triplet, bounds=bounds)
        assert bounds[0] <= result['delta_thi'] <= bounds[1]


class TestFocusingFromLargeDefocus:
    """Tests that focusing functions escape local minima when thi is far from BFL."""

    def test_mono_rms_spot_escapes_large_defocus(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        # Defocus by +20mm (well outside default ±5mm bounds)
        sm.gaps[-1].thi += 20.0
        opm.update_model()
        bfl = float(opm['analysis_results']['parax_data'].fod.bfl)
        focus_by_mono_rms_spot(opm)
        assert abs(sm.gaps[-1].thi - bfl) < 1.0

    def test_mono_strehl_escapes_large_defocus(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        sm.gaps[-1].thi += 20.0
        opm.update_model()
        bfl = float(opm['analysis_results']['parax_data'].fod.bfl)
        focus_by_mono_strehl(opm)
        assert abs(sm.gaps[-1].thi - bfl) < 1.0

    def test_poly_rms_spot_escapes_large_defocus(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_rms_spot
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        sm.gaps[-1].thi += 20.0
        opm.update_model()
        bfl = float(opm['analysis_results']['parax_data'].fod.bfl)
        focus_by_poly_rms_spot(opm)
        assert abs(sm.gaps[-1].thi - bfl) < 1.0

    def test_poly_strehl_escapes_large_defocus(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_poly_strehl
        opm = fresh_cooke_triplet
        sm = opm['seq_model']
        sm.gaps[-1].thi += 20.0
        opm.update_model()
        bfl = float(opm['analysis_results']['parax_data'].fod.bfl)
        focus_by_poly_strehl(opm)
        assert abs(sm.gaps[-1].thi - bfl) < 1.0


class TestRmsAggregationUsesQuadraticMean:
    """Tests that multi-field RMS aggregation uses quadratic mean (not arithmetic mean)."""

    def test_mono_rms_spot_multi_field_is_quadratic_mean(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import _compute_mono_rms_spot
        opm = fresh_cooke_triplet
        v0 = _compute_mono_rms_spot(opm, [0], num_rays=21)
        v1 = _compute_mono_rms_spot(opm, [1], num_rays=21)
        v2 = _compute_mono_rms_spot(opm, [2], num_rays=21)
        expected_quadratic = float(np.sqrt(np.mean(np.array([v0, v1, v2])**2)))
        expected_arithmetic = float(np.mean([v0, v1, v2]))
        result = _compute_mono_rms_spot(opm, [0, 1, 2], num_rays=21)
        assert result == pytest.approx(expected_quadratic, rel=1e-6)
        assert result != pytest.approx(expected_arithmetic, rel=1e-6)

    def test_poly_rms_spot_multi_field_is_quadratic_mean(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import _compute_poly_rms_spot
        opm = fresh_cooke_triplet
        v0 = _compute_poly_rms_spot(opm, [0], num_rays=21)
        v1 = _compute_poly_rms_spot(opm, [1], num_rays=21)
        v2 = _compute_poly_rms_spot(opm, [2], num_rays=21)
        expected_quadratic = float(np.sqrt(np.mean(np.array([v0, v1, v2])**2)))
        expected_arithmetic = float(np.mean([v0, v1, v2]))
        result = _compute_poly_rms_spot(opm, [0, 1, 2], num_rays=21)
        assert result == pytest.approx(expected_quadratic, rel=1e-6)
        assert result != pytest.approx(expected_arithmetic, rel=1e-6)

    def test_mono_wfe_multi_field_is_quadratic_mean(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import _compute_mono_wfe
        opm = fresh_cooke_triplet
        v0 = _compute_mono_wfe(opm, [0], num_rays=21)
        v1 = _compute_mono_wfe(opm, [1], num_rays=21)
        v2 = _compute_mono_wfe(opm, [2], num_rays=21)
        expected_quadratic = float(np.sqrt(np.mean(np.array([v0, v1, v2])**2)))
        expected_arithmetic = float(np.mean([v0, v1, v2]))
        result = _compute_mono_wfe(opm, [0, 1, 2], num_rays=21)
        assert result == pytest.approx(expected_quadratic, rel=1e-6)
        assert result != pytest.approx(expected_arithmetic, rel=1e-6)

    def test_poly_wfe_multi_field_is_quadratic_mean(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import _compute_poly_wfe
        opm = fresh_cooke_triplet
        v0 = _compute_poly_wfe(opm, [0], num_rays=21)
        v1 = _compute_poly_wfe(opm, [1], num_rays=21)
        v2 = _compute_poly_wfe(opm, [2], num_rays=21)
        expected_quadratic = float(np.sqrt(np.mean(np.array([v0, v1, v2])**2)))
        expected_arithmetic = float(np.mean([v0, v1, v2]))
        result = _compute_poly_wfe(opm, [0, 1, 2], num_rays=21)
        assert result == pytest.approx(expected_quadratic, rel=1e-6)
        assert result != pytest.approx(expected_arithmetic, rel=1e-6)

    def test_mono_strehl_multi_field_is_arithmetic_mean(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import _compute_mono_strehl
        opm = fresh_cooke_triplet
        v0 = _compute_mono_strehl(opm, [0], num_rays=21)
        v1 = _compute_mono_strehl(opm, [1], num_rays=21)
        v2 = _compute_mono_strehl(opm, [2], num_rays=21)
        expected_arithmetic = float(np.mean([v0, v1, v2]))
        result = _compute_mono_strehl(opm, [0, 1, 2], num_rays=21)
        assert result == pytest.approx(expected_arithmetic, rel=1e-6)


class TestFocusingEdgeCases:
    """Edge case tests for focusing functions."""

    def test_custom_narrow_bounds_respected(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        bounds = (-0.1, 0.1)
        result = focus_by_mono_rms_spot(fresh_cooke_triplet, bounds=bounds)
        assert bounds[0] <= result['delta_thi'] <= bounds[1]

    def test_json_serializable(self, fresh_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot
        result = focus_by_mono_rms_spot(fresh_cooke_triplet)
        # Should not raise
        json.dumps(result)
