"""Tests for rayoptics_web_utils.analysis module."""

import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()


class TestGetFirstOrderData:
    """Tests for get_first_order_data()."""

    def test_returns_dict(self):
        from rayoptics_web_utils.analysis import get_first_order_data
        from rayoptics.environment import OpticalModel
        opm = OpticalModel()
        result = get_first_order_data(opm)
        assert isinstance(result, dict)

    def test_values_are_floats(self):
        from rayoptics_web_utils.analysis import get_first_order_data
        from rayoptics.environment import OpticalModel
        opm = OpticalModel()
        result = get_first_order_data(opm)
        for v in result.values():
            assert isinstance(v, float)


class TestGet3rdOrderSeidelData:
    """Tests for get_3rd_order_seidel_data()."""

    def test_returns_dict_with_expected_keys(self):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        from rayoptics.environment import OpticalModel
        opm = OpticalModel()
        result = get_3rd_order_seidel_data(opm)
        assert isinstance(result, dict)
        assert 'surfaceBySurface' in result
        assert 'transverse' in result
        assert 'wavefront' in result
        assert 'curvature' in result

    def test_surface_by_surface_has_expected_structure(self):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        from rayoptics.environment import OpticalModel
        opm = OpticalModel()
        result = get_3rd_order_seidel_data(opm)
        sbs = result['surfaceBySurface']
        assert 'aberrTypes' in sbs
        assert 'surfaceLabels' in sbs
        assert 'data' in sbs
        assert isinstance(sbs['aberrTypes'], list)
        assert isinstance(sbs['surfaceLabels'], list)
        assert isinstance(sbs['data'], list)
