"""Test tabulated-material registration, rendering, mapping, and exports."""

import pytest
from rayoptics_web_utils.glass.user_defined_materials import UserDefinedMaterial

ohara_s_bsm22 = [
    (435.835, 1.63696),
    (441.57, 1.63115),
    (479.99, 1.63115),
    (486.13, 1.63047),
    (546.07, 1.62508),
    (587.56, 1.6223),
    (589.29, 1.62219),
    (632.8, 1.61985),
    (643.85, 1.61933),
    (656.27, 1.61877),
]

ohara_s_spl53 = [
    (435.835, 1.44442),
    (486.13, 1.44195),
    (546.07, 1.43985),
    (587.56, 1.43875),
    (656.27, 1.43733),
]

only_four_data_points = [
    (400, 1.8),
    (500, 1.7),
    (600, 1.6),
    (700, 1.5),
]

def test_no_duplicate_keys_allowed() -> None:
    user_defined_materials = UserDefinedMaterial()
    key = "some_material_label"
    with pytest.raises(KeyError, match="Key 'some_material_label' already exists."):
        user_defined_materials[key] = ohara_s_bsm22
        user_defined_materials[key] = ohara_s_bsm22

def test_required_at_least_4_pairs() -> None:
    user_defined_materials = UserDefinedMaterial()

    for i in range(0, 4):
        with pytest.raises(
            ValueError,
            match=r"^At least 4 wavelength-refractive index pairs are required\.$",
        ):
            user_defined_materials[f"pairs_{i}"] = [only_four_data_points[j] for j in range(i)]
    

def test_catalog_attribute() -> None:
    user_defined_materials = UserDefinedMaterial()
    key = "some_material_label"
    user_defined_materials[key] = only_four_data_points
    assert user_defined_materials[key]._catalog == "custom"


def test_glass_code_is_float_parseable_for_rayoptics_rendering() -> None:
    user_defined_materials = UserDefinedMaterial()
    key = "some_material_label"
    user_defined_materials[key] = only_four_data_points

    assert isinstance(float(user_defined_materials[key].glass_code()), float)


def test_get_one_material_data() -> None:
    user_defined_materials = UserDefinedMaterial()
    key = "some_material_label"
    user_defined_materials[key] = ohara_s_bsm22

    material_data = user_defined_materials.get_one_material_data(key)
    assert key in material_data
    assert material_data[key]["dispersionCoeffKind"] == "tabulated"
    assert material_data[key]["dispersionCoeffs"] == ohara_s_bsm22
    assert material_data[key]["refractiveIndexD"] - 1.6223 < 1e-5
    assert material_data[key]["refractiveIndexE"] - 1.62508 < 1e-5
    assert material_data[key]["abbeNumberD"] - 53.17 < 1
    assert material_data[key]["abbeNumberE"] - 52.88 < 1

    assert "partialDispersions" in material_data[key]
    assert material_data[key]["partialDispersions"]["P_fe"] - 0.4607 < 0.01
    assert material_data[key]["partialDispersions"]["P_Fd"] - 0.6983 < 0.01
    assert material_data[key]["partialDispersions"]["P_gF"] - 0.5542 < 0.01

def test_get_materials_data() -> None:
    user_defined_materials = UserDefinedMaterial()
    key1 = "material_1"
    key2 = "material_2"
    key3 = "material_3"
    user_defined_materials[key1] = ohara_s_bsm22
    user_defined_materials[key2] = ohara_s_spl53
    user_defined_materials[key3] = only_four_data_points

    materials_data = user_defined_materials.get_materials_data([key1, key2])
    assert len(materials_data) == 2
    assert key1 in materials_data
    assert key2 in materials_data
    assert key3 not in materials_data

