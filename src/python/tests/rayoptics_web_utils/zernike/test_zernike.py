"""Behavioral tests for Zernike evaluation, fitting, and exported metrics."""

import json
import numpy as np
import pytest

NOLL_TERMS_22 = [
    (0, 0), (1, 1), (1, -1), (2, 0), (2, -2), (2, 2),
    (3, -1), (3, 1), (3, -3), (3, 3), (4, 0), (4, 2),
    (4, -2), (4, 4), (4, -4), (5, 1), (5, -1), (5, 3),
    (5, -3), (5, 5), (5, -5), (6, 0),
]

FRINGE_TERMS_28 = [
    (0, 0), (1, 1), (1, -1), (2, 0), (2, 2), (2, -2),
    (3, 1), (3, -1), (4, 0), (3, 3), (3, -3), (4, 2),
    (4, -2), (5, 1), (5, -1), (6, 0), (4, 4), (4, -4),
    (5, 3), (5, -3), (6, 2), (6, -2), (7, 1), (7, -1),
    (8, 0), (5, 5), (5, -5), (6, 4),
]


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

    def test_higher_order_nonzero_azimuthal_term_uses_both_factorials(self):
        from rayoptics_web_utils.zernike import zernike_radial

        rho = np.array([0.5])

        assert zernike_radial(4, 2, rho) == pytest.approx([4 * 0.5**4 - 3 * 0.5**2])

    def test_integer_input_still_produces_float_polynomial_values(self):
        from rayoptics_web_utils.zernike import zernike_radial

        result = zernike_radial(2, 0, np.array([0, 1]))

        assert result.dtype == float
        np.testing.assert_allclose(result, [-1.0, 1.0])


