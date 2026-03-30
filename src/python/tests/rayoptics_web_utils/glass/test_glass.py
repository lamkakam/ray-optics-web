"""Tests for rayoptics_web_utils.glass module."""

import math
import pandas as pd
import pytest

CATALOG_NAMES = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
REQUIRED_KEYS = {
    "refractive_index_d",
    "refractive_index_e",
    "abbe_number_d",
    "abbe_number_e",
    "partial_dispersions",
}
PARTIAL_DISPERSION_KEYS = {"P_F_e", "P_F_d", "P_g_F"}


@pytest.fixture(scope="module")
def assert_dispersion_coeff_value():
    """Fixture to assert that dispersion coefficients are not NaN."""
    def _assert_dispersion_coeff_not_nan(data: pd.Series ,catalog_name: str, glass_name: str, coeff_name: str) -> None:
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


class TestGlassDispersionCoeffDedicatedForSchottDispersionEquation:
    """Tests to verify the dipsersion coefficient data format for all catalogs that use the Schott dispersion equation (CDGM, Hoya, Sumita)."""

    # Note: CDGM used Schott dispersion equation in the past but switched to Sellmeier in 2024
    # The data from `opticalglass` for CDGM glasses still uses the old Schott coefficients, so
    # so we test them here to verify that the data is present and correctly formatted.
    #
    # Schott2x4
    def test_glass(self, assert_dispersion_coeff_value) -> None:
        from opticalglass.glassfactory import fill_catalog_list
        glass_catalogs = fill_catalog_list()

        catalogs = ['CDGM', 'Hoya', 'Sumita']
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
        from opticalglass.glassfactory import fill_catalog_list
        glass_catalogs = fill_catalog_list()

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



class TestGlassDispersionCoeffDedicatedForSellmeierDispersionEquation:
    """Tests to verify the dipsersion coefficient data format for all catalogs that use the Sellmeier dispersion equation (Ohara, Schott)."""
    
    # Sellmeier3T
    # n^2 - 1 = A1*λ^2/(λ^2-B1) + A2*λ^2/(λ^2-B2) + A3*λ^2/(λ^2-B3)
    def test_ohara_glasses(self, assert_dispersion_coeff_value) -> None:
        from opticalglass.glassfactory import fill_catalog_list
        glass_catalogs = fill_catalog_list()
        
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
        from opticalglass.glassfactory import fill_catalog_list
        glass_catalogs = fill_catalog_list()
        
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
            nd = entry["refractive_index_d"]
            ne = entry["refractive_index_e"]
            assert isinstance(nd, float), f"{catalog_name}/{glass_name}: nd not float"
            assert isinstance(ne, float), f"{catalog_name}/{glass_name}: ne not float"
            assert nd > 1.0, f"{catalog_name}/{glass_name}: nd={nd} <= 1.0"
            assert ne > 1.0, f"{catalog_name}/{glass_name}: ne={ne} <= 1.0"

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_abbe_numbers_are_positive_floats(self, catalog_name: str) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            vd = entry["abbe_number_d"]
            ve = entry["abbe_number_e"]
            assert isinstance(vd, float), f"{catalog_name}/{glass_name}: vd not float"
            assert isinstance(ve, float), f"{catalog_name}/{glass_name}: ve not float"
            assert vd > 0.0, f"{catalog_name}/{glass_name}: vd={vd} <= 0"
            assert ve > 0.0, f"{catalog_name}/{glass_name}: ve={ve} <= 0"

    @pytest.mark.parametrize("catalog_name", CATALOG_NAMES)
    def test_partial_dispersions_has_required_keys_with_finite_values(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            pd_data = entry["partial_dispersions"]
            assert PARTIAL_DISPERSION_KEYS == set(pd_data.keys()), (
                f"{catalog_name}/{glass_name}: partial_dispersions keys mismatch"
            )
            for k, v in pd_data.items():
                assert isinstance(v, float), (
                    f"{catalog_name}/{glass_name}: partial dispersion {k} not float"
                )
                assert math.isfinite(v), (
                    f"{catalog_name}/{glass_name}: partial dispersion {k}={v} not finite"
                )


class TestGetAllGlassCatalogsData:
    """Tests for get_all_glass_catalogs_data()."""

    def test_returns_dict_with_all_catalog_names(self) -> None:
        from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

        result = get_all_glass_catalogs_data()
        assert isinstance(result, dict)
        assert set(result.keys()) == set(CATALOG_NAMES)

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
