"""Verify custom-material equations, validation, and generated catalog data."""

import math
from types import SimpleNamespace

import pytest

REQUIRED_CaF2_KEYS = {
    "refractiveIndexD",
    "refractiveIndexE",
    "abbeNumberD",
    "abbeNumberE",
    "partialDispersions",
    "dispersionCoeffKind",
    "dispersionCoeffs",
}
PARTIAL_DISPERSION_KEYS = {"P_fe", "P_Fd", "P_gF"}


def _expected_formula1(coefficients, wavelength):
    """Evaluate Formula 1 independently for use as a test oracle."""
    squared_index = 1.0
    for b_coeff, c_coeff in zip(coefficients[::2], coefficients[1::2]):
        squared_index += b_coeff / (1.0 - c_coeff**2 / wavelength**2)
    return math.sqrt(squared_index)


def _expected_formula2(coefficients, wavelength):
    """Evaluate Formula 2 independently for use as a test oracle."""
    squared_index = 1.0
    for b_coeff, c_coeff in zip(coefficients[::2], coefficients[1::2]):
        squared_index += b_coeff / (1.0 - c_coeff / wavelength**2)
    return math.sqrt(squared_index)


def _synthetic_material(equation_type, coefficients, properties=None):
    """Build the smallest material object consumed by the Sellmeier builder."""
    yaml_data = {
        "DATA": [
            {
                "type": equation_type,
                "coefficients": " ".join(["1", *(str(value) for value in coefficients)]),
            }
        ]
    }
    if properties is not None:
        yaml_data["PROPERTIES"] = properties
    return SimpleNamespace(yaml_data=yaml_data)


class TestSellmeierEquations:
    """Formula 1 and Formula 2 use all coefficient pairs with their own units."""

    @pytest.mark.parametrize(
        ("equation", "coefficients", "expected"),
        [
            (
                "formula 1",
                [0.5, 0.2, 0.25, 0.4],
                math.sqrt(
                    1.0
                    + 0.5 / (1.0 - 0.2**2 / 2.0**2)
                    + 0.25 / (1.0 - 0.4**2 / 2.0**2)
                ),
            ),
            (
                "formula 2",
                [0.5, 0.2, 0.25, 0.4],
                math.sqrt(
                    1.0
                    + 0.5 / (1.0 - 0.2 / 2.0**2)
                    + 0.25 / (1.0 - 0.4 / 2.0**2)
                ),
            ),
        ],
    )
    def test_evaluates_every_coefficient_pair(self, equation, coefficients, expected):
        from rayoptics_web_utils.glass import custom_materials

        equation_function = {
            "formula 1": custom_materials._formula1,
            "formula 2": custom_materials._formula2,
        }[equation]

        assert equation_function(coefficients, 2.0) == pytest.approx(expected)

    @pytest.mark.parametrize(
        ("equation_function", "equation_name"),
        [("_formula1", "Formula 1"), ("_formula2", "Formula 2")],
    )
    def test_rejects_odd_number_of_coefficients(self, equation_function, equation_name):
        from rayoptics_web_utils.glass import custom_materials

        with pytest.raises(
            ValueError,
            match=rf"Expected even number dispersion coefficients for {equation_name}, got 3",
        ):
            getattr(custom_materials, equation_function)([0.5, 0.2, 0.25], 2.0)


