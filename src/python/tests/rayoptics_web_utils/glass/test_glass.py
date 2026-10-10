"""Tests for rayoptics_web_utils.glass module."""

import json
import math
import pandas as pd
import pytest

CATALOG_NAMES = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
REQUIRED_KEYS = {
    "refractiveIndexD",
    "refractiveIndexE",
    "abbeNumberD",
    "abbeNumberE",
    "partialDispersions",
    "dispersionCoeffKind",
    "dispersionCoeffs",
}
PARTIAL_DISPERSION_KEYS = {"P_fe", "P_Fd", "P_gF"}
CDGM_SELLMEIER_KEYS = ["K1", "L1", "K2", "L2", "K3", "L3"]
CDGM_SCHOTT_KEYS = ["A0", "A1", "A2", "A3", "A4", "A5"]
D_LINE_UM = 0.5875618


def _vendor_catalogs():
    """Return opticalglass's spreadsheet-backed vendor glass library."""
    from opticalglass.glassfactory import og_glass_libs

    return og_glass_libs["xls"]


def _exported_index(kind: str, coeffs: list[float], wavelength_um: float) -> float:
    """Evaluate an exported dispersion formula at ``wavelength_um``."""
    w2 = wavelength_um**2
    if kind == "Sellmeier3T":
        b_terms, c_terms = coeffs[:3], coeffs[3:]
        return math.sqrt(1.0 + sum(b * w2 / (w2 - c) for b, c in zip(b_terms, c_terms)))
    if kind == "Schott2x6" and len(coeffs) == 6:
        powers = [0, 1, -1, -2, -3, -4]
    elif kind == "Schott2x6" and len(coeffs) == 9:
        powers = [0, 1, 2, -1, -2, -3, -4, -5, -6]
    else:
        raise AssertionError(f"unexpected coefficient layout {kind}/{len(coeffs)}")
    return math.sqrt(sum(c * w2**p for c, p in zip(coeffs, powers)))


@pytest.fixture(scope="module")
def assert_dispersion_coeff_value() -> None:
    """Fixture to assert that dispersion coefficients are not NaN."""
    def _assert_dispersion_coeff_not_nan(data: pd.Series, catalog_name: str, glass_name: str, coeff_name: str) -> None:
        assert coeff_name in data["dispersion coefficients"], f"{catalog_name}/{glass_name} missing {coeff_name} in dispersion coefficients"
        
        if catalog_name != "Hikari" or (catalog_name == "Hikari" and data["dispersion coefficients"][coeff_name] != "-"):
            try:
                coeff_value = float(data["dispersion coefficients"][coeff_name])
            except (ValueError):
                assert False, (
                    f"{catalog_name}/{glass_name} has non-numeric value for {coeff_name} in dispersion coefficients"
                )

            assert math.isnan(coeff_value) is False, (
                f"{catalog_name}/{glass_name} has NaN for dispersion coefficient {coeff_name}"
            )
    return _assert_dispersion_coeff_not_nan


@pytest.fixture(scope="module")
def assert_numerical_data_valid() -> None:
    """"Fixture to assert numerical values are valid."""
    def _assert(data: pd.Series, attr: str, glass_name: str, sub_attr: str) -> None:
            assert sub_attr in data[attr], f"{glass_name} missing '{sub_attr}' in '{attr}'"
            try:
                parsed_value = float(data[attr][sub_attr])
            except (ValueError):
                assert False, f"{glass_name} has non-numeric value for '{sub_attr}' in '{attr}'"

            assert math.isnan(parsed_value) is False, (
                f"{glass_name} has NaN for dispersion coefficient {sub_attr} in {attr}"
            )
    return _assert