class TestZernikePolynomial:
    """Test full Zernike polynomial evaluation."""

    def test_piston_is_constant(self):
        from rayoptics_web_utils.zernike import zernike_polynomial
        rho = np.array([0.0, 0.5, 1.0])
        theta = np.array([0.0, np.pi / 4, np.pi])
        result = zernike_polynomial(0, 0, rho, theta)
        np.testing.assert_allclose(result, 1.0)

    def test_defocus_at_origin(self):
        from rayoptics_web_utils.zernike import zernike_polynomial
        rho = np.array([0.0])
        theta = np.array([0.0])
        result = zernike_polynomial(2, 0, rho, theta)
        # Unnormalized: R_2^0(0) = 2*0^2 - 1 = -1 (no sqrt(3) factor)
        np.testing.assert_allclose(result, -1.0)

    def test_negative_azimuthal_order_uses_positive_sine_argument(self):
        from rayoptics_web_utils.zernike import zernike_polynomial

        result = zernike_polynomial(
            2,
            -2,
            np.array([0.5]),
            np.array([np.pi / 4]),
        )

        assert result == pytest.approx([0.5**2])

    def test_orthogonality(self):
        """Numerical check: integral of Z_i * Z_j over unit disk ≈ pi * delta_ij."""
        from rayoptics_web_utils.zernike import zernike_polynomial
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

        # Check defocus and oblique astigmatism are orthogonal
        z4 = zernike_polynomial(2, 0, rho_m, theta_m)
        z5 = zernike_polynomial(2, -2, rho_m, theta_m)
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
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)

        # Build synthetic OPD grid with pure defocus (Z4)
        coeff_z4 = 1.5
        opd = coeff_z4 * zernike_polynomial(2, 0, rho, theta)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, NOLL_TERMS_22[:11])

        assert abs(coeffs[3] - coeff_z4) < 0.01, f"Z4 = {coeffs[3]}, expected {coeff_z4}"
        # Other terms should be near zero
        for j in range(11):
            if j != 3:
                assert abs(coeffs[j]) < 0.05, f"Z{j+1} = {coeffs[j]}, expected ~0"

    def test_pure_piston_recovery(self):
        """Pure piston signal should be recovered as Z1 only."""
        from rayoptics_web_utils.zernike import fit_zernike
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)

        coeff_z1 = 2.0
        opd = np.full_like(rho, coeff_z1)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, NOLL_TERMS_22[:11])

        assert abs(coeffs[0] - coeff_z1) < 0.01, f"Z1 = {coeffs[0]}, expected {coeff_z1}"
        for j in range(1, 11):
            assert abs(coeffs[j]) < 0.05, f"Z{j+1} = {coeffs[j]}, expected ~0"

    def test_mixed_round_trip(self):
        """Mixed Z1 + Z4 + Z11 should be recovered."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial
        N = 65
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)

        target = {1: 0.5, 4: 1.0, 11: -0.3}
        opd = np.zeros_like(rho)
        for j, c in target.items():
            n, m = NOLL_TERMS_22[j - 1]
            opd += c * zernike_polynomial(n, m, rho, theta)
        opd[rho > 1.0] = np.nan

        grid = np.array([xx, yy, opd])
        coeffs = fit_zernike(grid, NOLL_TERMS_22)

        for j, c in target.items():
            assert abs(coeffs[j - 1] - c) < 0.02, f"Z{j} = {coeffs[j-1]}, expected {c}"

    def test_weighted_nonuniform_samples_recover_known_mixture(self):
        """Projected-area weights are applied through weighted least squares."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial

        x = np.array([-0.8, -0.55, -0.1, 0.2, 0.65, 0.9])
        y = np.array([-0.7, -0.35, 0.05, 0.4, 0.75])
        xx, yy = np.meshgrid(x, y)
        rho = np.hypot(xx, yy)
        theta = np.arctan2(yy, xx)
        terms = [(2, 0), (0, 0), (1, 1), (2, -2)]
        target = np.array([0.7, -0.2, 0.35, -0.45])
        opd = sum(
            coefficient * zernike_polynomial(n, m, rho, theta)
            for coefficient, (n, m) in zip(target, terms, strict=True)
        )
        opd[rho > 1.0] = np.nan
        weights = 0.2 + (xx + 1.0) ** 2 + 0.3 * (yy + 1.0)
        weights[rho > 1.0] = 0.0

        result = fit_zernike(np.array([xx, yy, opd]), terms, weights=weights)

        np.testing.assert_allclose(result, target, atol=1.0e-11)

    @pytest.mark.parametrize(
        "terms, message",
        [
            ([(0, 0), (2, 1)], "parity"),
            ([(0, 0), (1, 2)], "azimuthal"),
            ([(0, 0), (0, 0)], "duplicate"),
        ],
    )
    def test_invalid_term_contract_is_rejected(self, terms, message):
        from rayoptics_web_utils.zernike import fit_zernike

        axis = np.linspace(-1.0, 1.0, 5)
        xx, yy = np.meshgrid(axis, axis)
        opd = np.zeros_like(xx)
        opd[np.hypot(xx, yy) > 1.0] = np.nan

        with pytest.raises(ValueError, match=message):
            fit_zernike(np.array([xx, yy, opd]), terms)

    def test_empty_term_list_has_an_exact_validation_error(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.zeros((3, 2, 2))

        with pytest.raises(ValueError, match=r"^At least one Zernike term is required\.$"):
            fit_zernike(grid, [])

    @pytest.mark.parametrize(
        "terms",
        [
            [np.array([0, 0])],
            [[0]],
            ["00"],
        ],
    )
    def test_rejects_non_pair_term_sequences_with_an_exact_error(self, terms):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.zeros((3, 2, 2))

        with pytest.raises(
            ValueError,
            match=r"^Each Zernike term must be a two-item \(n, m\) pair\.$",
        ):
            fit_zernike(grid, terms)

    @pytest.mark.parametrize(
        "terms",
        [
            [(-1, 0)],
            [(0.5, 0)],
            [(0, 0.5)],
            [(True, 0)],
            [(0, False)],
        ],
    )
    def test_rejects_noninteger_or_boolean_orders_with_an_exact_error(self, terms):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.zeros((3, 2, 2))

        with pytest.raises(
            ValueError,
            match=r"^Zernike radial and azimuthal orders must be valid integers\.$",
        ):
            fit_zernike(grid, terms)

    def test_rejects_duplicate_terms_with_an_exact_error(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError, match=r"^Zernike terms must not contain duplicate entries\.$"
        ):
            fit_zernike(np.zeros((3, 2, 2)), [(0, 0), (0, 0)])

    def test_rejects_azimuthal_order_larger_than_radial_order_exactly(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError,
            match=r"^Zernike azimuthal order must not exceed radial order\.$",
        ):
            fit_zernike(np.zeros((3, 2, 2)), [(1, 2)])

    def test_rejects_odd_radial_azimuthal_parity_exactly(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError,
            match=r"^Zernike radial and azimuthal orders must have even parity\.$",
        ):
            fit_zernike(np.zeros((3, 2, 2)), [(2, 1)])

    def test_rejects_invalid_grid_shape_with_an_exact_error(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError,
            match=r"^OPD grid must have a leading coordinate dimension of length 3\.$",
        ):
            fit_zernike(np.zeros((2, 2, 2)), [(0, 0)])

    def test_rejects_mismatched_weights_with_an_exact_error(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError, match=r"^Zernike weights must match the OPD sample shape\.$"
        ):
            fit_zernike(np.zeros((3, 2, 2)), [(0, 0)], weights=np.ones((2, 1)))

    def test_rejects_finite_opd_with_nonfinite_coordinates_exactly(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.zeros((3, 2, 2))
        grid[0, 0, 0] = np.nan

        with pytest.raises(
            ValueError,
            match=r"^Finite OPD samples require finite pupil coordinates\.$",
        ):
            fit_zernike(grid, [(0, 0)])

    def test_rejects_finite_opd_with_nonfinite_weights_exactly(self):
        from rayoptics_web_utils.zernike import fit_zernike

        weights = np.ones((2, 2))
        weights[0, 0] = np.nan

        with pytest.raises(
            ValueError,
            match=r"^Finite OPD samples require finite quadrature weights\.$",
        ):
            fit_zernike(np.zeros((3, 2, 2)), [(0, 0)], weights=weights)

    def test_rejects_samples_outside_the_unit_disk(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.array([[[1.5]], [[0.0]], [[0.25]]])

        with pytest.raises(
            ValueError,
            match=r"^Insufficient valid samples for the requested Zernike terms\.$",
        ):
            fit_zernike(grid, [(0, 0)])

    def test_accepts_a_finite_sample_on_the_unit_disk_boundary(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.array([[[1.0]], [[0.0]], [[0.25]]])

        np.testing.assert_allclose(fit_zernike(grid, [(0, 0)]), [0.25])

    def test_accepts_the_full_coordinate_tolerance_at_the_unit_disk_boundary(self):
        from rayoptics_web_utils.zernike import fit_zernike

        boundary = 1.0 + 1.0e-12
        grid = np.array([[[boundary]], [[0.0]], [[0.25]]])

        np.testing.assert_allclose(fit_zernike(grid, [(0, 0)]), [0.25])

    def test_zero_weight_samples_are_not_valid_samples(self):
        from rayoptics_web_utils.zernike import fit_zernike

        with pytest.raises(
            ValueError,
            match=r"^Insufficient valid samples for the requested Zernike terms\.$",
        ):
            fit_zernike(
                np.array([[[0.0]], [[0.0]], [[0.25]]]),
                [(0, 0)],
                weights=np.zeros((1, 1)),
            )

    def test_fit_residual_rms_uses_nonuniform_weights(self):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        grid = np.array(
            [
                [[0.0, 0.5], [0.0, 0.5]],
                [[0.0, 0.0], [0.5, 0.5]],
                [[0.0, 1.0], [2.0, 4.0]],
            ]
        )
        weights = np.array([[1.0, 1.0], [1.0, 10.0]])

        _, residual_rms, _, _ = _fit_zernike_details(
            grid, [(0, 0)], weights=weights
        )
        mean = np.average(grid[2], weights=weights)
        expected = np.sqrt(np.average((grid[2] - mean) ** 2, weights=weights))

        assert residual_rms == pytest.approx(expected)

    def test_two_dimensional_sample_grid_is_supported(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.array(
            [
                [-0.5, 0.0, 0.5, 0.0],
                [0.0, 0.0, 0.0, 0.5],
                [0.2, 0.2, 0.2, 0.2],
            ]
        )

        np.testing.assert_allclose(fit_zernike(grid, [(0, 0)]), [0.2])

    def test_numeric_text_grid_and_weights_are_coerced_to_float(self):
        from rayoptics_web_utils.zernike import fit_zernike

        grid = np.array(
            [
                ["-0.5", "0.0", "0.5", "0.0"],
                ["0.0", "0.0", "0.0", "0.5"],
                ["0.2", "0.2", "0.2", "0.2"],
            ]
        )
        weights = np.array(["1.0", "2.0", "3.0", "4.0"])

        np.testing.assert_allclose(fit_zernike(grid, [(0, 0)], weights), [0.2])

    def test_negative_quadrature_weight_has_an_exact_error(self):
        from rayoptics_web_utils.zernike import fit_zernike

        axis = np.linspace(-1.0, 1.0, 7)
        xx, yy = np.meshgrid(axis, axis)
        opd = np.zeros_like(xx)
        opd[np.hypot(xx, yy) > 1.0] = np.nan
        weights = np.ones_like(opd)
        weights[3, 3] = -1.0

        with pytest.raises(
            ValueError,
            match=r"^Zernike quadrature weights must not be negative\.$",
        ):
            fit_zernike(np.array([xx, yy, opd]), [(0, 0)], weights)

    def test_lstsq_is_called_with_an_explicit_none_rcond(self, monkeypatch):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        observed = {}

        def fake_lstsq(design, opd, **kwargs):
            observed.update(kwargs)
            return np.array([0.2]), np.array([]), 1, np.array([1.0])

        monkeypatch.setattr(np.linalg, "lstsq", fake_lstsq)
        grid = np.array(
            [
                [-0.5, 0.0, 0.5, 0.0],
                [0.0, 0.0, 0.0, 0.5],
                [0.2, 0.2, 0.2, 0.2],
            ]
        )

        _fit_zernike_details(grid, [(0, 0)])

        assert observed == {"rcond": None}

    def test_nonpositive_final_singular_value_has_an_exact_error(self, monkeypatch):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        monkeypatch.setattr(
            np.linalg,
            "lstsq",
            lambda *args, **kwargs: (
                np.array([0.2]),
                np.array([]),
                1,
                np.array([1.0, 0.0]),
            ),
        )

        with pytest.raises(
            ValueError,
            match=r"^Zernike design matrix has invalid singular values\.$",
        ):
            _fit_zernike_details(
                np.array(
                    [
                        [-0.5, 0.0, 0.5, 0.0],
                        [0.0, 0.0, 0.0, 0.5],
                        [0.2, 0.2, 0.2, 0.2],
                    ]
                ),
                [(0, 0)],
            )

    @pytest.mark.parametrize("singular_values", [[np.nan, 1.0], [1.0e7, 1.0e-7]])
    def test_nonfinite_or_large_condition_has_an_exact_error(
        self, monkeypatch, singular_values
    ):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        monkeypatch.setattr(
            np.linalg,
            "lstsq",
            lambda *args, **kwargs: (
                np.array([0.2]),
                np.array([]),
                1,
                np.array(singular_values),
            ),
        )

        with pytest.raises(
            ValueError,
            match=r"^Zernike design matrix is ill-conditioned \(.*\)\.$",
        ):
            _fit_zernike_details(
                np.array(
                    [
                        [-0.5, 0.0, 0.5, 0.0],
                        [0.0, 0.0, 0.0, 0.5],
                        [0.2, 0.2, 0.2, 0.2],
                    ]
                ),
                [(0, 0)],
            )

    def test_condition_equal_to_limit_is_accepted(self, monkeypatch):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        monkeypatch.setattr(
            np.linalg,
            "lstsq",
            lambda *args, **kwargs: (
                np.array([0.2]),
                np.array([]),
                1,
                np.array([1.0e12, 1.0]),
            ),
        )

        _, _, rank, condition = _fit_zernike_details(
            np.array(
                [
                    [-0.5, 0.0, 0.5, 0.0],
                    [0.0, 0.0, 0.0, 0.5],
                    [0.2, 0.2, 0.2, 0.2],
                ]
            ),
            [(0, 0)],
        )

        assert rank == 1
        assert condition == pytest.approx(1.0e12)

    def test_condition_just_above_limit_is_rejected(self, monkeypatch):
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        monkeypatch.setattr(
            np.linalg,
            "lstsq",
            lambda *args, **kwargs: (
                np.array([0.2]),
                np.array([]),
                1,
                np.array([1.0e12 + 0.5, 1.0]),
            ),
        )

        with pytest.raises(
            ValueError,
            match=r"^Zernike design matrix is ill-conditioned \(1\.000e\+12\)\.$",
        ):
            _fit_zernike_details(
                np.array(
                    [
                        [-0.5, 0.0, 0.5, 0.0],
                        [0.0, 0.0, 0.0, 0.5],
                        [0.2, 0.2, 0.2, 0.2],
                    ]
                ),
                [(0, 0)],
            )


class TestMonochromaticStrehl:
    """Test weighted coherent intensity and invalid-sample handling."""

    def test_weighted_phase_average_changes_the_coherent_intensity(self):
        from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl

        assert _monochromatic_strehl([0.0, 0.5], [3.0, 1.0]) == pytest.approx(0.25)

    def test_zero_weights_are_excluded_from_the_phase_average(self):
        from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl

        assert _monochromatic_strehl([0.0], [0.0]) == 0.0

    def test_no_finite_positive_weighted_samples_return_zero(self):
        from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl

        assert _monochromatic_strehl([np.nan], [1.0]) == 0.0

    def test_weight_shape_mismatch_has_an_exact_error(self):
        from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl

        with pytest.raises(ValueError, match=r"^Strehl weights must match OPD samples\.$"):
            _monochromatic_strehl([0.0, 0.5], [1.0])

    def test_numeric_text_opd_and_weights_are_coerced_to_float(self):
        from rayoptics_web_utils.zernike.zernike import _monochromatic_strehl

        assert _monochromatic_strehl(["0.0", "0.5"], ["3.0", "1.0"]) == pytest.approx(
            0.25
        )

    def test_rank_deficient_fit_is_rejected(self):
        from rayoptics_web_utils.zernike import fit_zernike

        x = np.linspace(-1.0, 1.0, 7)
        grid = np.array([x[None, :], np.zeros((1, 7)), np.zeros((1, 7))])

        with pytest.raises(ValueError, match="rank"):
            fit_zernike(grid, [(0, 0), (1, 1), (1, -1)])

    def test_negative_quadrature_weight_is_rejected(self):
        from rayoptics_web_utils.zernike import fit_zernike

        axis = np.linspace(-1.0, 1.0, 7)
        xx, yy = np.meshgrid(axis, axis)
        opd = np.zeros_like(xx)
        opd[np.hypot(xx, yy) > 1.0] = np.nan
        weights = np.ones_like(opd)
        weights[3, 3] = -1.0

        with pytest.raises(ValueError, match="negative"):
            fit_zernike(np.array([xx, yy, opd]), [(0, 0)], weights)

    def test_json_decoded_term_pairs_are_accepted(self):
        from rayoptics_web_utils.zernike import fit_zernike

        axis = np.linspace(-1.0, 1.0, 7)
        xx, yy = np.meshgrid(axis, axis)
        opd = np.full_like(xx, 0.4)
        opd[np.hypot(xx, yy) > 1.0] = np.nan

        coefficients = fit_zernike(np.array([xx, yy, opd]), [[0, 0]])

        assert coefficients == pytest.approx([0.4])

    def test_rotation_covariance_preserves_sine_cosine_pair_norm(self):
        """Rotating pupil axes mixes a mode pair without changing its norm."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial

        axis = np.linspace(-1.0, 1.0, 41)
        xx, yy = np.meshgrid(axis, axis)
        rho = np.hypot(xx, yy)
        theta = np.arctan2(yy, xx)
        cosine_coefficient = 0.7
        sine_coefficient = -0.35
        opd = (
            cosine_coefficient * zernike_polynomial(2, 2, rho, theta)
            + sine_coefficient * zernike_polynomial(2, -2, rho, theta)
        )
        opd[rho > 1.0] = np.nan
        rotation = np.deg2rad(23.0)
        rotated_x = np.cos(rotation) * xx + np.sin(rotation) * yy
        rotated_y = -np.sin(rotation) * xx + np.cos(rotation) * yy

        original = fit_zernike(
            np.array([xx, yy, opd]), [(2, 2), (2, -2)]
        )
        rotated = fit_zernike(
            np.array([rotated_x, rotated_y, opd]), [(2, 2), (2, -2)]
        )

        assert np.linalg.norm(rotated) == pytest.approx(
            np.linalg.norm(original), abs=1.0e-12
        )


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
        result = unnormalized_to_rms_normalized(coeffs, NOLL_TERMS_22[:5])
        assert abs(result[3] - 1.5 / np.sqrt(3)) < 1e-12

    def test_all_zeros(self):
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0] * 5
        result = unnormalized_to_rms_normalized(coeffs, NOLL_TERMS_22[:5])
        assert all(c == 0.0 for c in result)

    def test_piston_unchanged(self):
        """Piston N=1.0, so value is unchanged."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [2.5, 0.0, 0.0, 0.0, 0.0]
        result = unnormalized_to_rms_normalized(coeffs, NOLL_TERMS_22[:5])
        assert abs(result[0] - 2.5) < 1e-12

    def test_rejects_mismatched_coefficient_and_term_lengths(self):
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized

        with pytest.raises(ValueError, match="same length"):
            unnormalized_to_rms_normalized([1.0], [(0, 0), (1, 1)])


class TestGetZernikeCoefficients:
    """Integration tests with Cooke Triplet model."""

    def test_scale_opd_grid_to_wavelength_uses_system_unit_wavelength_conversion(self):
        """OPD-only scaling should use OpticalModel wavelength unit conversion."""
        from rayoptics_web_utils.zernike.zernike import _scale_opd_grid_to_wavelength

        class FakeSpectralRegion:
            central_wvl = 500.0

        class FakeOpticalModel:
            def __init__(self):
                self.converted_wavelengths = []

            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": FakeSpectralRegion()}
                raise KeyError(key)

            def nm_to_sys_units(self, wavelength_nm):
                self.converted_wavelengths.append(float(wavelength_nm))
                return float(wavelength_nm) + 100.0

        opm = FakeOpticalModel()
        opd_grid = np.array([[2.0, np.nan]])

        result = _scale_opd_grid_to_wavelength(opd_grid, opm, wavelength_nm=1000.0)

        assert opm.converted_wavelengths == [500.0, 1000.0]
        expected = np.array([[2.0 * 600.0 / 1100.0, np.nan]], dtype=float)
        np.testing.assert_allclose(result, expected, equal_nan=True)
        assert result is not opd_grid

    def test_finite_eic_grid_is_rejected_as_final_pupil_coordinates(self):
        """Finite Hopkins p_coord intermediates cannot enter Zernike fitting."""
        from rayoptics_web_utils.zernike.zernike import _extract_exit_pupil_grid

        class FakeSpectralRegion:
            central_wvl = 500.0

        class FakeOpticalModel:
            def __init__(self):
                self.converted_wavelengths = []

            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": FakeSpectralRegion()}
                if key == "analysis_results":
                    return {"parax_data": type("FakeParaxData", (), {"fod": type("FakeFod", (), {"exp_radius": 1.0})()})()}
                raise KeyError(key)

            def nm_to_sys_units(self, wavelength_nm):
                self.converted_wavelengths.append(float(wavelength_nm))
                return float(wavelength_nm) + 100.0

        class FakeRayGrid:
            grid = np.array([[[0.0]], [[0.0]], [[2.0]]])
            grid_pkg = (None, [[(0.0, (0.5, 0.0), None, None)]])

        opm = FakeOpticalModel()

        with pytest.raises(ValueError, match="projected-pupil sample contract"):
            _extract_exit_pupil_grid(FakeRayGrid(), opm, wavelength_nm=1000.0)

        assert opm.converted_wavelengths == []

    def test_afocal_grid_keeps_normalized_coordinates_and_scales_only_opd(self):
        """Afocal coordinates should pass through while OPD changes wavelength."""
        from rayoptics_web_utils.zernike.zernike import _extract_exit_pupil_grid

        class FakeSpectralRegion:
            central_wvl = 500.0

        class FakeOpticalModel:
            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": FakeSpectralRegion()}
                raise KeyError(key)

            def nm_to_sys_units(self, wavelength_nm):
                return float(wavelength_nm) + 100.0

        class FakeAfocalRayGrid:
            grid = np.array(
                [
                    [[-1.0, 0.25]],
                    [[0.5, -0.75]],
                    [[2.0, np.nan]],
                ]
            )

        grid = _extract_exit_pupil_grid(
            FakeAfocalRayGrid(), FakeOpticalModel(), wavelength_nm=1000.0
        )

        np.testing.assert_allclose(grid[0], FakeAfocalRayGrid.grid[0])
        np.testing.assert_allclose(grid[1], FakeAfocalRayGrid.grid[1])
        np.testing.assert_allclose(
            grid[2],
            np.array([[2.0 * 600.0 / 1100.0, np.nan]]),
            equal_nan=True,
        )

    def test_afocal_grid_without_grid_pkg_returns_all_terms_and_finite_metrics(
        self, afocal_two_lens
    ):
        """A fully transmitted afocal disk fits terms and reports full coverage."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        wavelength_nm = afocal_two_lens["optical_spec"]["wvls"].wavelengths[1]
        ray_grid = make_ray_grid(
            afocal_two_lens,
            fi=0,
            wavelength_nm=wavelength_nm,
            num_rays=11,
        )

        assert not hasattr(ray_grid, "grid_pkg")

        result = get_zernike_coefficients(
            afocal_two_lens,
            field_index=0,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
            num_rays=11,
        )

        assert result["num_terms"] == len(NOLL_TERMS_22)
        assert len(result["coefficients"]) == len(NOLL_TERMS_22)
        assert len(result["rms_normalized_coefficients"]) == len(NOLL_TERMS_22)
        assert np.all(np.isfinite(result["coefficients"]))
        assert np.all(np.isfinite(result["rms_normalized_coefficients"]))
        assert np.all(
            np.isfinite(
                [result["rms_wfe"], result["pv_wfe"], result["strehl_ratio"]]
            )
        )
        assert result["reference_kind"] == "afocal_plane_wave"
        assert result["pupil_space"] == "entrance"
        assert result["sampling_measure"] == "uniform_normalized_input_pupil_cells"
        assert result["support_coverage"] == pytest.approx(1.0)

    def test_afocal_coverage_counts_blocked_disk_samples(self, afocal_two_lens, monkeypatch):
        """Coverage excludes square corners but retains blocked disk cells."""
        from types import SimpleNamespace
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        axis = np.linspace(-1, 1, 5)
        xx, yy = np.meshgrid(axis, axis)
        opd = np.zeros_like(xx)
        opd[2, 2] = np.nan
        monkeypatch.setattr(
            "rayoptics_web_utils.raygrid.make_ray_grid",
            lambda *args, **kwargs: SimpleNamespace(grid=np.array([xx, yy, opd])),
        )
        result = get_zernike_coefficients(afocal_two_lens, 0, 1, [(0, 0)])
        assert result["support_coverage"] == pytest.approx(12 / 13)

    def test_finite_centroid_returns_all_terms_and_finite_metrics(
        self, cooke_triplet
    ):
        """Finite centroid grids should expose exit-pupil data to Zernike fitting."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        result = get_zernike_coefficients(
            cooke_triplet,
            field_index=1,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
            image_point="centroid",
            num_rays=11,
        )

        assert result["num_terms"] == len(NOLL_TERMS_22)
        assert len(result["coefficients"]) == len(NOLL_TERMS_22)
        assert len(result["rms_normalized_coefficients"]) == len(NOLL_TERMS_22)
        assert np.all(np.isfinite(result["coefficients"]))
        assert np.all(np.isfinite(result["rms_normalized_coefficients"]))
        assert np.all(
            np.isfinite(
                [result["rms_wfe"], result["pv_wfe"], result["strehl_ratio"]]
            )
        )

    def test_returns_dict_with_expected_keys(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        import inspect

        sig = inspect.signature(get_zernike_coefficients)
        assert list(sig.parameters.keys()) == [
            "opm",
            "field_index",
            "wvl_index",
            "zernike_terms",
            "image_point",
            "num_rays",
            "pupil_space",
        ]
        assert sig.parameters["image_point"].default == "chief_ray"
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert isinstance(result, dict)
        for key in ['coefficients', 'rms_wfe', 'pv_wfe', 'num_terms', 'field_index', 'wavelength_nm']:
            assert key in result, f"Missing key: {key}"
        assert result["pupil_space"] == "entrance"
        assert result["sampling_measure"] == "uniform_normalized_input_pupil_cells"
        assert result["normalization"] == "normalized_input_pupil"
        assert result["normalization_radius"] == 1.0
        assert "reference_radius" not in result

    def test_invalid_pupil_space_is_rejected(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        with pytest.raises(ValueError, match="entrance.*exit"):
            get_zernike_coefficients(
                cooke_triplet, 0, 1, [(0, 0)], pupil_space="object"
            )

    def test_afocal_exit_pupil_space_is_rejected(self, afocal_two_lens):
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        with pytest.raises(ValueError, match="infinite image space"):
            get_zernike_coefficients(
                afocal_two_lens, 0, 1, [(0, 0)], pupil_space="exit"
            )

    def test_finite_result_reports_explicit_sampling_contract(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        result = get_zernike_coefficients(
            cooke_triplet,
            field_index=1,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
            num_rays=13,
            pupil_space="exit",
        )

        assert result["sampling_measure"] == "projected_reference_sphere_area"
        assert result["normalization"] == "chief_ray_centered_enclosing_circle"
        assert result["reference_kind"] == "finite_reference_sphere"
        assert result["reference_length_unit"] == "mm"
        assert result["reference_radius"] > 0.0
        assert result["normalization_radius"] > 0.0
        assert 0.0 < result["support_coverage"] <= 1.0
        assert result["support_area"] > 0.0
        assert result["sample_count"] >= len(NOLL_TERMS_22)
        assert result["fit_rank"] == len(NOLL_TERMS_22)
        assert np.isfinite(result["condition_number"])
        assert result["fit_residual_rms"] >= 0.0
        assert result["boundary_resolution"] >= 13
        assert isinstance(result["boundary_converged"], bool)

    def test_offset_clipped_pupil_preserves_partial_support(
        self, sasian_triplet_autoaperture
    ):
        """An offset aperture remains partial support inside the enclosing disk."""
        from rayoptics.elem.surface import Circular
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        stop = sasian_triplet_autoaperture.seq_model.stop_surface
        sasian_triplet_autoaperture.seq_model.ifcs[stop].clear_apertures = [
            Circular(radius=1.5, x_offset=0.3)
        ]
        result = get_zernike_coefficients(
            sasian_triplet_autoaperture,
            field_index=0,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22[:6],
            num_rays=9,
            pupil_space="exit",
        )

        assert result["sample_count"] >= len(NOLL_TERMS_22[:6])
        assert 0.0 < result["support_coverage"] < 0.7
        assert result["support_area"] < (
            np.pi * result["normalization_radius"] ** 2
        )

    def test_metrics_do_not_depend_on_requested_term_list(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        short = get_zernike_coefficients(
            cooke_triplet,
            field_index=0,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22[:6],
            num_rays=13,
        )
        long = get_zernike_coefficients(
            cooke_triplet,
            field_index=0,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
            num_rays=13,
        )

        assert short["rms_wfe"] == pytest.approx(long["rms_wfe"], abs=1.0e-12)
        assert short["pv_wfe"] == pytest.approx(long["pv_wfe"], abs=1.0e-12)
        assert short["weighted_mean_wfe"] == pytest.approx(
            long["weighted_mean_wfe"], abs=1.0e-12
        )
        assert short["fit_residual_rms"] >= long["fit_residual_rms"]

    def test_piston_location_does_not_change_sampled_metrics(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        piston_first = get_zernike_coefficients(
            cooke_triplet,
            field_index=0,
            wvl_index=1,
            zernike_terms=[(0, 0), (1, 1), (1, -1), (2, 0)],
            num_rays=13,
        )
        piston_last = get_zernike_coefficients(
            cooke_triplet,
            field_index=0,
            wvl_index=1,
            zernike_terms=[(1, 1), (1, -1), (2, 0), (0, 0)],
            num_rays=13,
        )

        assert piston_first["rms_wfe"] == pytest.approx(
            piston_last["rms_wfe"], abs=1.0e-12
        )
        assert piston_first["weighted_mean_wfe"] == pytest.approx(
            piston_last["weighted_mean_wfe"], abs=1.0e-12
        )
        assert piston_first["coefficients"][0] == pytest.approx(
            piston_last["coefficients"][3], abs=1.0e-12
        )

    def test_coefficients_is_list_of_float(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert isinstance(result['coefficients'], list)
        assert all(isinstance(c, float) for c in result['coefficients'])

    def test_json_serializable(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        json_str = json.dumps(result)
        assert isinstance(json_str, str)

    def test_on_axis_z11_dominant_higher_order(self, cooke_triplet):
        """On-axis, d-line: Z11 (primary spherical) should be the dominant higher-order term."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        coeffs = result['coefficients']
        # Higher-order terms are j=5 onward (index 4+)
        higher_order = [(j + 1, abs(c)) for j, c in enumerate(coeffs) if j >= 4]
        dominant = max(higher_order, key=lambda x: x[1])
        assert dominant[0] == 11, f"Expected Z11 dominant, got Z{dominant[0]}"

    def test_on_axis_no_coma_astigmatism(self, cooke_triplet):
        """On-axis: rotational symmetry means Z5,Z6,Z7,Z8 ≈ 0."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        coeffs = result['coefficients']
        for j in [5, 6, 7, 8]:
            assert abs(coeffs[j - 1]) < 0.02, f"Z{j} = {coeffs[j-1]}, expected ~0 on-axis"

    def test_off_axis_astigmatism_significant(self, cooke_triplet):
        """Off-axis field 1: Z6 (astigmatism cos2θ) should be significant."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=1, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        coeffs = result['coefficients']
        # With corrected Noll: Z6=(2,+2)=cos(2θ), the dominant astigmatism for y-meridian field
        assert abs(coeffs[5]) > 0.1, f"Z6 = {coeffs[5]}, expected significant off-axis"

    def test_rms_and_pv_positive(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert result['rms_wfe'] > 0
        assert result['pv_wfe'] >= result['rms_wfe']

    def test_rms_wfe_excludes_piston(self, cooke_triplet):
        """rms_wfe must not include piston contribution.

        On-axis Cooke Triplet has Z1 piston ≈ 0.568 waves.
        rms_wfe including piston ≈ 0.73 waves.
        rms_wfe excluding piston must be significantly smaller.
        """
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        piston = result['coefficients'][0]
        assert abs(piston) > 0.3, f"Expected significant piston, got {piston}"
        # With piston included, rms ≈ 0.73. Without piston it must be lower.
        assert result['rms_wfe'] < 0.65, (
            f"rms_wfe = {result['rms_wfe']} still includes piston contribution"
        )

    def test_on_axis_rms_approx(self, cooke_triplet):
        """On-axis RMS ≈ 0.46 waves (piston-excluded, within ±0.1)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert abs(result['rms_wfe'] - 0.46) < 0.1, f"RMS = {result['rms_wfe']}, expected ~0.46"

    def test_strehl_ratio_in_result(self, cooke_triplet):
        """strehl_ratio key exists and is a float."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert 'strehl_ratio' in result, "Missing key: strehl_ratio"
        assert isinstance(result['strehl_ratio'], float)

    def test_strehl_ratio_range(self, cooke_triplet):
        """Strehl ratio must be between 0.0 and 1.0."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert 0.0 <= result['strehl_ratio'] <= 1.0, f"Strehl = {result['strehl_ratio']}, out of range"

    def test_on_axis_strehl_approx(self, cooke_triplet):
        """On-axis d-line Strehl ≈ 0.096 (from spec: 0.0963, within ±0.02)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert abs(result['strehl_ratio'] - 0.096) < 0.02, (
            f"Strehl = {result['strehl_ratio']}, expected ~0.096"
        )

    def test_strehl_decreases_off_axis(self, cooke_triplet):
        """On-axis Strehl > full-field Strehl (system degrades with field)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        on_axis = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        full_field = get_zernike_coefficients(cooke_triplet, field_index=2, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert on_axis['strehl_ratio'] > full_field['strehl_ratio'], (
            f"On-axis Strehl ({on_axis['strehl_ratio']}) should be > "
            f"full-field Strehl ({full_field['strehl_ratio']})"
        )

    def test_wavelength_correction(self, cooke_triplet):
        """Coefficients should be in waves at the traced wavelength, not central."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        f_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=0, zernike_terms=NOLL_TERMS_22)
        d_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        c_line = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=2, zernike_terms=NOLL_TERMS_22)
        # Physical OPD (coeff * wavelength) should be in the same ballpark
        phys_f = abs(f_line['coefficients'][10]) * f_line['wavelength_nm']
        phys_d = abs(d_line['coefficients'][10]) * d_line['wavelength_nm']
        phys_c = abs(c_line['coefficients'][10]) * c_line['wavelength_nm']
        assert 0.3 < phys_f / phys_d < 3.0, f"phys F/d = {phys_f/phys_d}, expected ~similar"
        assert 0.3 < phys_c / phys_d < 3.0, f"phys C/d = {phys_c/phys_d}, expected ~similar"
        # Verify F-line Z11 ≈ 0.118 (known corrected value)
        assert abs(f_line['coefficients'][10] - 0.118) < 0.02, (
            f"Z11 F-line = {f_line['coefficients'][10]}, expected ~0.118"
        )

    def test_coefficients_are_unnormalized(self, cooke_triplet):
        """On-axis d-line coefficients should match known values (unnormalized)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        coeffs = result['coefficients']
        assert abs(coeffs[0] - 0.568) < 0.1, f"Z1 piston = {coeffs[0]}, expected ~0.568"
        assert abs(coeffs[3] - 0.788) < 0.1, f"Z4 defocus = {coeffs[3]}, expected ~0.788"

    def test_full_field_projected_pupil_has_finite_nontrivial_aberration(
        self, cooke_triplet
    ):
        """Physical projected coordinates retain a nontrivial full-field fit."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        result = get_zernike_coefficients(
            cooke_triplet,
            field_index=2,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
            pupil_space="exit",
        )

        assert np.all(np.isfinite(result["coefficients"]))
        assert np.linalg.norm(result["coefficients"][4:]) > 0.1
        assert result["sampling_measure"] == "projected_reference_sphere_area"

    def test_rms_normalized_key_exists(self, cooke_triplet):
        """rms_normalized_coefficients key exists and is list[float]."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert 'rms_normalized_coefficients' in result
        assert isinstance(result['rms_normalized_coefficients'], list)
        assert all(isinstance(c, float) for c in result['rms_normalized_coefficients'])

    def test_rms_normalized_length(self, cooke_triplet):
        """rms_normalized_coefficients length matches num_terms."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert len(result['rms_normalized_coefficients']) == result['num_terms']

    def test_rms_normalized_consistency(self, cooke_triplet):
        """rms_normalized[j-1] * N_n^m ≈ coefficients[j-1] for each j."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients, noll_norm_factor
        result = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        coeffs = result['coefficients']
        rms = result['rms_normalized_coefficients']
        for j in range(1, result['num_terms'] + 1):
            n, m = NOLL_TERMS_22[j - 1]
            reconstructed = rms[j - 1] * noll_norm_factor(n, abs(m))
            assert abs(reconstructed - coeffs[j - 1]) < 1e-10, (
                f"Z{j}: rms*N = {reconstructed}, coeff = {coeffs[j-1]}"
            )

    def test_raygrid_checks_apertures_without_reapplying_vignetting(
        self, cooke_triplet, monkeypatch
    ):
        """RayGrid checks apertures but does not transform its vignetted box twice."""
        import rayoptics_web_utils.raygrid.opd_reference as reference_module
        from rayoptics_web_utils.zernike import get_zernike_coefficients

        captured_kwargs: dict = {}
        original_trace = reference_module.trace_ray_grid

        def capturing_trace(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return original_trace(*args, **kwargs)

        monkeypatch.setattr(reference_module, "trace_ray_grid", capturing_trace)
        get_zernike_coefficients(
            cooke_triplet,
            field_index=0,
            wvl_index=1,
            zernike_terms=NOLL_TERMS_22,
        )

        assert captured_kwargs.get('check_apertures') is True, (
            f"Expected check_apertures=True, got {captured_kwargs.get('check_apertures')}"
        )
        assert captured_kwargs.get('apply_vignetting') is False, (
            f"Expected apply_vignetting=False, got {captured_kwargs.get('apply_vignetting')}"
        )


class TestFitZernikeExplicitFringeTerms:
    """Test fit_zernike with caller-provided Fringe terms."""

    def _make_grid(self, opd_func, N=65):
        x = np.linspace(-1, 1, N)
        xx, yy = np.meshgrid(x, x)
        rho = np.sqrt(xx**2 + yy**2)
        theta = np.arctan2(yy, xx)
        opd = opd_func(rho, theta)
        opd[rho > 1.0] = np.nan
        return np.array([xx, yy, opd])

    def test_pure_defocus_recovered_at_fringe_j4(self):
        """Pure defocus (Fringe j=4 = (2,0)) should appear at index 3."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial
        coeff = 1.5
        grid = self._make_grid(lambda r, t: coeff * zernike_polynomial(2, 0, r, t))
        coeffs = fit_zernike(grid, FRINGE_TERMS_28[:16])
        assert abs(coeffs[3] - coeff) < 0.01, f"Fringe Z4={coeffs[3]}, expected {coeff}"
        for j in range(16):
            if j != 3:
                assert abs(coeffs[j]) < 0.05, f"Fringe Z{j+1}={coeffs[j]}, expected ~0"

    def test_pure_cos_astigmatism_recovered_at_fringe_j5(self):
        """Pure (2,+2) cos-astigmatism should appear at Fringe j=5 (index 4), not j=6."""
        from rayoptics_web_utils.zernike import fit_zernike, zernike_polynomial
        coeff = 1.0
        grid = self._make_grid(lambda r, t: coeff * zernike_polynomial(2, 2, r, t))
        coeffs = fit_zernike(grid, FRINGE_TERMS_28[:16])
        assert abs(coeffs[4] - coeff) < 0.01, f"Fringe Z5={coeffs[4]}, expected {coeff}"
        assert abs(coeffs[5]) < 0.05, f"Fringe Z6={coeffs[5]}, expected ~0"


class TestUnnormalizedToRmsNormalizedExplicitTerms:
    """Test unnormalized_to_rms_normalized with explicit terms."""

    def test_defocus_j4_same_for_both_term_lists(self):
        """Fringe j=4 and Noll j=4 both map to (2,0): norm factor is identical."""
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0, 0.0, 0.0, 1.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        fringe_rms = unnormalized_to_rms_normalized(coeffs, FRINGE_TERMS_28[:11])
        noll_rms = unnormalized_to_rms_normalized(coeffs, NOLL_TERMS_22[:11])
        assert abs(fringe_rms[3] - noll_rms[3]) < 1e-12

    def test_j9_gives_different_norm_factor_fringe_vs_noll_terms(self):
        """Fringe j=9=(4,0) N=sqrt(5); Noll j=9=(3,-3) N=sqrt(8). Results differ."""
        import math
        from rayoptics_web_utils.zernike import unnormalized_to_rms_normalized
        coeffs = [0.0] * 11
        coeffs[8] = 1.0
        fringe_rms = unnormalized_to_rms_normalized(coeffs, FRINGE_TERMS_28[:11])
        noll_rms = unnormalized_to_rms_normalized(coeffs, NOLL_TERMS_22[:11])
        assert abs(fringe_rms[8] - 1.0 / math.sqrt(5)) < 1e-12
        assert abs(noll_rms[8] - 1.0 / math.sqrt(8)) < 1e-12
        assert abs(fringe_rms[8] - noll_rms[8]) > 0.01


class TestGetZernikeCoefficientsExplicitFringeTerms:
    """Integration tests for get_zernike_coefficients with caller-provided Fringe terms."""

    def test_on_axis_fringe_j4_approx_noll_j4_defocus(self, cooke_triplet):
        """Both orderings share j=4=(2,0); values must be near-identical on-axis."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, zernike_terms=FRINGE_TERMS_28
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert abs(fringe['coefficients'][3] - noll['coefficients'][3]) < 0.05

    def test_on_axis_fringe_j9_approx_noll_j11_primary_spherical(self, cooke_triplet):
        """Fringe j=9=(4,0) and Noll j=11=(4,0): same polynomial, coefficients agree."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, zernike_terms=FRINGE_TERMS_28
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=0, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert abs(fringe['coefficients'][8] - noll['coefficients'][10]) < 0.05

    def test_off_axis_fringe_j5_differs_from_noll_j5(self, cooke_triplet):
        """Fringe j=5=(2,+2) vs Noll j=5=(2,-2): different astigmatism components."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        fringe = get_zernike_coefficients(
            cooke_triplet, field_index=1, wvl_index=1, zernike_terms=FRINGE_TERMS_28
        )
        noll = get_zernike_coefficients(cooke_triplet, field_index=1, wvl_index=1, zernike_terms=NOLL_TERMS_22)
        assert abs(fringe['coefficients'][4] - noll['coefficients'][4]) > 0.05

    def test_json_serializable_fringe(self, cooke_triplet):
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            cooke_triplet, field_index=0, wvl_index=1, zernike_terms=FRINGE_TERMS_28
        )
        assert isinstance(json.dumps(result), str)


class TestTiltedSystemZernike:
    """Tests for Zernike analysis on tilted Houghton-Herschel system."""

    def test_on_axis_pv_wfe_reasonable(self, tilted_houghton):
        """P-V WFE should be < 1 wave (known ~0.13 waves at 546nm)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            tilted_houghton, field_index=0, wvl_index=2, zernike_terms=NOLL_TERMS_22,
        )
        assert result['pv_wfe'] < 1.0, (
            f"P-V WFE = {result['pv_wfe']} waves, expected < 1.0"
        )

    def test_on_axis_rms_wfe_reasonable(self, tilted_houghton):
        """RMS WFE should be < 0.5 waves (known ~0.055 waves)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            tilted_houghton, field_index=0, wvl_index=2, zernike_terms=NOLL_TERMS_22,
        )
        assert result['rms_wfe'] < 0.5, (
            f"RMS WFE = {result['rms_wfe']} waves, expected < 0.5"
        )

    def test_on_axis_zernike_coefficients_bounded(self, tilted_houghton):
        """All Zernike coefficients should have |value| < 10 waves."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            tilted_houghton, field_index=0, wvl_index=2, zernike_terms=NOLL_TERMS_22,
        )
        for j, c in enumerate(result['coefficients'], 1):
            assert abs(c) < 10.0, (
                f"Z{j} = {c}, expected |value| < 10 waves"
            )

    def test_on_axis_strehl_ratio_high(self, tilted_houghton):
        """Strehl > 0.9 (known ~0.97, proving the system is well-corrected)."""
        from rayoptics_web_utils.zernike import get_zernike_coefficients
        result = get_zernike_coefficients(
            tilted_houghton, field_index=0, wvl_index=2, zernike_terms=NOLL_TERMS_22,
        )
        assert result['strehl_ratio'] > 0.9, (
            f"Strehl = {result['strehl_ratio']}, expected > 0.9"
        )