class TestSellmeierMaterialBuilder:
    """Synthetic YAML makes branch-specific output and validation observable."""

    def test_load_custom_material_forwards_yaml_and_medium_metadata(self, monkeypatch):
        from rayoptics_web_utils.glass import custom_materials

        yaml_payload = {"DATA": [{"type": "formula 1"}]}
        sentinel = object()
        calls = []

        monkeypatch.setattr(
            custom_materials,
            "_load_material_yaml",
            lambda filename: yaml_payload,
        )

        def fake_create_material(*args):
            calls.append(args)
            return sentinel

        monkeypatch.setattr(custom_materials, "create_material", fake_create_material)

        assert custom_materials.load_custom_material("synthetic.yml", "Synthetic") is sentinel
        assert calls == [(yaml_payload, "Synthetic", "rii-main", "data-nk")]

    def test_formula1_six_coeff_helper_forwards_both_arguments(self, monkeypatch):
        from rayoptics_web_utils.glass import custom_materials

        sentinel = object()
        calls = []

        def fake_builder(filename, material_name):
            calls.append((filename, material_name))
            return sentinel

        monkeypatch.setattr(
            custom_materials,
            "_build_sellmeier_special_material_data",
            fake_builder,
        )

        assert custom_materials._build_formula1_six_coeff_special_material_data(
            "synthetic.yml", "Synthetic"
        ) is sentinel
        assert calls == [("synthetic.yml", "Synthetic")]

    def test_formula1_builder_applies_overrides_and_exports_squared_c_terms(self, monkeypatch):
        from rayoptics_web_utils.glass import custom_materials

        coefficients = [0.5, 0.2, 0.25, 0.4, 0.1, 0.8]
        material = _synthetic_material(
            "formula 1",
            coefficients,
            properties={"nd": "1.7", "Vd": "42.0"},
        )
        calls = []

        def fake_load(filename, material_name):
            calls.append((filename, material_name))
            return material

        monkeypatch.setattr(custom_materials, "load_custom_material", fake_load)

        result = custom_materials._build_sellmeier_special_material_data(
            "synthetic.yml", "Synthetic"
        )

        n_c = _expected_formula1(coefficients, custom_materials._WL_C)
        n_e = _expected_formula1(coefficients, custom_materials._WL_E)
        n_f = _expected_formula1(coefficients, custom_materials._WL_F)
        n_g = _expected_formula1(coefficients, custom_materials._WL_G)
        denominator = n_f - n_c

        assert calls == [("synthetic.yml", "Synthetic")]
        assert result["dispersionCoeffKind"] == "Sellmeier3T"
        assert result["dispersionCoeffs"] == pytest.approx(
            [0.5, 0.25, 0.1, 0.2**2, 0.4**2, 0.8**2]
        )
        assert result["refractiveIndexD"] == 1.7
        assert result["refractiveIndexE"] == pytest.approx(n_e)
        assert result["abbeNumberD"] == 42.0
        assert result["abbeNumberE"] == pytest.approx((n_e - 1.0) / denominator)
        assert result["partialDispersions"]["P_fe"] == pytest.approx(
            (n_f - n_e) / denominator
        )
        assert result["partialDispersions"]["P_Fd"] == pytest.approx(
            (n_f - 1.7) / denominator
        )
        assert result["partialDispersions"]["P_gF"] == pytest.approx(
            (n_g - n_f) / denominator
        )

    def test_formula2_builder_keeps_squared_c_terms_and_selects_four_term_schema(
        self, monkeypatch
    ):
        from rayoptics_web_utils.glass import custom_materials

        coefficients = [0.1, 0.01, 0.2, 0.02, 0.3, 0.03, 0.4, 0.04]
        material = _synthetic_material("formula 2", coefficients)
        monkeypatch.setattr(
            custom_materials,
            "load_custom_material",
            lambda filename, material_name: material,
        )

        result = custom_materials._build_sellmeier_special_material_data(
            "synthetic.yml", "Synthetic"
        )

        assert result["dispersionCoeffKind"] == "Sellmeier4T"
        assert result["dispersionCoeffs"] == pytest.approx(
            [0.1, 0.2, 0.3, 0.4, 0.01, 0.02, 0.03, 0.04]
        )
        assert result["refractiveIndexD"] == pytest.approx(
            _expected_formula2(coefficients, custom_materials._WL_D)
        )

    def test_builder_rejects_odd_raw_coefficients_with_context(self, monkeypatch):
        from rayoptics_web_utils.glass import custom_materials

        monkeypatch.setattr(
            custom_materials,
            "load_custom_material",
            lambda filename, material_name: _synthetic_material(
                "formula 1", [0.5, 0.2, 0.25]
            ),
        )

        with pytest.raises(
            ValueError,
            match="Expected even number dispersion coefficients for Synthetic, got 3",
        ):
            custom_materials._build_sellmeier_special_material_data(
                "synthetic.yml", "Synthetic"
            )

    @pytest.mark.parametrize(
        ("equation_type", "coefficients", "message"),
        [
            (
                "formula 9",
                [0.5, 0.2, 0.25, 0.4, 0.1, 0.8],
                "Unsupported equation type for Synthetic: formula 9",
            ),
            (
                "formula 1",
                [0.5, 0.2],
                "Unsupported Sellmeier term count for Synthetic: 1",
            ),
        ],
    )
    def test_builder_rejects_unsupported_equations_and_term_counts(
        self, monkeypatch, equation_type, coefficients, message
    ):
        from rayoptics_web_utils.glass import custom_materials

        monkeypatch.setattr(
            custom_materials,
            "load_custom_material",
            lambda filename, material_name: _synthetic_material(
                equation_type, coefficients
            ),
        )

        with pytest.raises(ValueError, match=message):
            custom_materials._build_sellmeier_special_material_data(
                "synthetic.yml", "Synthetic"
            )


