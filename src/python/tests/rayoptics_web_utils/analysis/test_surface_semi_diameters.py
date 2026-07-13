"""Tests for sequential-interface semi-diameter extraction."""


class FloatLike:
    def __float__(self):
        return 3.25


class Interface:
    def __init__(self, value):
        self.value = value

    def surface_od(self):
        return self.value


class SequentialModel:
    def __init__(self, interfaces):
        self.ifcs = interfaces


class OpticalModel:
    def __init__(self, interfaces):
        self.seq_model = SequentialModel(interfaces)


def test_get_surface_semi_diameters_preserves_interface_order_and_endpoints():
    from rayoptics_web_utils.analysis import get_surface_semi_diameters

    opm = OpticalModel([
        Interface(100),  # Object
        Interface(5),
        Interface(7),
        Interface(200),  # Image
    ])

    assert get_surface_semi_diameters(opm) == [100.0, 5.0, 7.0, 200.0]


def test_get_surface_semi_diameters_converts_values_to_builtin_float():
    from rayoptics_web_utils.analysis import get_surface_semi_diameters

    result = get_surface_semi_diameters(OpticalModel([Interface(FloatLike())]))

    assert result == [3.25]
    assert type(result[0]) is float


def test_get_surface_semi_diameters_uses_surface_od_for_rectangular_extent():
    from rayoptics.elem.surface import Surface

    from rayoptics_web_utils.aperture import OffsetRotatedRectangular
    from rayoptics_web_utils.analysis import get_surface_semi_diameters

    rectangular_interface = Surface()
    rectangular_interface.clear_apertures = [
        OffsetRotatedRectangular(x_half_width=4, y_half_width=3)
    ]

    assert get_surface_semi_diameters(OpticalModel([rectangular_interface])) == [5.0]


def test_top_level_package_exports_get_surface_semi_diameters():
    import rayoptics_web_utils

    assert callable(rayoptics_web_utils.get_surface_semi_diameters)