class TestGlassDispersionCoeffDedicatedForSchottDispersionEquation:
    """Tests to verify the dipsersion coefficient data format for all catalogs from opticalglass that use the Schott dispersion equation (Hoya, Sumita)."""

    # Schott2x4
    def test_glass(self, assert_dispersion_coeff_value) -> None:
        glass_catalogs = _vendor_catalogs()

        catalogs = ['Hoya', 'Sumita']
        for catalog_name in catalogs:
            catalog = glass_catalogs[catalog_name]
            glass_names = catalog.get_glass_names()
            for glass_name in glass_names:
                data = catalog.glass_data(glass_name)
                assert "dispersion coefficients" in data, f"{catalog_name}/{glass_name} missing 'dispersion coefficients'"

                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A0")
                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A1")
                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A2")
                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A3")
                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A4")
                assert_dispersion_coeff_value(data, catalog_name, glass_name, "A5")

    # Schott2x6
    def test_hikari_glasses(self, assert_dispersion_coeff_value) -> None:
        glass_catalogs = _vendor_catalogs()

        catalog = glass_catalogs['Hikari']
        glass_names = catalog.get_glass_names()
        for glass_name in glass_names:
            data = catalog.glass_data(glass_name)
            assert "dispersion coefficients" in data, f"Hikari/{glass_name} missing 'dispersion coefficients'"

            catalog_name = "Hikari"
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A0")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A1･λ^2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A2･λ^4")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A3/λ^2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A4/λ^4")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A5/λ^6")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A6/λ^8")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A7/λ^10")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A8/λ^12")


    # CDGM's September 2024 catalog gives Sellmeier K/L coefficients for most
    # glasses and the older Schott A0-A5 coefficients for the rest.
    def test_cdgm_glasses_have_complete_sellmeier_or_schott_coefficients(
        self, assert_dispersion_coeff_value
    ) -> None:
        catalog = _vendor_catalogs()["CDGM"]
        formulas = set()
        for glass_name in catalog.get_glass_names():
            data = catalog.glass_data(glass_name)
            if pd.notna(data["dispersion coefficients"]["K1"]):
                keys = CDGM_SELLMEIER_KEYS
                formulas.add("sellmeier")
            else:
                keys = CDGM_SCHOTT_KEYS
                formulas.add("schott")
            for key in keys:
                assert_dispersion_coeff_value(data, "CDGM", glass_name, key)

        assert formulas == {"sellmeier", "schott"}


class TestGlassDispersionCoeffDedicatedForSellmeierDispersionEquation:
    """Tests to verify the dipsersion coefficient data format for all catalogs from opticalglass that use the Sellmeier dispersion equation (Ohara, Schott)."""
    
    # Sellmeier3T
    # n^2 - 1 = A1*λ^2/(λ^2-B1) + A2*λ^2/(λ^2-B2) + A3*λ^2/(λ^2-B3)
    def test_ohara_glasses(self, assert_dispersion_coeff_value) -> None:
        glass_catalogs = _vendor_catalogs()
        
        catalog = glass_catalogs['Ohara']
        glass_names = catalog.get_glass_names()
        for glass_name in glass_names:
            data = catalog.glass_data(glass_name)
            assert "dispersion coefficients" in data, f"Ohara/{glass_name} missing 'dispersion coefficients'"

            catalog_name = "Ohara"
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A1")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "A3")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B1")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B3")
    
    # Sellmeier3T
    # n^2 - 1 = B1*λ^2/(λ^2-C1) + B2*λ^2/(λ^2-C2) + B3*λ^2/(λ^2-C3)
    def test_schott_glasses(self, assert_dispersion_coeff_value) -> None:
        glass_catalogs = _vendor_catalogs()
        
        catalog = glass_catalogs['Schott']
        glass_names = catalog.get_glass_names()
        for glass_name in glass_names:
            data = catalog.glass_data(glass_name)
            assert "dispersion coefficients" in data, f"Schott/{glass_name} missing 'dispersion coefficients'"

            catalog_name = "Schott"
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B1")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "B3")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "C1")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "C2")
            assert_dispersion_coeff_value(data, catalog_name, glass_name, "C3")


