"""Tests for rayoptics_web_utils.zernike module."""

import json
import numpy as np
import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()


@pytest.fixture(scope="module")
def cooke_triplet():
    """Build a configured Cooke Triplet (Sasian Triplet) optical model."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec
    from rayoptics.raytr.trace import apply_paraxial_vignetting

    opm = OpticalModel()
    osp = opm['optical_spec']
    sm = opm['seq_model']
    opm.system_spec.dimensions = 'MM'
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
    apply_paraxial_vignetting(opm)
    return opm


class TestNollToNm:
    """Test Noll index to (n, m) conversion."""

    @pytest.mark.parametrize("j, expected", [
        (1, (0, 0)),
        (2, (1, 1)),
        (3, (1, -1)),
        (4, (2, 0)),
        (5, (2, 2)),
        (6, (2, -2)),
        (11, (4, 0)),
    ])
    def test_known_conversions(self, j, expected):
        from rayoptics_web_utils.zernike import noll_to_nm
        assert noll_to_nm(j) == expected


class TestZernikeRadial:
    """Test radial polynomial R_n^m(rho)."""

    def test_r00_is_one(self):
        from rayoptics_web_utils.zernike import zernike_radial
        rho = np.array([0.0, 0.5, 1.0])
        result = zernike_radial(0, 0, rho)
        np.testing.assert_allclose(result, 1.0)

    def test_r11_is_rho(self):
        from rayoptics_web_utils.zernike import zernike_radial
        rho = np.array([0.0, 0.3, 0.7, 1.0])
        result = zernike_radial(1, 1, rho)
        np.testing.assert_allclose(result, rho)

    def test_r20_is_2rho2_minus_1(self):
        from rayoptics_web_utils.zernike import zernike_radial
        rho = np.array([0.0, 0.5, 1.0])
        expected = 2 * rho**2 - 1
        result = zernike_radial(2, 0, rho)
        np.testing.assert_allclose(result, expected)


class TestZernikeNoll:
    """Test full Zernike polynomial evaluation."""

    def test_z1_piston_is_constant(self):
        from rayoptics_web_utils.zernike import zernike_noll
        rho = np.array([0.0, 0.5, 1.0])
        theta = np.array([0.0, np.pi / 4, np.pi])
        result = zernike_noll(1, rho, theta)
        np.testing.assert_allclose(result, 1.0)

    def test_z4_defocus_at_origin(self):
        from rayoptics_web_utils.zernike import zernike_noll
        rho = np.array([0.0])
        theta = np.array([0.0])
        result = zernike_noll(4, rho, theta)
        np.testing.assert_allclose(result, -np.sqrt(3))

    def test_orthogonality(self):
        """Numerical check: integral of Z_i * Z_j over unit disk ≈ pi * delta_ij."""
        from rayoptics_web_utils.zernike import zernike_noll
        N = 200
        x = np.linspace(-1, 1, N)
        y = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, y)
        rho = np.sqrt(xx**2 + yy**2).ravel()
        theta = np.arctan2(yy, xx).ravel()
        mask = rho <= 1.0
        rho_m = rho[mask]
        theta_m = theta[mask]
        dx = 2.0 / N
        dA = dx * dx

        # Check Z4 and Z5 are orthogonal
        z4 = zernike_noll(4, rho_m, theta_m)
        z5 = zernike_noll(5, rho_m, theta_m)
        cross = np.sum(z4 * z5) * dA
        assert abs(cross) < 0.05, f"Z4·Z5 cross-integral = {cross}, expected ~0"

        # Check Z4 self-integral ≈ pi
        self_int = np.sum(z4 * z4) * dA
        assert abs(self_int - np.pi) < 0.1, f"Z4·Z4 integral = {self_int}, expected ~pi"


class TestFitZernike:
    """Test Zernike fitting round-trip recovery."""

    def test_pure_defocus_recovery(self):
        """Pure defocus signal should be recovered as Z4 only."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_noll
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)

        # Build synthetic OPD grid with pure defocus (Z4)
        coeff_z4 = 1.5
        opd = coeff_z4 * zernike_noll(4, rho, theta)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, num_terms=11)

        assert abs(coeffs[3] - coeff_z4) < 0.01, f"Z4 = {coeffs[3]}, expected {coeff_z4}"
        # Other terms should be near zero
        for j in range(11):
            if j != 3:
                assert abs(coeffs[j]) < 0.05, f"Z{j+1} = {coeffs[j]}, expected ~0"

    def test_pure_piston_recovery(self):
        """Pure piston signal should be recovered as Z1 only."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_noll
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)

        coeff_z1 = 2.0
        opd = np.full_like(rho, coeff_z1)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, num_terms=11)

        assert abs(coeffs[0] - coeff_z1) < 0.01, f"Z1 = {coeffs[0]}, expected {coeff_z1}"
        for j in range(1, 11):
            assert abs(coeffs[j]) < 0.05, f"Z{j+1} = {coeffs[j]}, expected ~0"

    def test_mixed_round_trip(self):
        """Mixed Z1 + Z4 + Z11 should be recovered."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_noll
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)

        target = {1: 0.5, 4: 1.0, 11: -0.3}
        opd = np.zeros_like(rho)
        for j, c in target.items():
            opd += c * zernike_noll(j, rho, theta)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, num_terms=22)

        for j, c in target.items():
            assert abs(coeffs[j - 1] - c) < 0.02, f"Z{j} = {coeffs[j-1]}, expected {c}"


