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
    from rayoptics.raytr.vigcalc import set_vig

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
    set_vig(opm)
    return opm


class TestNollToNm:
    """Test Noll index to (n, m) conversion."""

    @pytest.mark.parametrize("j, expected", [
        (1, (0, 0)),
        (2, (1, 1)),
        (3, (1, -1)),
        (4, (2, 0)),
        (5, (2, -2)),
        (6, (2, 2)),
        (7, (3, -1)),
        (8, (3, 1)),
        (9, (3, -3)),
        (10, (3, 3)),
        (11, (4, 0)),
        (12, (4, 2)),
        (13, (4, -2)),
        (14, (4, 4)),
        (15, (4, -4)),
        (16, (5, 1)),
        (17, (5, -1)),
        (18, (5, 3)),
        (19, (5, -3)),
        (20, (5, 5)),
        (21, (5, -5)),
        (22, (6, 0)),
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
        # Unnormalized: R_2^0(0) = 2*0^2 - 1 = -1 (no sqrt(3) factor)
        np.testing.assert_allclose(result, -1.0)

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

        # Check Z4 self-integral ≈ pi/3 (unnormalized)
        self_int = np.sum(z4 * z4) * dA
        expected_self = np.pi / 3
        assert abs(self_int - expected_self) < 0.1, f"Z4·Z4 integral = {self_int}, expected ~{expected_self}"


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


class TestNollNormFactor:
    """Test Noll normalization factor N_n^m = sqrt((2 - delta_{m,0})(n + 1))."""

    @pytest.mark.parametrize("n, m, expected", [
        (0, 0, 1.0),           # Piston
        (1, 1, 2.0),           # Tilt
        (2, 0, np.sqrt(3)),    # Defocus
        (2, 2, np.sqrt(6)),    # Astigmatism
        (4, 0, np.sqrt(5)),    # Spherical
    ])
    def test_known_values(self, n, m, expected):
        from rayoptics_web_utils.zernike import noll_norm_factor
        assert abs(noll_norm_factor(n, m) - expected) < 1e-12


class TestUnnormalizedToRmsNormalized:
    """Test conversion from unnormalized to RMS-normalized coefficients."""

    def test_pure_defocus(self):
        """Pure defocus Z4=1.5 → rms[3] = 1.5 / sqrt(3)."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0, 0.0, 0.0, 1.5, 0.0]
        result = unnormalized_to_rms_normalized(coeffs, 5)
        assert abs(result[3] - 1.5 / np.sqrt(3)) < 1e-12

    def test_all_zeros(self):
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0] * 5
        result = unnormalized_to_rms_normalized(coeffs, 5)
        assert all(c == 0.0 for c in result)

    def test_piston_unchanged(self):
        """Piston N=1.0, so value is unchanged."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [2.5, 0.0, 0.0, 0.0, 0.0]
        result = unnormalized_to_rms_normalized(coeffs, 5)
        assert abs(result[0] - 2.5) < 1e-12


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
        """Off-axis field 1: Z6 (astigmatism cos2θ) should be significant."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=1, wvl_index=1)
        coeffs = result['coefficients']
        # With corrected Noll: Z6=(2,+2)=cos(2θ), the dominant astigmatism for y-meridian field
        assert abs(coeffs[5]) > 0.1, f"Z6 = {coeffs[5]}, expected significant off-axis"

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

    def test_wavelength_correction(self, cooke_triplet):
        """Coefficients should be in waves at the traced wavelength, not central.

        RayGrid internally divides OPD by central_wvl. The correction factor
        central_wvl/traced_wvl converts to waves at the traced wavelength.
        For d-line (central=traced), factor=1. For F-line, factor≈1.209.
        We verify by checking that Z11_F * λ_F and Z11_C * λ_C bracket Z11_d * λ_d
        (the physical OPD in nm is approximately similar across wavelengths).
        """
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        f_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=0)
        d_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        c_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=2)
        # Physical OPD (coeff * wavelength) should be in the same ballpark
        phys_f = abs(f_line['coefficients'][10]) * f_line['wavelength_nm']
        phys_d = abs(d_line['coefficients'][10]) * d_line['wavelength_nm']
        phys_c = abs(c_line['coefficients'][10]) * c_line['wavelength_nm']
        # Without wavelength correction, phys_f would be ~48nm and phys_d ~100nm (2x off)
        # With correction, all three should be within ~2x of each other
        assert 0.3 < phys_f / phys_d < 3.0, f"phys F/d = {phys_f/phys_d}, expected ~similar"
        assert 0.3 < phys_c / phys_d < 3.0, f"phys C/d = {phys_c/phys_d}, expected ~similar"
        # Verify F-line Z11 ≈ 0.118 (known corrected value)
        assert abs(f_line['coefficients'][10] - 0.118) < 0.02, (
            f"Z11 F-line = {f_line['coefficients'][10]}, expected ~0.118"
        )

    def test_coefficients_are_unnormalized(self, cooke_triplet):
        """On-axis d-line coefficients should match known values (unnormalized)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        coeffs = result['coefficients']
        # On-axis: exit pupil ≈ entrance pupil, values should be close to previous
        assert abs(coeffs[0] - 0.568) < 0.1, f"Z1 piston = {coeffs[0]}, expected ~0.568"
        assert abs(coeffs[3] - 0.788) < 0.1, f"Z4 defocus = {coeffs[3]}, expected ~0.788"

    def test_exit_pupil_coords_off_axis_z12(self, cooke_triplet):
        """Full-field: Z12 (secondary astigmatism) should be large with exit pupil coords.

        With entrance pupil coords Z12 ≈ 0.396; with exit pupil coords Z12 ≈ 0.765.
        OSLO reference: Z12 ≈ 0.820.
        """
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=2, wvl_index=1)
        coeffs = result['coefficients']
        # Exit pupil fitting should give Z12 > 0.5 (entrance pupil gives ~0.396)
        assert abs(coeffs[11]) > 0.5, (
            f"Z12 = {coeffs[11]}, expected > 0.5 with exit pupil coordinates"
        )

    def test_exit_pupil_coords_off_axis_z7_coma(self, cooke_triplet):
        """Full-field: Z7 (coma Y) should increase with exit pupil coords.

        Entrance pupil: Z7 ≈ +0.243, Exit pupil: Z7 ≈ +0.312, OSLO: Z7 ≈ +0.327.
        """
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=2, wvl_index=1)
        coeffs = result['coefficients']
        # Z7 should be > 0.28 with exit pupil coords (entrance pupil gives ~0.243)
        assert abs(coeffs[6]) > 0.28, (
            f"Z7 = {coeffs[6]}, expected > 0.28 with exit pupil coordinates"
        )

    def test_exit_pupil_coords_off_axis_z11_spherical(self, cooke_triplet):
        """Full-field: Z11 (primary spherical) magnitude should increase with exit pupil coords.

        Entrance pupil: Z11 ≈ -0.499, Exit pupil: Z11 ≈ -0.714, OSLO: Z11 ≈ -0.775.
        """
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=2, wvl_index=1)
        coeffs = result['coefficients']
        # Z11 should have |Z11| > 0.6 with exit pupil coords (entrance pupil gives ~0.499)
        assert abs(coeffs[10]) > 0.6, (
            f"Z11 = {coeffs[10]}, expected |Z11| > 0.6 with exit pupil coordinates"
        )

    def test_rms_normalized_key_exists(self, cooke_triplet):
        """rms_normalized_coefficients key exists and is list[float]."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert 'rms_normalized_coefficients' in result
        assert isinstance(result['rms_normalized_coefficients'], list)
        assert all(isinstance(c, float) for c in result['rms_normalized_coefficients'])

    def test_rms_normalized_length(self, cooke_triplet):
        """rms_normalized_coefficients length matches num_terms."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert len(result['rms_normalized_coefficients']) == result['num_terms']

    def test_rms_normalized_consistency(self, cooke_triplet):
        """rms_normalized[j-1] * N_n^m ≈ coefficients[j-1] for each j."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients, noll_to_nm, noll_norm_factor
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        coeffs = result['coefficients']
        rms = result['rms_normalized_coefficients']
        for j in range(1, result['num_terms'] + 1):
            n, m = noll_to_nm(j)
            reconstructed = rms[j - 1] * noll_norm_factor(n, abs(m))
            assert abs(reconstructed - coeffs[j - 1]) < 1e-10, (
                f"Z{j}: rms*N = {reconstructed}, coeff = {coeffs[j-1]}"
            )

    def test_raygrid_called_with_check_apertures_and_apply_vignetting(self, cooke_triplet):
        """RayGrid must be created with check_apertures=True and apply_vignetting=True."""
        from unittest.mock import patch
        from rayoptics.raytr.analyses import RayGrid as RealRayGrid
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        captured_kwargs: dict = {}

        def capturing_raygrid(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return RealRayGrid(*args, **kwargs)

        with patch('rayoptics.raytr.analyses.RayGrid', side_effect=capturing_raygrid):
            get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)

        assert captured_kwargs.get('check_apertures') is True, (
            f"Expected check_apertures=True, got {captured_kwargs.get('check_apertures')}"
        )
        assert captured_kwargs.get('apply_vignetting') is True, (
            f"Expected apply_vignetting=True, got {captured_kwargs.get('apply_vignetting')}"
        )


class TestFringeToNm:
    """Test Fringe (University of Arizona) index to (n, m) conversion."""

    @pytest.mark.parametrize("j, expected", [
        (1,  (0,  0)),
        (2,  (1, +1)),
        (3,  (1, -1)),
        (4,  (2,  0)),
        (5,  (2, +2)),
        (6,  (2, -2)),
        (7,  (3, +1)),
        (8,  (3, -1)),
        (9,  (4,  0)),
        (10, (3, +3)),
        (11, (3, -3)),
        (12, (4, +2)),
        (13, (4, -2)),
        (14, (5, +1)),
        (15, (5, -1)),
        (16, (6,  0)),
        (17, (4, +4)),
        (18, (4, -4)),
        (19, (5, +3)),
        (20, (5, -3)),
        (21, (6, +2)),
        (22, (6, -2)),
        (23, (7, +1)),
        (24, (7, -1)),
        (25, (8,  0)),
        (26, (5, +5)),
        (27, (5, -5)),
        (28, (6, +4)),
    ])
    def test_known_conversions(self, j, expected):
        from rayoptics_web_utils.zernike import fringe_to_nm
        assert fringe_to_nm(j) == expected

    def test_roundtrip_via_fringe_formula(self):
        """Round-trip: nm_to_fringe (Wikipedia formula) → fringe_to_nm must recover (n, m).

        j = (1 + (n + |m|) / 2)^2 − 2|m| + floor((1 − sgn(m)) / 2)
        """
        from rayoptics_web_utils.zernike import fringe_to_nm

        def nm_to_fringe(n: int, m: int) -> int:
            m_abs = abs(m)
            sgn_m = (1 if m > 0 else -1) if m != 0 else 0
            return (1 + (n + m_abs) // 2) ** 2 - 2 * m_abs + (1 - sgn_m) // 2

        for n in range(9):  # radial orders 0–8
            for m in range(-n, n + 1):
                if (n - abs(m)) % 2 != 0:
                    continue
                j = nm_to_fringe(n, m)
                assert fringe_to_nm(j) == (n, m), (
                    f"Round-trip failed for (n={n}, m={m}): "
                    f"nm_to_fringe={j}, fringe_to_nm({j})={fringe_to_nm(j)}"
                )


class TestZernikeFringe:
    """Test zernike_fringe polynomial evaluation."""

    def test_j1_piston_is_one_everywhere(self):
        from rayoptics_web_utils.zernike import zernike_fringe
        rho = np.array([0.0, 0.5, 1.0])
        theta = np.array([0.0, np.pi / 4, np.pi])
        result = zernike_fringe(1, rho, theta)
        np.testing.assert_allclose(result, 1.0)

    def test_j4_defocus_matches_noll_j4(self):
        """Fringe j=4 and Noll j=4 both map to (2,0): polynomials must be identical."""
        from rayoptics_web_utils.zernike import zernike_fringe, zernike_noll
        N = 30
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2).ravel()
        theta = np.arctan2(yy, xx).ravel()
        mask = rho <= 1.0
        np.testing.assert_allclose(
            zernike_fringe(4, rho[mask], theta[mask]),
            zernike_noll(4, rho[mask], theta[mask]),
        )

    def test_j5_cos_astigmatism_differs_from_noll_j5_sin(self):
        """Fringe j=5=(2,+2) cos-astig != Noll j=5=(2,-2) sin-astig."""
        from rayoptics_web_utils.zernike import zernike_fringe, zernike_noll
        rho = np.array([0.7, 0.7])
        theta = np.array([np.pi / 4, np.pi / 6])
        fringe_vals = zernike_fringe(5, rho, theta)
        noll_vals = zernike_noll(5, rho, theta)
        assert not np.allclose(fringe_vals, noll_vals), (
            "Fringe j=5 and Noll j=5 should evaluate to different polynomials"
        )

    def test_j9_primary_spherical_matches_noll_j11(self):
        """Fringe j=9=(4,0) and Noll j=11=(4,0) map to the same polynomial."""
        from rayoptics_web_utils.zernike import zernike_fringe, zernike_noll
        N = 30
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2).ravel()
        theta = np.arctan2(yy, xx).ravel()
        mask = rho <= 1.0
        np.testing.assert_allclose(
            zernike_fringe(9, rho[mask], theta[mask]),
            zernike_noll(11, rho[mask], theta[mask]),
        )


class TestFitZernikeFringeOrdering:
    """Test fit_zernike with ordering='fringe'."""

    def _make_grid(self, opd_func, N=65):
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)
        opd = opd_func(rho, theta)
        opd[rho > 1.0] = np.nan
        return np.array([xx, yy, opd])

    def test_pure_defocus_recovered_at_fringe_j4(self):
        """Pure defocus (Fringe j=4 = Noll j=4) should appear at index 3."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_fringe
        coeff = 1.5
        grid = self._make_grid(lambda r, t: coeff * zernike_fringe(4, r, t))
        coeffs = fit_zernike(grid, num_terms=16, ordering='fringe')
        assert abs(coeffs[3] - coeff) < 0.01, f"Fringe Z4={coeffs[3]}, expected {coeff}"
        for j in range(16):
            if j != 3:
                assert abs(coeffs[j]) < 0.05, f"Fringe Z{j+1}={coeffs[j]}, expected ~0"

    def test_pure_cos_astigmatism_recovered_at_fringe_j5(self):
        """Pure (2,+2) cos-astigmatism should appear at Fringe j=5 (index 4), not j=6."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_fringe
        coeff = 1.0
        grid = self._make_grid(lambda r, t: coeff * zernike_fringe(5, r, t))
        coeffs = fit_zernike(grid, num_terms=16, ordering='fringe')
        assert abs(coeffs[4] - coeff) < 0.01, f"Fringe Z5={coeffs[4]}, expected {coeff}"
        assert abs(coeffs[5]) < 0.05, f"Fringe Z6={coeffs[5]}, expected ~0"

    def test_noll_default_ordering_unchanged(self):
        """fit_zernike without ordering= arg still behaves as Noll."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_noll
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)
        opd = 1.5 * zernike_noll(4, rho, theta)
        opd[rho > 1.0] = np.nan
        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, num_terms=11)
        assert abs(coeffs[3] - 1.5) < 0.01, f"Noll Z4={coeffs[3]}, expected 1.5"