class TestGlassRefractiveIndexData:
    """Tests to verify that the refractive index data for all catalogs from opticalglass is valid."""

    def test_refractive_indices_valid(self, assert_numerical_data_valid) -> None:
        glass_catalogs = _vendor_catalogs()

        for catalog_name in CATALOG_NAMES:
            catalog = glass_catalogs[catalog_name]
            glass_names = catalog.get_glass_names()
            for glass_name in glass_names:
                data = catalog.glass_data(glass_name)

                assert "refractive indices" in data, f"{catalog_name}/{glass_name} missing 'refractive indices'"
                # The g line is not required: the 2025 Schott catalog omits it
                # for SF6G05, and the exported entry then reports P_gF as 0.
                refractive_indices_lines = ["C", "d", "e", "F"]
                for line in refractive_indices_lines:
                    assert_numerical_data_valid(data, "refractive indices", glass_name, line)

class TestGlassAbbeNumberData:
    """Tests to verify that the Abbe number data for all catalogs from opticalglass is valid."""

    def test_abbe_numbers_valid(self, assert_numerical_data_valid) -> None:
        glass_catalogs = _vendor_catalogs()

        for catalog_name in CATALOG_NAMES:
            catalog = glass_catalogs[catalog_name]
            glass_names = catalog.get_glass_names()
            for glass_name in glass_names:
                data = catalog.glass_data(glass_name)

                assert "abbe number" in data, f"{catalog_name}/{glass_name} missing 'abbe number'"
                assert_numerical_data_valid(data, "abbe number", glass_name, "vd")
                assert_numerical_data_valid(data, "abbe number", glass_name, "ve")