def test_get_all_materials_data() -> None:
    user_defined_materials = UserDefinedMaterial()
    key1 = "material_1"
    key2 = "material_2"
    key3 = "material_3"
    user_defined_materials[key1] = ohara_s_bsm22
    user_defined_materials[key2] = ohara_s_spl53
    user_defined_materials[key3] = only_four_data_points

    all_materials_data = user_defined_materials.get_all_materials_data()
    assert len(all_materials_data) == 3
    assert key1 in all_materials_data
    assert key2 in all_materials_data
    assert key3 in all_materials_data


def test_mapping_protocol_iterates_and_deletes_registered_materials() -> None:
    user_defined_materials = UserDefinedMaterial()
    user_defined_materials["material"] = only_four_data_points

    assert len(user_defined_materials) == 1
    assert list(user_defined_materials) == ["material"]
    assert user_defined_materials["material"] is not None

    del user_defined_materials["material"]

    assert len(user_defined_materials) == 0
    with pytest.raises(KeyError):
        user_defined_materials["material"]


def test_missing_material_errors_include_the_requested_label() -> None:
    user_defined_materials = UserDefinedMaterial()

    with pytest.raises(KeyError, match="Material 'missing' does not exist."):
        user_defined_materials.get_one_material_data("missing")
    with pytest.raises(KeyError, match="Material 'missing' does not exist."):
        user_defined_materials.get_materials_data(["missing"])


def test_render_safe_glass_code_uses_nm_fraunhofer_samples() -> None:
    from rayoptics_web_utils.glass import user_defined_materials as module

    class RecordingMaterial:
        def __init__(self) -> None:
            self.wavelengths = []

        def rindex(self, wavelength):
            self.wavelengths.append(wavelength)
            values = {
                module._WL_D * 1000.0: 1.5234,
                module._WL_F * 1000.0: 1.54,
                module._WL_C * 1000.0: 1.51,
            }
            for expected_wavelength, value in values.items():
                if wavelength == pytest.approx(expected_wavelength):
                    return value
            raise AssertionError(f"unexpected wavelength: {wavelength}")

    material = RecordingMaterial()

    assert module._render_safe_glass_code(material) == "523174"
    assert material.wavelengths == pytest.approx(
        [module._WL_D * 1000.0, module._WL_F * 1000.0, module._WL_C * 1000.0]
    )


def test_get_one_material_data_converts_all_fraunhofer_wavelengths_to_nm() -> None:
    from rayoptics_web_utils.glass import user_defined_materials as module

    class RecordingMedium:
        wvls = [400.0, 500.0, 600.0, 700.0]
        rndx = [1.8, 1.7, 1.6, 1.5]

        def __init__(self) -> None:
            self.wavelengths = []

        def rindex(self, wavelength):
            self.wavelengths.append(wavelength)
            return 1.4 + wavelength / 10000.0

    medium = RecordingMedium()
    user_defined_materials = UserDefinedMaterial()
    user_defined_materials.map["synthetic"] = medium

    result = user_defined_materials.get_one_material_data("synthetic")["synthetic"]

    assert medium.wavelengths == pytest.approx(
        [
            module._WL_D * 1000.0,
            module._WL_E * 1000.0,
            module._WL_F * 1000.0,
            module._WL_C * 1000.0,
            module._WL_G * 1000.0,
        ]
    )
    assert result["dispersionCoeffs"] == list(zip(medium.wvls, medium.rndx))
    assert result["refractiveIndexD"] == pytest.approx(1.45876)
    assert result["refractiveIndexE"] == pytest.approx(1.45461)


def test_setitem_passes_the_label_and_custom_catalog_to_the_medium(monkeypatch) -> None:
    from rayoptics_web_utils.glass import user_defined_materials as module

    calls = []

    class FakeMedium:
        def __init__(self, *args, **kwargs) -> None:
            calls.append((args, kwargs))

    monkeypatch.setattr(module.opticalmedium, "InterpolatedMedium", FakeMedium)
    user_defined_materials = UserDefinedMaterial()

    user_defined_materials["synthetic"] = only_four_data_points

    assert calls == [
        (("synthetic",), {"pairs": only_four_data_points, "cat": "custom"})
    ]