class TestGetZernikeCoefficients:
    """Integration tests with Cooke Triplet model."""

    def test_returns_dict_with_expected_keys(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert isinstance(result, dict)
        for key in ['coefficients', 'rms_wfe', 'pv_wfe', 'num_terms', 'field_index', 'wavelength_nm']:
            assert key in result, f"Missing key: {key}"

    def test_coefficients_is_list_of_float(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert isinstance(result['coefficients'], list)
        assert all(isinstance(c, float) for c in result['coefficients'])

    def test_json_serializable(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        json_str = json.dumps(result)
        assert isinstance(json_str, str)

    def test_on_axis_z11_dominant_higher_order(self, cooke_triplet):
        """On-axis, d-line: Z11 (primary spherical) should be the dominant higher-order term."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        coeffs = result['coefficients']
        # Higher-order terms are j=5 onward (index 4+)
        higher_order = [(j + 1, abs(c)) for j, c in enumerate(coeffs) if j >= 4]
        dominant = max(higher_order, key=lambda x: x[1])
        assert dominant[0] == 11, f"Expected Z11 dominant, got Z{dominant[0]}"

    def test_on_axis_no_coma_astigmatism(self, cooke_triplet):
        """On-axis: rotational symmetry means Z5,Z6,Z7,Z8 ≈ 0."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        coeffs = result['coefficients']
        for j in [5, 6, 7, 8]:
            assert abs(coeffs[j - 1]) < 0.02, f"Z{j} = {coeffs[j-1]}, expected ~0 on-axis"

    def test_off_axis_astigmatism_significant(self, cooke_triplet):
        """Off-axis field 1: Z5 (astigmatism) should be significant."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=1, wvl_index=1)
        coeffs = result['coefficients']
        assert abs(coeffs[4]) > 0.1, f"Z5 = {coeffs[4]}, expected significant off-axis"

    def test_rms_and_pv_positive(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert result['rms_wfe'] > 0
        assert result['pv_wfe'] >= result['rms_wfe']

    def test_on_axis_rms_approx(self, cooke_triplet):
        """On-axis RMS ≈ 0.73 waves (from spec, within ±0.1)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert abs(result['rms_wfe'] - 0.73) < 0.1, f"RMS = {result['rms_wfe']}, expected ~0.73"

    def test_strehl_ratio_in_result(self, cooke_triplet):
        """strehl_ratio key exists and is a float."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert 'strehl_ratio' in result, "Missing key: strehl_ratio"
        assert isinstance(result['strehl_ratio'], float)

    def test_strehl_ratio_range(self, cooke_triplet):
        """Strehl ratio must be between 0.0 and 1.0."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert 0.0 <= result['strehl_ratio'] <= 1.0, f"Strehl = {result['strehl_ratio']}, out of range"

    def test_on_axis_strehl_approx(self, cooke_triplet):
        """On-axis d-line Strehl ≈ 0.096 (from spec: 0.0963, within ±0.02)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert abs(result['strehl_ratio'] - 0.096) < 0.02, (
            f"Strehl = {result['strehl_ratio']}, expected ~0.096"
        )

    def test_strehl_decreases_off_axis(self, cooke_triplet):
        """On-axis Strehl > full-field Strehl (system degrades with field)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        on_axis = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        full_field = get_zernike_coefficients(cooke_triplet, field_index=2, wvl_index=1)
        assert on_axis['strehl_ratio'] > full_field['strehl_ratio'], (
            f"On-axis Strehl ({on_axis['strehl_ratio']}) should be > "
            f"full-field Strehl ({full_field['strehl_ratio']})"
        )