@pytest.fixture(scope="module")
def caf2_data():
    """Cache deterministic CaF2 material data for this test module."""
    from rayoptics_web_utils.glass.custom_materials import _get_caf2_data

    return _get_caf2_data()


@pytest.fixture(scope="module")
def fused_silica_data():
    """Cache deterministic fused-silica material data for this test module."""
    from rayoptics_web_utils.glass.custom_materials import _get_fused_silica_data

    return _get_fused_silica_data()


@pytest.fixture(scope="module")
def water_data():
    """Cache deterministic water material data for this test module."""
    from rayoptics_web_utils.glass.custom_materials import _get_water_data

    return _get_water_data()


@pytest.fixture(scope="module")
def d263teco_data():
    """Cache deterministic D263TECO material data for this test module."""
    from rayoptics_web_utils.glass.custom_materials import _get_d263teco_data

    return _get_d263teco_data()


@pytest.fixture(scope="module")
def special_data():
    """Cache the deterministic special-material catalog for this test module."""
    from rayoptics_web_utils.glass.custom_materials import get_special_materials_data

    return get_special_materials_data()


class TestGetCaF2Data:
    """Tests for _get_caf2_data()."""

    def test_returns_dict_with_required_keys(self, caf2_data):
        assert isinstance(caf2_data, dict)
        assert REQUIRED_CaF2_KEYS == set(caf2_data.keys())

    def test_refractiveIndexD_is_float_greater_than_one(self, caf2_data):
        nd = caf2_data["refractiveIndexD"]
        assert isinstance(nd, float)
        assert nd > 1.0

    def test_refractiveIndexE_is_float_greater_than_one(self, caf2_data):
        ne = caf2_data["refractiveIndexE"]
        assert isinstance(ne, float)
        assert ne > 1.0

    def test_abbeNumberD_is_positive_float(self, caf2_data):
        vd = caf2_data["abbeNumberD"]
        assert isinstance(vd, float)
        assert vd > 0.0

    def test_abbeNumberE_is_positive_float(self, caf2_data):
        ve = caf2_data["abbeNumberE"]
        assert isinstance(ve, float)
        assert ve > 0.0

    def test_dispersionCoeffKind_is_sellmeier3t(self, caf2_data):
        assert caf2_data["dispersionCoeffKind"] == "Sellmeier3T"

    def test_dispersionCoeffs_has_six_finite_floats(self, caf2_data):
        coeffs = caf2_data["dispersionCoeffs"]
        assert isinstance(coeffs, list)
        assert len(coeffs) == 6
        for i, c in enumerate(coeffs):
            assert isinstance(c, float), f"coeff[{i}] not float"
            assert math.isfinite(c), f"coeff[{i}]={c} not finite"

    def test_partialDispersions_has_required_keys_with_finite_floats(self, caf2_data):
        pd_data = caf2_data["partialDispersions"]
        assert isinstance(pd_data, dict)
        assert PARTIAL_DISPERSION_KEYS == set(pd_data.keys())
        for k, v in pd_data.items():
            assert isinstance(v, float), f"{k} not float"
            assert math.isfinite(v), f"{k}={v} not finite"

    # CaF2 (Malitson) known approximate values
    def test_refractiveIndexD_approx(self, caf2_data):
        # CaF2 Malitson nd ≈ 1.4338 at d-line (587.6 nm)
        assert abs(caf2_data["refractiveIndexD"] - 1.4338) < 0.001

    def test_abbeNumberD_approx(self, caf2_data):
        # CaF2 has very low dispersion, Vd ≈ 95
        assert abs(caf2_data["abbeNumberD"] - 95.0) < 5.0

    def test_dispersionCoeffs_order_is_B1_B2_B3_C1_C2_C3(self, caf2_data):
        # dispersionCoeffs = [B1, B2, B3, C1, C2, C3]
        # C values are SQUARED resonance wavelengths in μm²
        # Per Sellmeier equation:
        #   n²−1 = B1·λ²/(λ²−C1) + B2·λ²/(λ²−C2) + B3·λ²/(λ²−C3)
        coeffs = caf2_data["dispersionCoeffs"]
        B1, B2, B3, C1, C2, C3 = coeffs
        assert abs(B1 - 0.5675888) < 1e-6
        assert abs(B2 - 0.4710914) < 1e-6
        assert abs(B3 - 3.8484723) < 1e-6
        assert abs(C1 - 0.050263605 ** 2) < 1e-7
        assert abs(C2 - 0.1003909 ** 2) < 1e-6
        assert abs(C3 - 34.649040 ** 2) < 1e-4


