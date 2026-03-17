"""Tests for rayoptics_web_utils.analysis module."""

import pytest
from rayoptics_web_utils.setup import init


@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Run init() once before all tests in this module."""
    init()


@pytest.fixture(scope="module")
def cooke_triplet():
    """Build a configured Cooke Triplet optical model."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

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
    return opm


class TestGetFirstOrderData:
    """Tests for get_first_order_data()."""

    def test_returns_dict(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_first_order_data
        result = get_first_order_data(cooke_triplet)
        assert isinstance(result, dict)

    def test_values_are_floats(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_first_order_data
        result = get_first_order_data(cooke_triplet)
        for v in result.values():
            assert isinstance(v, float)


class TestGet3rdOrderSeidelData:
    """Tests for get_3rd_order_seidel_data()."""

    def test_returns_dict_with_expected_keys(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        result = get_3rd_order_seidel_data(cooke_triplet)
        assert isinstance(result, dict)
        assert 'surfaceBySurface' in result
        assert 'transverse' in result
        assert 'wavefront' in result
        assert 'curvature' in result

    def test_surface_by_surface_has_expected_structure(self, cooke_triplet):
        from rayoptics_web_utils.analysis import get_3rd_order_seidel_data
        result = get_3rd_order_seidel_data(cooke_triplet)
        sbs = result['surfaceBySurface']
        assert 'aberrTypes' in sbs
        assert 'surfaceLabels' in sbs
        assert 'data' in sbs
        assert isinstance(sbs['aberrTypes'], list)
        assert isinstance(sbs['surfaceLabels'], list)
        assert isinstance(sbs['data'], list)
