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


class TestHelperNaming:
    """Tests for helper names that document supported custom-material formats."""

    def test_uses_formula1_six_coeffs_specific_helper_name(self):
        from rayoptics_web_utils.glass import custom_materials

        assert hasattr(custom_materials, "_build_formula1_six_coeff_special_material_data")
        assert not hasattr(custom_materials, "_build_special_material_data")


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


class TestGetFusedSilicaData:
    """Tests for _get_fused_silica_data()."""

    @pytest.fixture(scope="class")
    def fused_silica_data(self):
        from rayoptics_web_utils.glass.custom_materials import _get_fused_silica_data
        return _get_fused_silica_data()

    def test_returns_dict_with_required_keys(self, fused_silica_data):
        assert isinstance(fused_silica_data, dict)
        assert REQUIRED_CaF2_KEYS == set(fused_silica_data.keys())

    def test_refractive_index_d_approx(self, fused_silica_data):
        assert abs(fused_silica_data["refractive_index_d"] - 1.4585) < 0.001

    def test_abbe_number_d_approx(self, fused_silica_data):
        assert abs(fused_silica_data["abbe_number_d"] - 67.8) < 2.0

    def test_dispersion_coeffs_order_is_B1_B2_B3_C1_C2_C3(self, fused_silica_data):
        coeffs = fused_silica_data["dispersion_coeffs"]
        B1, B2, B3, C1, C2, C3 = coeffs
        assert abs(B1 - 0.6961663) < 1e-7
        assert abs(B2 - 0.4079426) < 1e-7
        assert abs(B3 - 0.8974794) < 1e-7
        assert abs(C1 - 0.0684043 ** 2) < 1e-7
        assert abs(C2 - 0.1162414 ** 2) < 1e-7
        assert abs(C3 - 9.896161 ** 2) < 1e-6


class TestGetWaterData:
    """Tests for _get_water_data()."""

    @pytest.fixture(scope="class")
    def water_data(self):
        from rayoptics_web_utils.glass.custom_materials import _get_water_data
        return _get_water_data()

    def test_returns_dict_with_required_keys(self, water_data):
        assert isinstance(water_data, dict)
        assert REQUIRED_CaF2_KEYS == set(water_data.keys())

    def test_dispersion_coeff_kind_is_sellmeier4t(self, water_data):
        assert water_data["dispersion_coeff_kind"] == "Sellmeier4T"

    def test_dispersion_coeffs_has_eight_finite_floats(self, water_data):
        coeffs = water_data["dispersion_coeffs"]
        assert isinstance(coeffs, list)
        assert len(coeffs) == 8
        for i, c in enumerate(coeffs):
            assert isinstance(c, float), f"coeff[{i}] not float"
            assert math.isfinite(c), f"coeff[{i}]={c} not finite"

    def test_refractive_index_d_approx(self, water_data):
        assert abs(water_data["refractive_index_d"] - 1.3334021391241768) < 1e-9

    def test_abbe_number_d_approx(self, water_data):
        assert abs(water_data["abbe_number_d"] - 55.737679838534845) < 1e-9

    def test_dispersion_coeffs_order_is_b1_b2_b3_b4_c1_c2_c3_c4(self, water_data):
        coeffs = water_data["dispersion_coeffs"]
        B1, B2, B3, B4, C1, C2, C3, C4 = coeffs
        assert abs(B1 - 0.5684027565) < 1e-12
        assert abs(B2 - 0.1726177391) < 1e-12
        assert abs(B3 - 0.02086189578) < 1e-12
        assert abs(B4 - 0.1130748688) < 1e-12
        assert abs(C1 - 0.005101829712) < 1e-12
        assert abs(C2 - 0.01821153936) < 1e-12
        assert abs(C3 - 0.02620722293) < 1e-12
        assert abs(C4 - 10.69792721) < 1e-10


class TestGetSpecialMaterialsData:
    """Tests for get_special_materials_data()."""

    @pytest.fixture(scope="class")
    def special_data(self):
        from rayoptics_web_utils.glass.custom_materials import get_special_materials_data
        return get_special_materials_data()

    def test_returns_dict_with_special_key(self, special_data):
        assert isinstance(special_data, dict)
        assert "Special" in special_data

    def test_special_catalog_contains_expected_entries(self, special_data):
        catalog = special_data["Special"]
        assert isinstance(catalog, dict)
        assert "CaF2" in catalog
        assert "Fused Silica" in catalog
        assert "Water" in catalog

    def test_caf2_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["CaF2"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())

    def test_fused_silica_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["Fused Silica"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())

    def test_water_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["Water"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())