@pytest.mark.parametrize(
    ("helper_name", "builder_name", "filename", "material_name"),
    [
        (
            "_get_caf2_data",
            "_build_formula1_six_coeff_special_material_data",
            "CaF2_Malitson.yml",
            "CaF2",
        ),
        (
            "_get_fused_silica_data",
            "_build_formula1_six_coeff_special_material_data",
            "FusedSilica_Malitson.yml",
            "Fused Silica",
        ),
        (
            "_get_water_data",
            "_build_sellmeier_special_material_data",
            "Water_Daimon-20.0C.yml",
            "Water",
        ),
        (
            "_get_d263teco_data",
            "_build_sellmeier_special_material_data",
            "D263TECO.yml",
            "D263TECO",
        ),
    ],
)
def test_catalog_helpers_forward_their_catalog_identity(
    monkeypatch, helper_name, builder_name, filename, material_name
):
    from rayoptics_web_utils.glass import custom_materials

    sentinel = object()
    calls = []

    def fake_builder(received_filename, received_material_name):
        calls.append((received_filename, received_material_name))
        return sentinel

    monkeypatch.setattr(custom_materials, builder_name, fake_builder)

    assert getattr(custom_materials, helper_name)() is sentinel
    assert calls == [(filename, material_name)]


class TestGetFusedSilicaData:
    """Tests for _get_fused_silica_data()."""

    def test_returns_dict_with_required_keys(self, fused_silica_data):
        assert isinstance(fused_silica_data, dict)
        assert REQUIRED_CaF2_KEYS == set(fused_silica_data.keys())

    def test_refractiveIndexD_approx(self, fused_silica_data):
        assert abs(fused_silica_data["refractiveIndexD"] - 1.4585) < 0.001

    def test_abbeNumberD_approx(self, fused_silica_data):
        assert abs(fused_silica_data["abbeNumberD"] - 67.8) < 2.0

    def test_dispersionCoeffs_order_is_B1_B2_B3_C1_C2_C3(self, fused_silica_data):
        coeffs = fused_silica_data["dispersionCoeffs"]
        B1, B2, B3, C1, C2, C3 = coeffs
        assert abs(B1 - 0.6961663) < 1e-7
        assert abs(B2 - 0.4079426) < 1e-7
        assert abs(B3 - 0.8974794) < 1e-7
        assert abs(C1 - 0.0684043 ** 2) < 1e-7
        assert abs(C2 - 0.1162414 ** 2) < 1e-7
        assert abs(C3 - 9.896161 ** 2) < 1e-6