class TestGetGlassCatalogData:
    """Tests for get_glass_catalog_data()."""

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_returns_dict(self, catalog_name: str) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        assert isinstance(result, dict)

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_keys_are_strings(self, catalog_name: str) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for key in result:
            assert isinstance(key, str)

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_each_entry_has_required_keys(self, catalog_name: str) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        assert len(result) > 0
        for glass_name, entry in result.items():
            assert REQUIRED_KEYS == set(entry.keys()), (
                f"{catalog_name}/{glass_name} missing keys: "
                f"{REQUIRED_KEYS - set(entry.keys())}"
            )

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_refractive_indices_are_floats_greater_than_one(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            nd = entry["refractiveIndexD"]
            ne = entry["refractiveIndexE"]
            assert isinstance(nd, float), f"{catalog_name}/{glass_name}: nd not float"
            assert isinstance(ne, float), f"{catalog_name}/{glass_name}: ne not float"
            assert nd > 1.0, f"{catalog_name}/{glass_name}: nd={nd} <= 1.0"
            assert ne > 1.0, f"{catalog_name}/{glass_name}: ne={ne} <= 1.0"

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_abbe_numbers_are_positive_floats(self, catalog_name: str) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            vd = entry["abbeNumberD"]
            ve = entry["abbeNumberE"]
            assert isinstance(vd, float), f"{catalog_name}/{glass_name}: vd not float"
            assert isinstance(ve, float), f"{catalog_name}/{glass_name}: ve not float"
            assert vd > 0.0, f"{catalog_name}/{glass_name}: vd={vd} <= 0"
            assert ve > 0.0, f"{catalog_name}/{glass_name}: ve={ve} <= 0"

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_partialDispersions_has_required_keys_with_finite_values(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            pd_data = entry["partialDispersions"]
            assert PARTIAL_DISPERSION_KEYS == set(pd_data.keys()), (
                f"{catalog_name}/{glass_name}: partialDispersions keys mismatch"
            )
            for k, v in pd_data.items():
                assert isinstance(v, float), (
                    f"{catalog_name}/{glass_name}: partial dispersion {k} not float"
                )
                assert math.isfinite(v), (
                    f"{catalog_name}/{glass_name}: partial dispersion {k}={v} not finite"
                )
    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_dispersionCoeffs_has_kind_and_coeffs_with_finite_values(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            assert "dispersionCoeffKind" in entry, f"{catalog_name}/{glass_name} missing 'dispersionCoeffKind'"
            assert "dispersionCoeffs" in entry, f"{catalog_name}/{glass_name} missing 'dispersionCoeffs'"
            
            coeff_kind = entry["dispersionCoeffKind"]
            assert isinstance(coeff_kind, str), f"{catalog_name}/{glass_name}: dispersionCoeffKind not string"
            assert coeff_kind in {"Schott2x6", "Sellmeier3T", "Sellmeier4T"}, (
                f"{catalog_name}/{glass_name}: dispersionCoeffKind {coeff_kind} not in expected values"
            )

            coeffs = entry["dispersionCoeffs"]
            assert isinstance(coeffs, list), f"{catalog_name}/{glass_name}: dispersionCoeffs not list"
            for i, coeff in enumerate(coeffs):
                assert isinstance(coeff, float), (
                    f"{catalog_name}/{glass_name}: dispersion coefficient {i} not float"
                )
                assert math.isfinite(coeff), (
                    f"{catalog_name}/{glass_name}: dispersion coefficient {i}={coeff} not finite"
                )


class TestGetAllGlassCatalogsData:
    """Tests for get_all_glass_catalogs_data()."""

    def test_returns_dict_with_all_catalog_names(self) -> None:
        from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

        result = get_all_glass_catalogs_data()
        assert isinstance(result, dict)
        assert set(result.keys()) == set(CATALOG_NAMES) | {"Special"}

    def test_special_catalog_contains_expected_entries_with_required_keys(self) -> None:
        from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

        result = get_all_glass_catalogs_data()
        assert "Special" in result
        assert "CaF2" in result["Special"]
        assert "Fused Silica" in result["Special"]
        assert "Water" in result["Special"]
        assert "D263TECO" in result["Special"]
        assert REQUIRED_KEYS == set(result["Special"]["CaF2"].keys())
        assert REQUIRED_KEYS == set(result["Special"]["Fused Silica"].keys())
        assert REQUIRED_KEYS == set(result["Special"]["Water"].keys())
        assert REQUIRED_KEYS == set(result["Special"]["D263TECO"].keys())

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_each_catalog_value_matches_single_catalog_contract(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

        result = get_all_glass_catalogs_data()
        catalog = result[catalog_name]
        assert isinstance(catalog, dict)
        assert len(catalog) > 0
        for glass_name, entry in catalog.items():
            assert isinstance(glass_name, str)
            assert REQUIRED_KEYS == set(entry.keys()), (
                f"{catalog_name}/{glass_name} missing keys"
            )


class TestCatalogExportContract:
    """Exported entries stay JSON-safe and reproduce catalog indices."""

    def test_all_catalogs_serialize_to_strict_json(self) -> None:
        from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

        json.dumps(get_all_glass_catalogs_data(), allow_nan=False)

    def test_partial_dispersions_are_zero_when_an_index_is_missing(self) -> None:
        from rayoptics_web_utils.glass.glass import _partial_dispersions

        indices = pd.Series(
            {"F": 1.83, "e": 1.82, "d": 1.81, "C": 1.80, "g": pd.NA}
        )
        result = _partial_dispersions(pd.Series({"refractive indices": indices}))

        assert result["P_gF"] == 0.0
        assert result["P_Fd"] == pytest.approx((1.83 - 1.81) / (1.83 - 1.80))

    def test_partial_dispersions_evaluate_every_index_from_the_formula_when_one_is_missing(
        self,
    ) -> None:
        from rayoptics_web_utils.glass.glass import _partial_dispersions

        indices = pd.Series(
            {"F": 1.83, "e": 1.82, "d": 1.81, "C": 1.80, "g": pd.NA}
        )
        formula = {"F": 1.831, "e": 1.821, "d": 1.811, "C": 1.801, "g": 1.851}
        result = _partial_dispersions(
            pd.Series({"refractive indices": indices}), formula.__getitem__
        )

        assert result["P_gF"] == pytest.approx((1.851 - 1.831) / (1.831 - 1.801))
        assert result["P_Fd"] == pytest.approx((1.83 - 1.81) / (1.83 - 1.80))

    def test_schott_sf6g05_missing_ng_uses_the_datasheet_partial_dispersion(
        self,
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        # The Schott spreadsheet omits ng for SF6G05; its datasheet gives P_g,F = 0.6121.
        assert pd.isna(
            _vendor_catalogs()["Schott"].glass_data("SF6G05")["refractive indices"]["g"]
        )
        entry = get_glass_catalog_data("Schott")["SF6G05"]

        assert entry["partialDispersions"]["P_gF"] == pytest.approx(0.6121, abs=5e-5)

    def test_cdgm_entries_reproduce_catalog_nd_with_both_formulas(self) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data("CDGM")
        kinds = set()
        for glass_name, entry in result.items():
            kind = entry["dispersionCoeffKind"]
            kinds.add(kind)
            nd = _exported_index(kind, entry["dispersionCoeffs"], D_LINE_UM)
            assert nd == pytest.approx(entry["refractiveIndexD"], abs=2e-5), (
                f"CDGM/{glass_name}: {kind} coefficients give nd={nd}"
            )

        assert kinds == {"Sellmeier3T", "Schott2x6"}


class TestLegacyAgfGlasses:
    """Glasses dropped from the vendor spreadsheets but kept through AGF data."""

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_legacy_glasses_are_absent_from_the_vendor_spreadsheets(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.legacy_glasses import LEGACY_AGF_GLASSES

        spreadsheet_names = {
            str(name).strip()
            for name in _vendor_catalogs()[catalog_name].get_glass_names()
        }
        assert spreadsheet_names.isdisjoint(LEGACY_AGF_GLASSES[catalog_name])

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_legacy_glasses_are_exported_with_their_agf_dispersion(
        self, catalog_name: str
    ) -> None:
        from opticalglass.glassfactory import create_glass
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data
        from rayoptics_web_utils.glass.legacy_glasses import LEGACY_AGF_GLASSES

        from ZemaxGlass import ZemaxGlass as zemax_glass

        result = get_glass_catalog_data(catalog_name)
        for glass_name in LEGACY_AGF_GLASSES[catalog_name]:
            assert glass_name in result, f"{catalog_name}/{glass_name} not exported"
            entry = result[glass_name]
            medium = create_glass(glass_name, catalog_name)
            assert entry["refractiveIndexD"] == pytest.approx(medium.rindex("d"))
            assert entry["refractiveIndexE"] == pytest.approx(medium.rindex("e"))

            # rindex() shifts the catalog formula from the glass's reference
            # temperature to 20 C; the exported coefficients are the catalog
            # formula itself, so compare them at the reference temperature.
            record = medium.glass_rec
            reference_temperature = record["td"][6] if "td" in record else 20.0
            for wavelength_um in (0.6562725, D_LINE_UM, 0.4861327):
                catalog_index = zemax_glass.get_dispersion(
                    glass_name,
                    medium.catalog_name(),
                    record,
                    wavelength_um,
                    T=reference_temperature,
                )
                exported = _exported_index(
                    entry["dispersionCoeffKind"], entry["dispersionCoeffs"], wavelength_um
                )
                assert exported == pytest.approx(catalog_index, abs=1e-9), (
                    f"{catalog_name}/{glass_name}: exported coefficients disagree "
                    f"at {wavelength_um} um"
                )

    def test_example_system_glasses_remain_in_the_schott_catalog(self) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        schott = get_glass_catalog_data("Schott")

        assert "K7" in schott
        assert "N-ZK7" in schott