class TestUnnormalizedToRmsNormalizedFringe:
    """Test unnormalized_to_rms_normalized with ordering='fringe'."""

    def test_defocus_j4_same_for_both_orderings(self):
        """Fringe j=4 and Noll j=4 both map to (2,0): norm factor is identical."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0, 0.0, 0.0, 1.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        fringe_rms = unnormalized_to_rms_normalized(coeffs, 11, ordering='fringe')
        noll_rms = unnormalized_to_rms_normalized(coeffs, 11, ordering='noll')
        assert abs(fringe_rms[3] - noll_rms[3]) < 1e-12

    def test_j9_gives_different_norm_factor_fringe_vs_noll(self):
        """Fringe j=9=(4,0) N=sqrt(5); Noll j=9=(3,-3) N=sqrt(8). Results differ."""
        import math
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0] * 11
        coeffs[8] = 1.0  # j=9, index 8
        fringe_rms = unnormalized_to_rms_normalized(coeffs, 11, ordering='fringe')
        noll_rms = unnormalized_to_rms_normalized(coeffs, 11, ordering='noll')
        assert abs(fringe_rms[8] - 1.0 / math.sqrt(5)) < 1e-12
        assert abs(noll_rms[8] - 1.0 / math.sqrt(8)) < 1e-12
        assert abs(fringe_rms[8] - noll_rms[8]) > 0.01

    def test_noll_default_unchanged(self):
        """Calling without ordering= produces same result as ordering='noll'."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0, 0.0, 0.0, 1.5, 0.0]
        result_default = unnormalized_to_rms_normalized(coeffs, 5)
        result_noll = unnormalized_to_rms_normalized(coeffs, 5, ordering='noll')
        assert result_default == result_noll


