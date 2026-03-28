"""Tests for rayoptics_web_utils.glass module."""

import math
import pytest

CATALOG_NAMES = ["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"]
REQUIRED_KEYS = {
    "refractive_index_d",
    "refractive_index_e",
    "abbe_number_d",
    "abbe_number_e",
    "dispersion_coefficients",
    "partial_dispersions",
}
PARTIAL_DISPERSION_KEYS = {"P_F_e", "P_F_d", "P_g_F"}


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
    def test_dispersion_coefficients_is_nonempty_str_float_dict(
        self, catalog_name: str
    ) -> None:
        from rayoptics_web_utils.glass.glass import get_glass_catalog_data

        result = get_glass_catalog_data(catalog_name)
        for glass_name, entry in result.items():
            coeffs = entry["dispersion_coefficients"]
            assert isinstance(coeffs, dict), (
                f"{catalog_name}/{glass_name}: dispersion_coefficients not dict"
            )
            assert len(coeffs) > 0, (
                f"{catalog_name}/{glass_name}: dispersion_coefficients empty"
            )
            for k, v in coeffs.items():
                assert isinstance(k, str), (
                    f"{catalog_name}/{glass_name}: coeff key {k!r} not str"
                )
                assert isinstance(v, float), (
                    f"{catalog_name}/{glass_name}: coeff value for {k!r} not float"
                )

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
