"""Tests for rayoptics_web_utils.analysis module."""


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