class TestGetZernikeCoefficientsFringeOrdering:
    """Integration tests for get_zernike_coefficients with ordering='fringe'."""

    def test_returns_ordering_key_fringe(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, ordering='fringe'
        )
        assert result.get('ordering') == 'fringe'

    def test_default_ordering_is_noll(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert result.get('ordering') == 'noll'

    def test_on_axis_fringe_j4_approx_noll_j4_defocus(self, cooke_triplet):
        """Both orderings share j=4=(2,0); values must be near-identical on-axis."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, ordering='fringe'
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert abs(fringe['coefficients'][3] - noll['coefficients'][3]) < 0.05

    def test_on_axis_fringe_j9_approx_noll_j11_primary_spherical(self, cooke_triplet):
        """Fringe j=9=(4,0) and Noll j=11=(4,0): same polynomial, coefficients agree."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, ordering='fringe'
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1)
        assert abs(fringe['coefficients'][8] - noll['coefficients'][10]) < 0.05

    def test_off_axis_fringe_j5_differs_from_noll_j5(self, cooke_triplet):
        """Fringe j=5=(2,+2) vs Noll j=5=(2,-2): different astigmatism components."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=1, wvl_index=1, ordering='fringe'
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=1, wvl_index=1)
        assert abs(fringe['coefficients'][4] - noll['coefficients'][4]) > 0.05

    def test_json_serializable_fringe(self, cooke_triplet):
        import json
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, ordering='fringe'
        )
        assert isinstance(json.dumps(result), str)
