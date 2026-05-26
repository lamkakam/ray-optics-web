"""Tests for rayoptics_web_utils.focusing module."""

import json
import numpy as np
import pytest


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


@pytest.fixture
def fresh_finite_conjugate_cooke_triplet():
    """Build a fresh finite-conjugate Cooke Triplet optical model."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

    opm = OpticalModel()
    osp = opm['optical_spec']
    sm = opm['seq_model']
    opm.system_spec.dimensions = 'mm'
    osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)
    osp['fov'] = FieldSpec(osp, key=['object', 'height'], value=5, flds=[0], is_relative=False)
    osp['wvls'] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 100.0
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


class TestFiniteConjugateFocusing:
    """Tests that focusing centers on the paraxial image distance for finite objects."""

    def test_mono_rms_spot_reaches_paraxial_image_distance(self, fresh_finite_conjugate_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_rms_spot

        opm = fresh_finite_conjugate_cooke_triplet
        sm = opm['seq_model']
        target = float(opm['analysis_results']['parax_data'].fod.img_dist)

        focus_by_mono_rms_spot(opm, field_indices=[0])

        assert abs(sm.gaps[-1].thi - target) < 1.0

    def test_mono_strehl_reaches_paraxial_image_distance(self, fresh_finite_conjugate_cooke_triplet):
        from rayoptics_web_utils.focusing import focus_by_mono_strehl

        opm = fresh_finite_conjugate_cooke_triplet
        sm = opm['seq_model']
        target = float(opm['analysis_results']['parax_data'].fod.img_dist)

        focus_by_mono_strehl(opm, field_indices=[0])

        assert abs(sm.gaps[-1].thi - target) < 1.0

    def test_paraxial_image_distance_matches_bfl_for_infinite_object(self, fresh_cooke_triplet):
        opm = fresh_cooke_triplet
        fod = opm['analysis_results']['parax_data'].fod

        assert abs(float(fod.img_dist) - float(fod.bfl)) < 1.0


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


class TestOpdOnlyPaths:
    """Tests that Strehl/WFE paths consume OPD without exit-pupil coordinate extraction."""

    @staticmethod
    def _fake_opm():
        class FakeWavelengths:
            central_wvl = 500.0
            wavelengths = [500.0, 1000.0]
            spectral_wts = [1.0, 3.0]

        class FakeOpticalModel:
            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": FakeWavelengths()}
                raise KeyError(key)

        return FakeOpticalModel()

    def test_mono_wfe_uses_scaled_opd_only(self, monkeypatch):
        import rayoptics_web_utils.focusing.focusing as focusing
        import rayoptics_web_utils.raygrid as raygrid

        opm = self._fake_opm()
        captured_opds = []

        class FakeRayGrid:
            grid = np.array([[[0.0]], [[0.0]], [[0.25]]])

        def fake_make_ray_grid(opm_arg, fi, wavelength_nm, num_rays):
            assert opm_arg is opm
            assert fi == 4
            assert wavelength_nm == 500.0
            assert num_rays == 9
            return FakeRayGrid()

        def fake_scale_opd_grid_to_wavelength(opd_grid, opm_arg, wavelength_nm):
            assert opm_arg is opm
            assert wavelength_nm == 500.0
            return opd_grid + 0.5

        def fake_opd_wfe(opd_grid):
            captured_opds.append(opd_grid.copy())
            return float(opd_grid[0, 0])

        monkeypatch.setattr(raygrid, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(focusing, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(focusing, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)
        monkeypatch.setattr(focusing, "_opd_wfe", fake_opd_wfe)

        result = focusing._compute_mono_wfe(opm, [4], num_rays=9)

        assert result == pytest.approx(0.75)
        assert captured_opds[0] == pytest.approx(np.array([[0.75]]))

    def test_poly_wfe_uses_scaled_opd_only(self, monkeypatch):
        import rayoptics_web_utils.focusing.focusing as focusing
        import rayoptics_web_utils.raygrid as raygrid

        opm = self._fake_opm()
        scaled_wavelengths = []

        class FakeRayGrid:
            def __init__(self, wavelength_nm):
                self.grid = np.array([[[0.0]], [[0.0]], [[wavelength_nm / 1000.0]]])

        def fake_make_ray_grid(opm_arg, fi, wavelength_nm, num_rays):
            assert opm_arg is opm
            assert fi == 2
            assert num_rays == 9
            return FakeRayGrid(wavelength_nm)

        def fake_scale_opd_grid_to_wavelength(opd_grid, opm_arg, wavelength_nm):
            assert opm_arg is opm
            scaled_wavelengths.append(wavelength_nm)
            return opd_grid

        monkeypatch.setattr(raygrid, "make_ray_grid", fake_make_ray_grid)
        monkeypatch.setattr(focusing, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(focusing, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)
        monkeypatch.setattr(focusing, "_opd_wfe", lambda opd_grid: float(opd_grid[0, 0]))

        result = focusing._compute_poly_wfe(opm, [2], num_rays=9)

        expected = np.sqrt((0.5**2 * 1.0 + 1.0**2 * 3.0) / 4.0)
        assert result == pytest.approx(expected)
        assert scaled_wavelengths == [500.0, 1000.0]

    def test_mono_strehl_uses_scaled_opd_only(self, monkeypatch):
        import rayoptics_web_utils.focusing.focusing as focusing
        import rayoptics_web_utils.raygrid as raygrid

        opm = self._fake_opm()

        class FakeRayGrid:
            grid = np.array([[[0.0]], [[0.0]], [[0.25]]])

        monkeypatch.setattr(raygrid, "make_ray_grid", lambda *args, **kwargs: FakeRayGrid())
        monkeypatch.setattr(focusing, "_extract_exit_pupil_grid", pytest.fail, raising=False)
        monkeypatch.setattr(focusing, "_scale_opd_grid_to_wavelength", lambda opd, _opm, _wvl: opd + 0.25)
        monkeypatch.setattr(focusing, "_monochromatic_strehl", lambda opd_grid: float(opd_grid[0, 0]))

        result = focusing._compute_mono_strehl(opm, [0], num_rays=9)

        assert result == pytest.approx(0.5)

    def test_poly_strehl_uses_scaled_opd_only(self, monkeypatch):
        import rayoptics_web_utils.focusing.focusing as focusing
        import rayoptics_web_utils.raygrid as raygrid

        opm = self._fake_opm()
        scaled_wavelengths = []

        class FakeRayGrid:
            def __init__(self, wavelength_nm):
                self.grid = np.array([[[0.0]], [[0.0]], [[wavelength_nm / 1000.0]]])

        monkeypatch.setattr(
            raygrid,
            "make_ray_grid",
            lambda _opm, fi, wavelength_nm, num_rays: FakeRayGrid(wavelength_nm),
        )
        monkeypatch.setattr(focusing, "_extract_exit_pupil_grid", pytest.fail, raising=False)

        def fake_scale_opd_grid_to_wavelength(opd_grid, _opm, wavelength_nm):
            scaled_wavelengths.append(wavelength_nm)
            return opd_grid

        monkeypatch.setattr(focusing, "_scale_opd_grid_to_wavelength", fake_scale_opd_grid_to_wavelength)
        monkeypatch.setattr(focusing, "_monochromatic_strehl", lambda opd_grid: float(opd_grid[0, 0]))

        result = focusing._compute_poly_strehl(opm, [0], num_rays=9)

        expected = (0.5 * 1.0 + 1.0 * 3.0) / 4.0
        assert result == pytest.approx(expected)
        assert scaled_wavelengths == [500.0, 1000.0]


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
