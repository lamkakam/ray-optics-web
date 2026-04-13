"""Tests for rayoptics_web_utils.glass.custom-materials module."""

import math
import pytest

REQUIRED_CaF2_KEYS = {
    "refractive_index_d",
    "refractive_index_e",
    "abbe_number_d",
    "abbe_number_e",
    "partial_dispersions",
    "dispersion_coeff_kind",
    "dispersion_coeffs",
}
PARTIAL_DISPERSION_KEYS = {"P_F_e", "P_F_d", "P_g_F"}


class TestGetCaF2Data:
    """Tests for _get_caf2_data()."""

    @pytest.fixture(scope="class")
    def caf2_data(self):
        from rayoptics_web_utils.glass.custom_materials import _get_caf2_data
        return _get_caf2_data()

    def test_returns_dict_with_required_keys(self, caf2_data):
        assert isinstance(caf2_data, dict)
        assert REQUIRED_CaF2_KEYS == set(caf2_data.keys())

    def test_refractive_index_d_is_float_greater_than_one(self, caf2_data):
        nd = caf2_data["refractive_index_d"]
        assert isinstance(nd, float)
        assert nd > 1.0

    def test_refractive_index_e_is_float_greater_than_one(self, caf2_data):
        ne = caf2_data["refractive_index_e"]
        assert isinstance(ne, float)
        assert ne > 1.0

    def test_abbe_number_d_is_positive_float(self, caf2_data):
        vd = caf2_data["abbe_number_d"]
        assert isinstance(vd, float)
        assert vd > 0.0

    def test_abbe_number_e_is_positive_float(self, caf2_data):
        ve = caf2_data["abbe_number_e"]
        assert isinstance(ve, float)
        assert ve > 0.0

    def test_dispersion_coeff_kind_is_sellmeier3t(self, caf2_data):
        assert caf2_data["dispersion_coeff_kind"] == "Sellmeier3T"

    def test_dispersion_coeffs_has_six_finite_floats(self, caf2_data):
        coeffs = caf2_data["dispersion_coeffs"]
        assert isinstance(coeffs, list)
        assert len(coeffs) == 6
        for i, c in enumerate(coeffs):
            assert isinstance(c, float), f"coeff[{i}] not float"
            assert math.isfinite(c), f"coeff[{i}]={c} not finite"

    def test_partial_dispersions_has_required_keys_with_finite_floats(self, caf2_data):
        pd_data = caf2_data["partial_dispersions"]
        assert isinstance(pd_data, dict)
        assert PARTIAL_DISPERSION_KEYS == set(pd_data.keys())
        for k, v in pd_data.items():
            assert isinstance(v, float), f"{k} not float"
            assert math.isfinite(v), f"{k}={v} not finite"

    # CaF2 (Malitson) known approximate values
    def test_refractive_index_d_approx(self, caf2_data):
        # CaF2 Malitson nd ≈ 1.4338 at d-line (587.6 nm)
        assert abs(caf2_data["refractive_index_d"] - 1.4338) < 0.001

    def test_abbe_number_d_approx(self, caf2_data):
        # CaF2 has very low dispersion, Vd ≈ 95
        assert abs(caf2_data["abbe_number_d"] - 95.0) < 5.0

    def test_dispersion_coeffs_order_is_B1_B2_B3_C1_C2_C3(self, caf2_data):
        # dispersion_coeffs = [B1, B2, B3, C1, C2, C3]
        # C values are SQUARED resonance wavelengths in μm²
        # Per Sellmeier equation:
        #   n²−1 = B1·λ²/(λ²−C1) + B2·λ²/(λ²−C2) + B3·λ²/(λ²−C3)
        coeffs = caf2_data["dispersion_coeffs"]
        B1, B2, B3, C1, C2, C3 = coeffs
        assert abs(B1 - 0.5675888) < 1e-6
        assert abs(B2 - 0.4710914) < 1e-6
        assert abs(B3 - 3.8484723) < 1e-6
        assert abs(C1 - 0.050263605 ** 2) < 1e-7
        assert abs(C2 - 0.1003909 ** 2) < 1e-6
        assert abs(C3 - 34.649040 ** 2) < 1e-4


class TestGetSpecialMaterialsData:
    """Tests for get_special_materials_data()."""

    @pytest.fixture(scope="class")
    def special_data(self):
        from rayoptics_web_utils.glass.custom_materials import get_special_materials_data
        return get_special_materials_data()

    def test_returns_dict_with_special_key(self, special_data):
        assert isinstance(special_data, dict)
        assert "Special" in special_data

    def test_special_catalog_contains_caf2(self, special_data):
        catalog = special_data["Special"]
        assert isinstance(catalog, dict)
        assert "CaF2" in catalog

    def test_caf2_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["CaF2"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())