class TestGetWaterData:
    """Tests for _get_water_data()."""

    def test_returns_dict_with_required_keys(self, water_data):
        assert isinstance(water_data, dict)
        assert REQUIRED_CaF2_KEYS == set(water_data.keys())

    def test_dispersionCoeffKind_is_sellmeier4t(self, water_data):
        assert water_data["dispersionCoeffKind"] == "Sellmeier4T"

    def test_dispersionCoeffs_has_eight_finite_floats(self, water_data):
        coeffs = water_data["dispersionCoeffs"]
        assert isinstance(coeffs, list)
        assert len(coeffs) == 8
        for i, c in enumerate(coeffs):
            assert isinstance(c, float), f"coeff[{i}] not float"
            assert math.isfinite(c), f"coeff[{i}]={c} not finite"

    def test_refractiveIndexD_approx(self, water_data):
        assert abs(water_data["refractiveIndexD"] - 1.3334021391241768) < 1e-9

    def test_abbeNumberD_approx(self, water_data):
        assert abs(water_data["abbeNumberD"] - 55.737679838534845) < 1e-9

    def test_dispersionCoeffs_order_is_b1_b2_b3_b4_c1_c2_c3_c4(self, water_data):
        coeffs = water_data["dispersionCoeffs"]
        B1, B2, B3, B4, C1, C2, C3, C4 = coeffs
        assert abs(B1 - 0.5684027565) < 1e-12
        assert abs(B2 - 0.1726177391) < 1e-12
        assert abs(B3 - 0.02086189578) < 1e-12
        assert abs(B4 - 0.1130748688) < 1e-12
        assert abs(C1 - 0.005101829712) < 1e-12
        assert abs(C2 - 0.01821153936) < 1e-12
        assert abs(C3 - 0.02620722293) < 1e-12
        assert abs(C4 - 10.69792721) < 1e-10


class TestGetD263TECOData:
    """Tests for _get_d263teco_data()."""

    def test_returns_dict_with_required_keys(self, d263teco_data):
        assert isinstance(d263teco_data, dict)
        assert REQUIRED_CaF2_KEYS == set(d263teco_data.keys())

    def test_dispersionCoeffKind_is_sellmeier3t(self, d263teco_data):
        assert d263teco_data["dispersionCoeffKind"] == "Sellmeier3T"

    def test_dispersionCoeffs_has_six_finite_floats(self, d263teco_data):
        coeffs = d263teco_data["dispersionCoeffs"]
        assert isinstance(coeffs, list)
        assert len(coeffs) == 6
        for i, c in enumerate(coeffs):
            assert isinstance(c, float), f"coeff[{i}] not float"
            assert math.isfinite(c), f"coeff[{i}]={c} not finite"

    def test_refractiveIndexD_approx(self, d263teco_data):
        assert abs(d263teco_data["refractiveIndexD"] - 1.523303) < 1e-6

    def test_abbeNumberD_approx(self, d263teco_data):
        assert abs(d263teco_data["abbeNumberD"] - 54.5172) < 1e-4

    def test_dispersionCoeffs_order_is_B1_B2_B3_C1_C2_C3(self, d263teco_data):
        coeffs = d263teco_data["dispersionCoeffs"]
        B1, B2, B3, C1, C2, C3 = coeffs
        assert abs(B1 - 1.23795755) < 1e-8
        assert abs(B2 - 0.0466468888) < 1e-10
        assert abs(B3 - 2.46700556) < 1e-8
        assert abs(C1 - 0.00863080926) < 1e-11
        assert abs(C2 - 0.0469074501) < 1e-10
        assert abs(C3 - 264.146296) < 1e-6


class TestGetSpecialMaterialsData:
    """Tests for get_special_materials_data()."""

    def test_returns_dict_with_special_key(self, special_data):
        assert isinstance(special_data, dict)
        assert "Special" in special_data

    def test_special_catalog_contains_expected_entries(self, special_data):
        catalog = special_data["Special"]
        assert isinstance(catalog, dict)
        assert "CaF2" in catalog
        assert "Fused Silica" in catalog
        assert "Water" in catalog
        assert "D263TECO" in catalog

    def test_caf2_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["CaF2"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())

    def test_fused_silica_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["Fused Silica"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())

    def test_water_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["Water"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())

    def test_d263teco_entry_has_required_keys(self, special_data):
        entry = special_data["Special"]["D263TECO"]
        assert REQUIRED_CaF2_KEYS == set(entry.keys())
