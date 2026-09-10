"""Behavioral tests for afocal geometry, sampling, and vergence helpers.

Exact finite Object Height coverage verifies that copied off-axis analysis
fields rebuild their chief caches without native wide-angle pupil aiming.
"""

import copy
from types import SimpleNamespace

import numpy as np
import pytest


def _finite_values(values):
    return [value for value in values if value is not None]


def _wide_angle_afocal_model(afocal_two_lens):
    """Return an afocal model whose 40-degree field uses real-pupil aiming."""
    from rayoptics.raytr.opticalspec import FieldSpec

    opm = copy.deepcopy(afocal_two_lens)
    osp = opm.optical_spec
    sm = opm.seq_model
    osp.pupil.value = 1.0
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "angle"],
        value=40.0,
        flds=[0.0, 1.0],
        is_relative=True,
        is_wide_angle=True,
    )
    sm.stop_surface = 3
    for interface in sm.ifcs:
        interface.max_aperture = 100.0
    opm.update_model()
    return opm


def _exact_object_height_afocal_model():
    """Return a finite-object afocal model with exact 4 mm height fields."""
    from rayoptics.raytr.opticalspec import PupilSpec, WvlSpec
    from rayoptics_web_utils.optical_specs import (
        ExactObjectHeightFieldSpec,
        ExactOpticalModel,
    )

    opm = ExactOpticalModel()
    osp = opm.optical_spec
    sm = opm.seq_model
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=1.0)
    osp["fov"] = ExactObjectHeightFieldSpec(
        osp,
        key=["object", "height"],
        value=4.0,
        flds=[0.0, 0.707, 1.0],
        is_relative=True,
        is_wide_angle=True,
    )
    osp["wvls"] = WvlSpec([(587.562, 1)], ref_wl=0)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 100.0

    sm.add_surface([100.0, 0.0, 1.5], sd=100.0)
    sm.add_surface([-100.0, 200.0, "air"], sd=100.0)
    sm.set_stop()
    sm.add_surface([100.0, 0.0, 1.5], sd=100.0)
    sm.add_surface([-100.0, 1.0e10, "air"], sd=100.0)
    opm.update_model()
    return opm


def _synthetic_ray_pkg(point, direction):
    """Build the minimal ray package consumed by afocal output-segment helpers."""
    output = (np.asarray(point, dtype=float), np.asarray(direction, dtype=float))
    image = (np.zeros(3), np.array([0.0, 0.0, 1.0]))
    return ([output, image],)


def _synthetic_opm(refractive_index=1.0):
    """Build the model attributes used by output-vergence calculations."""

    class ConstantMedium:
        def rindex(self, _wavelength_nm):
            return refractive_index

    gap = SimpleNamespace(medium=ConstantMedium())
    return SimpleNamespace(
        seq_model=SimpleNamespace(gaps=[gap]),
        system_spec=SimpleNamespace(dimensions="m"),
    )


class TestAfocalPureHelpers:
    """Exercise afocal helper contracts with small synthetic ray packages."""

    def test_afocal_space_detection_handles_missing_and_finite_conjugates(self):
        from rayoptics_web_utils.analysis._afocal import is_afocal_image_space

        class OpticalSpec:
            def __init__(self, conjugate):
                self.conjugate = conjugate

            def conjugate_type(self, kind):
                assert kind == "image"
                return self.conjugate

        assert is_afocal_image_space(
            SimpleNamespace(optical_spec=OpticalSpec("infinite"))
        )
        assert not is_afocal_image_space(
            SimpleNamespace(optical_spec=OpticalSpec("finite"))
        )
        assert not is_afocal_image_space(object())

    def test_unit_coerces_numeric_text_and_rejects_invalid_directions_exactly(self):
        from rayoptics_web_utils.analysis._afocal import _unit

        np.testing.assert_allclose(_unit(["3.0", "4.0"]), [0.6, 0.8])
        for direction in ([0.0, 0.0, 0.0], [np.nan, 0.0, 1.0]):
            with pytest.raises(
                ValueError,
                match=r"^A finite non-zero ray direction is required\.$",
            ):
                _unit(direction)

    def test_output_segment_uses_penultimate_segment_and_normalizes_direction(self):
        from rayoptics_web_utils.analysis._afocal import output_segment

        ray_pkg = (
            [
                (["1.0", "2.0", "3.0"], [3.0, 4.0, 0.0]),
                ([100.0, 200.0, 300.0], [0.0, 0.0, 1.0]),
            ],
        )

        point, direction = output_segment(ray_pkg)

        assert point.dtype == float
        np.testing.assert_allclose(point, [1.0, 2.0, 3.0])
        np.testing.assert_allclose(direction, [0.6, 0.8, 0.0])

    def test_chief_ray_package_forwards_wavelength_and_focus(self, monkeypatch):
        import rayoptics_web_utils.analysis._afocal as module

        field = object()
        chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
        observed = {}
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                defocus=SimpleNamespace(get_focus=lambda: 2.5)
            )
        )

        def fake_setup_pupil_coords(model, received_field, wavelength, focus):
            observed.update(
                model=model,
                field=received_field,
                wavelength=wavelength,
                focus=focus,
            )
            return None, [chief_pkg]

        monkeypatch.setattr(module.trace, "setup_pupil_coords", fake_setup_pupil_coords)

        assert module._chief_ray_pkg(opm, field, 587.562) is chief_pkg
        assert observed == {
            "model": opm,
            "field": field,
            "wavelength": 587.562,
            "focus": 2.5,
        }

    def test_raw_grid_forwards_vignetting_and_trace_options(self, monkeypatch):
        import rayoptics_web_utils.analysis._afocal as module

        pupil = object()
        field = SimpleNamespace(
            vignetting_bbox=lambda received_pupil: (
                [np.array([-2.0, -1.0]), np.array([3.0, 4.0])]
                if received_pupil is pupil
                else pytest.fail("unexpected pupil")
            )
        )
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                pupil=pupil,
                defocus=SimpleNamespace(get_focus=lambda: 0.75),
            )
        )
        observed = {}

        def fake_trace_ray_grid(*args, **kwargs):
            observed["args"] = args
            observed["kwargs"] = kwargs
            return "raw-grid"

        monkeypatch.setattr(module, "trace_ray_grid", fake_trace_ray_grid)

        assert module._raw_grid(opm, field, 550.0, 9) == "raw-grid"
        assert observed["args"][0] is opm
        np.testing.assert_allclose(observed["args"][1][0], [-2.0, -1.0])
        np.testing.assert_allclose(observed["args"][1][1], [3.0, 4.0])
        assert observed["args"][1][2] == 9
        assert observed["args"][2:] == (field, 550.0, 0.75)
        assert observed["kwargs"] == {
            "append_if_none": True,
            "check_apertures": True,
            "apply_vignetting": False,
        }

    def test_reference_direction_normalizes_each_centroid_sample(self, monkeypatch):
        import rayoptics_web_utils.analysis._afocal as module

        chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
        ray_a = _synthetic_ray_pkg([0.0, 0.0, 0.0], [1.0, 0.0, 1.0])
        ray_b = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 1.0, 1.0])
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                field_of_view=SimpleNamespace(fields=[object()])
            )
        )
        monkeypatch.setattr(module, "_chief_ray_pkg", lambda *args: chief_pkg)

        direction, returned_chief = module.reference_direction(
            opm,
            0,
            550.0,
            image_point="centroid",
            grid=[[
                [0.0, 0.0, ray_a],
                [0.0, 0.5, None],
                [0.5, 0.0, ray_b],
            ]],
        )

        expected = np.array([1.0, 1.0, 2.0]) / np.linalg.norm(
            [1.0, 1.0, 2.0]
        )
        np.testing.assert_allclose(direction, expected)
        assert returned_chief is chief_pkg

    def test_reference_direction_chief_mode_forwards_wavelength_without_sampling(
        self, monkeypatch
    ):
        import rayoptics_web_utils.analysis._afocal as module

        field = object()
        chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                field_of_view=SimpleNamespace(fields=[field])
            )
        )
        observed = {}

        def fake_chief_ray_pkg(model, received_field, wavelength):
            observed.update(
                model=model, field=received_field, wavelength=wavelength
            )
            return chief_pkg

        monkeypatch.setattr(module, "_chief_ray_pkg", fake_chief_ray_pkg)
        monkeypatch.setattr(
            module,
            "_raw_grid",
            lambda *args: pytest.fail("chief-ray mode should not sample a grid"),
        )

        direction, returned_chief = module.reference_direction(
            opm, 0, 587.562, image_point="chief_ray"
        )

        np.testing.assert_allclose(direction, [0.0, 0.0, 1.0])
        assert returned_chief is chief_pkg
        assert observed == {
            "model": opm,
            "field": field,
            "wavelength": 587.562,
        }

    def test_reference_direction_centroid_forwards_wavelength_and_ray_count(
        self, monkeypatch
    ):
        import rayoptics_web_utils.analysis._afocal as module

        field = object()
        chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
        sampled_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [1.0, 0.0, 1.0])
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                field_of_view=SimpleNamespace(fields=[field])
            )
        )
        observed = {}
        monkeypatch.setattr(module, "_chief_ray_pkg", lambda *args: chief_pkg)

        def fake_raw_grid(model, received_field, wavelength, num_rays):
            observed.update(
                model=model,
                field=received_field,
                wavelength=wavelength,
                num_rays=num_rays,
            )
            return [[[0.0, 0.0, sampled_pkg]]]

        monkeypatch.setattr(module, "_raw_grid", fake_raw_grid)

        module.reference_direction(
            opm, 0, 550.0, image_point="centroid", num_rays=13
        )

        assert observed == {
            "model": opm,
            "field": field,
            "wavelength": 550.0,
            "num_rays": 13,
        }

    def test_reference_direction_has_an_exact_no_valid_sample_error(self, monkeypatch):
        import rayoptics_web_utils.analysis._afocal as module

        chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                field_of_view=SimpleNamespace(fields=[object()])
            )
        )
        monkeypatch.setattr(module, "_chief_ray_pkg", lambda *args: chief_pkg)

        with pytest.raises(
            ValueError,
            match=r"^No valid rays are available to compute angular centroid\.$",
        ):
            module.reference_direction(
                opm, 0, 550.0, image_point="centroid", grid=[[[0.0, 0.0, None]]]
            )

    def test_transverse_axes_are_orthonormal_and_use_x_fallback(self):
        from rayoptics_web_utils.analysis._afocal import transverse_axes

        z_sagittal, z_tangential = transverse_axes([0.0, 0.0, 1.0])
        np.testing.assert_allclose(z_sagittal, [1.0, 0.0, 0.0])
        np.testing.assert_allclose(z_tangential, [0.0, 1.0, 0.0])

        sagittal, tangential = transverse_axes([0.3, 0.4, 0.5])
        reference = np.array([0.3, 0.4, 0.5]) / np.linalg.norm([0.3, 0.4, 0.5])
        assert np.linalg.norm(sagittal) == pytest.approx(1.0)
        assert np.linalg.norm(tangential) == pytest.approx(1.0)
        assert np.dot(reference, sagittal) == pytest.approx(0.0)
        assert np.dot(reference, tangential) == pytest.approx(0.0)
        np.testing.assert_allclose(np.cross(reference, sagittal), tangential)

        fallback_sagittal, fallback_tangential = transverse_axes([1.0, 0.0, 0.0])
        np.testing.assert_allclose(fallback_sagittal, [0.0, 1.0, 0.0])
        np.testing.assert_allclose(fallback_tangential, [0.0, 0.0, 1.0])

    def test_finite_output_segment_coerces_numeric_text_and_filters_nonfinite_points(self):
        from rayoptics_web_utils.analysis._afocal import _finite_output_segment

        ray_pkg = (
            [
                (["1.0", "2.0", "3.0"], ["0.0", "0.0", "2.0"]),
                ([0.0, 0.0, 0.0], [0.0, 0.0, 1.0]),
            ],
        )
        point, direction = _finite_output_segment(ray_pkg)

        np.testing.assert_allclose(point, [1.0, 2.0, 3.0])
        np.testing.assert_allclose(direction, [0.0, 0.0, 1.0])

        nonfinite_pkg = (
            [
                ([np.nan, 2.0, 3.0], [0.0, 0.0, 1.0]),
                ([0.0, 0.0, 0.0], [0.0, 0.0, 1.0]),
            ],
        )
        assert _finite_output_segment(nonfinite_pkg) is None

    def test_plane_distance_uses_signed_intersection_and_exact_parallel_error(self):
        from rayoptics_web_utils.analysis._afocal import _plane_distance

        assert _plane_distance(
            np.array([1.0, 2.0, 3.0]),
            np.array([0.0, 0.0, 2.0]),
            np.array([1.0, 2.0, 7.0]),
            np.array([0.0, 0.0, 1.0]),
        ) == pytest.approx(2.0)
        assert _plane_distance(
            np.zeros(3),
            np.array([0.0, 0.0, 1.0e-15]),
            np.array([0.0, 0.0, 1.0]),
            np.array([0.0, 0.0, 1.0]),
        ) == pytest.approx(1.0e15)

        with pytest.raises(
            ValueError,
            match=r"^Exiting ray is parallel to the exit-pupil plane\.$",
        ):
            _plane_distance(
                np.zeros(3),
                np.array([1.0, 0.0, 0.0]),
                np.array([0.0, 0.0, 1.0]),
                np.array([0.0, 1.0, 0.0]),
            )

    def test_afocal_opd_uses_the_documented_path_terms_and_wavelength(self, monkeypatch):
        """Plane-wave OPD combines EIC, traced OPL, and plane propagation."""
        import rayoptics_web_utils.analysis._afocal as module

        ray = [
            (np.array([10.0, 0.0, 0.0]), np.array([1.0, 0.0, 0.0])),
            (np.array([2.0, 3.0, 4.0]), np.array([0.0, 1.0, 0.0])),
            (np.array([1.0, 2.0, 3.0]), np.array([0.0, 0.0, 1.0])),
            (np.zeros(3), np.array([0.0, 0.0, 1.0])),
        ]
        chief_ray = [
            (np.array([20.0, 0.0, 0.0]), np.array([0.0, 1.0, 0.0])),
            (np.array([5.0, 6.0, 7.0]), np.array([1.0, 0.0, 0.0])),
            (np.array([4.0, 5.0, 6.0]), np.array([0.0, 0.0, 1.0])),
            (np.zeros(3), np.array([0.0, 0.0, 1.0])),
        ]
        ray_pkg = (ray, 13.0, 550.0)
        chief_pkg = (chief_ray, 17.0, 550.0)
        eic_calls = []
        plane_calls = []

        def fake_eic(first, second):
            eic_calls.append((first, second))
            return (4.0, 0.5)[len(eic_calls) - 1]

        def fake_plane(point, direction, plane_point, plane_normal):
            plane_calls.append((point, direction, plane_point, plane_normal))
            return (7.0, 11.0)[len(plane_calls) - 1]

        monkeypatch.setattr(module, "eic_distance", fake_eic)
        monkeypatch.setattr(module, "_plane_distance", fake_plane)

        class Medium:
            def __init__(self, index):
                self.index = index

            def rindex(self, wavelength):
                assert wavelength == 587.562
                return self.index

        opm = SimpleNamespace(
            seq_model=SimpleNamespace(
                gaps=[
                    SimpleNamespace(medium=Medium(-1.5)),
                    SimpleNamespace(medium=Medium(9.0)),
                    SimpleNamespace(medium=Medium(-2.0)),
                ]
            )
        )
        plane_point = np.array([9.0, 8.0, 7.0])
        reference = np.array([0.0, 0.0, 1.0])

        result = module.afocal_opd(
            opm, ray_pkg, chief_pkg, plane_point, reference, 587.562
        )

        assert result == pytest.approx(6.75)
        assert len(eic_calls) == 2
        np.testing.assert_allclose(eic_calls[0][0][0], ray[1][0])
        np.testing.assert_allclose(eic_calls[0][0][1], ray[0][1])
        np.testing.assert_allclose(eic_calls[0][1][0], chief_ray[1][0])
        np.testing.assert_allclose(eic_calls[0][1][1], chief_ray[0][1])
        np.testing.assert_allclose(eic_calls[1][0][0], eic_calls[1][1][0])
        np.testing.assert_allclose(eic_calls[1][0][1], eic_calls[1][1][1])
        assert len(plane_calls) == 2
        np.testing.assert_allclose(plane_calls[0][0], ray[2][0])
        np.testing.assert_allclose(plane_calls[1][0], chief_ray[2][0])

    @pytest.mark.parametrize(
        ("dimensions", "expected"),
        [("m", 1.0), ("CM", 100.0), ("mm", 1000.0), ("IN", 39.37007874015748)],
    )
    def test_system_unit_conversion_uses_the_documented_table(self, dimensions, expected):
        from rayoptics_web_utils.analysis._afocal import _system_units_per_metre

        opm = SimpleNamespace(system_spec=SimpleNamespace(dimensions=dimensions))

        assert _system_units_per_metre(opm) == expected

    def test_vergence_coordinates_use_intersection_height_and_direction_slope(self):
        from rayoptics_web_utils.analysis._afocal import _vergence_coordinates

        ray_pkg = _synthetic_ray_pkg([1.0, 0.0, -1.0], [0.2, 0.0, 1.0])

        height, slope = _vergence_coordinates(
            ray_pkg,
            chief_at_pupil=np.array([0.5, 0.0, 0.0]),
            plane_point=np.zeros(3),
            reference=np.array([0.0, 0.0, 1.0]),
            transverse_axis=np.array([1.0, 0.0, 0.0]),
        )

        assert height == pytest.approx(0.7)
        assert slope == pytest.approx(0.2)


@pytest.mark.parametrize("image_point", ["chief_ray", "centroid"])
def test_afocal_transverse_analyses_are_angular_and_image_gap_invariant(afocal_two_lens, image_point):
    from rayoptics_web_utils.analysis import get_ray_fan_data, get_spot_data

    first = copy.deepcopy(afocal_two_lens)
    second = copy.deepcopy(afocal_two_lens)
    first.seq_model.gaps[-1].thi = 1.0e9
    second.seq_model.gaps[-1].thi = 1.0e11
    first.update_model()
    second.update_model()

    fan_a = get_ray_fan_data(first, 1, image_point=image_point)
    fan_b = get_ray_fan_data(second, 1, image_point=image_point)
    spot_a = get_spot_data(first, 1, image_point=image_point)
    spot_b = get_spot_data(second, 1, image_point=image_point)

    assert fan_a[0]["unitY"] == "arcsec"
    assert spot_a[0]["unitX"] == spot_a[0]["unitY"] == "arcsec"
    assert _finite_values(fan_a[0]["Sagittal"]["y"]) == pytest.approx(
        _finite_values(fan_b[0]["Sagittal"]["y"]), abs=1e-7
    )
    assert _finite_values(fan_a[0]["Tangential"]["y"]) == pytest.approx(
        _finite_values(fan_b[0]["Tangential"]["y"]), abs=1e-7
    )
    assert spot_a[0]["x"] == pytest.approx(spot_b[0]["x"], abs=1e-7)
    assert spot_a[0]["y"] == pytest.approx(spot_b[0]["y"], abs=1e-7)
    assert np.all(np.isfinite(_finite_values(fan_a[0]["Tangential"]["y"])))


def test_afocal_opd_and_wavefront_are_finite_and_image_gap_invariant(afocal_two_lens):
    from rayoptics_web_utils.analysis import (
        get_opd_fan_data,
        get_opd_fan_data_for_wavelength,
        get_wavefront_data,
    )

    first = copy.deepcopy(afocal_two_lens)
    second = copy.deepcopy(afocal_two_lens)
    first.seq_model.gaps[-1].thi = 1.0e9
    second.seq_model.gaps[-1].thi = 1.0e11
    first.update_model()
    second.update_model()

    fan_a = get_opd_fan_data(first, 0)
    fan_b = get_opd_fan_data(second, 0)
    centroid_fan_a = get_opd_fan_data_for_wavelength(first, 0, 1, image_point="centroid")
    centroid_fan_b = get_opd_fan_data_for_wavelength(second, 0, 1, image_point="centroid")
    wave_a = get_wavefront_data(first, 0, 1, num_rays=11)
    wave_b = get_wavefront_data(second, 0, 1, num_rays=11)

    assert _finite_values(fan_a[1]["Tangential"]["y"]) == pytest.approx(
        _finite_values(fan_b[1]["Tangential"]["y"]), abs=1e-6
    )
    assert _finite_values(centroid_fan_a["Tangential"]["y"]) == pytest.approx(
        _finite_values(centroid_fan_b["Tangential"]["y"]), abs=1e-6
    )
    finite_wave_a = [value for row in wave_a["z"] for value in row if value is not None]
    finite_wave_b = [value for row in wave_b["z"] for value in row if value is not None]
    assert finite_wave_a == pytest.approx(finite_wave_b, abs=1e-6)
    assert max(abs(value) for value in _finite_values(fan_a[1]["Tangential"]["y"])) < 1e5


def test_wide_angle_exit_pupil_is_cache_order_independent(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_ray_fan_data
    from rayoptics_web_utils.analysis._afocal import (
        _chief_ray_pkg,
        exit_pupil_plane,
        output_segment,
    )

    uncached = _wide_angle_afocal_model(afocal_two_lens)
    cached = copy.deepcopy(uncached)
    wavelength_nm = 587.562

    uncached_field = uncached.optical_spec.field_of_view.fields[1]
    uncached_point, _ = exit_pupil_plane(uncached, uncached_field, wavelength_nm)

    get_ray_fan_data(cached, 1)
    cached_field = cached.optical_spec.field_of_view.fields[1]
    cached_point, _ = exit_pupil_plane(cached, cached_field, wavelength_nm)

    chief_pkg = _chief_ray_pkg(uncached, uncached_field, wavelength_nm)
    chief_point, chief_direction = output_segment(chief_pkg)
    exit_pupil_distance = float(np.dot(uncached_point - chief_point, chief_direction))

    assert cached_point == pytest.approx(uncached_point, abs=1e-8)
    assert abs(exit_pupil_distance) > 1.0


def test_wide_angle_wavefront_is_independent_of_ray_fan_order(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_ray_fan_data, get_wavefront_data

    direct = _wide_angle_afocal_model(afocal_two_lens)
    after_ray_fan = copy.deepcopy(direct)

    direct_wavefront = get_wavefront_data(direct, 1, 1, num_rays=9)
    get_ray_fan_data(after_ray_fan, 1)
    reordered_wavefront = get_wavefront_data(after_ray_fan, 1, 1, num_rays=9)

    assert np.asarray(reordered_wavefront["z"]) == pytest.approx(
        np.asarray(direct_wavefront["z"]), abs=1e-8
    )


@pytest.mark.parametrize(
    ("field_index", "expected_height"),
    [(1, 0.707 * 4.0), (2, 4.0)],
    ids=["0.707-field", "full-field"],
)
def test_exact_object_height_afocal_analysis_prepares_perturbed_chiefs(
    monkeypatch,
    field_index,
    expected_height,
):
    """Perturbed exact fields resolve caches before native wide-angle aiming."""
    from rayoptics_web_utils.analysis import get_opd_fan_data
    from rayoptics_web_utils.analysis._afocal import exit_pupil_plane

    opm = _exact_object_height_afocal_model()
    field = opm.optical_spec.field_of_view.fields[field_index]
    wavelength_nm = opm.optical_spec["wvls"].central_wvl
    assert field.yv == pytest.approx(expected_height)

    def fail_find_real_enp(*_args, **_kwargs):
        raise AssertionError("exact field used native entrance-pupil aiming")

    monkeypatch.setattr(
        "rayoptics.raytr.trace.find_real_enp",
        fail_find_real_enp,
    )

    plane_point, plane_normal = exit_pupil_plane(opm, field, wavelength_nm)
    result = get_opd_fan_data(opm, field_index)

    assert np.all(np.isfinite(plane_point))
    assert np.all(np.isfinite(plane_normal))
    for axis in ("Tangential", "Sagittal"):
        values = _finite_values(result[0][axis]["y"])
        assert values
        assert np.all(np.isfinite(values))


@pytest.mark.parametrize("boundary", [-90.0, 90.0])
def test_exit_pupil_uses_inward_difference_at_angular_boundary(monkeypatch, boundary):
    from rayoptics.raytr.opticalspec import Field
    from rayoptics_web_utils.analysis import _afocal

    distance = 23.0
    eps = 1.0e-4
    field = Field(y=boundary)
    field.aim_info = object()
    field.chief_ray = object()
    field.ref_sphere = object()
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
    observed_caches = []

    def perturbed_chief_ray(_opm, perturbed_field, _wavelength_nm):
        observed_caches.append(
            (perturbed_field.aim_info, perturbed_field.chief_ray, perturbed_field.ref_sphere)
        )
        if abs(perturbed_field.xv) > 0.0 or abs(perturbed_field.yv) > 90.0:
            return _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, np.nan, 1.0])
        delta = perturbed_field.yv - boundary
        return _synthetic_ray_pkg(
            [0.0, -distance * delta, 0.0],
            [0.0, delta, 1.0],
        )

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", perturbed_chief_ray)

    plane_point, plane_normal = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert plane_point == pytest.approx([0.0, 0.0, distance], abs=2e-7)
    assert plane_normal == pytest.approx([0.0, 0.0, 1.0])
    assert observed_caches
    assert all(cache == (None, None, None) for cache in observed_caches)


def test_exit_pupil_uses_central_differences_and_perpendicular_components(monkeypatch):
    """Both field derivatives determine the chief-ray crossing distance."""
    from rayoptics_web_utils.analysis import _afocal

    field = SimpleNamespace(
        xv=0.0,
        yv=0.0,
        fov=SimpleNamespace(is_wide_angle=False),
        update=lambda: None,
    )
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
    chief_point = np.zeros(3)
    chief_direction = np.array([0.0, 0.0, 1.0])

    def fake_chief_ray_pkg(_opm, perturbed_field, _wavelength_nm):
        return SimpleNamespace(xv=perturbed_field.xv, yv=perturbed_field.yv)

    def fake_finite_output_segment(ray_pkg):
        x, y = ray_pkg.xv, ray_pkg.yv
        return (
            chief_point + x * np.array([2.0, 0.0, 5.0]) + y * np.array([0.0, 3.0, 6.0]),
            chief_direction
            + x * np.array([0.1, 0.0, 0.4])
            + y * np.array([0.0, 0.2, 0.3]),
        )

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fake_chief_ray_pkg)
    monkeypatch.setattr(_afocal, "_finite_output_segment", fake_finite_output_segment)

    plane_point, plane_normal = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert plane_point == pytest.approx([0.0, 0.0, -17.5], abs=1.0e-8)
    assert plane_normal == pytest.approx([0.0, 0.0, 1.0])


def test_exit_pupil_uses_forward_difference_when_only_plus_is_available(monkeypatch):
    """A one-sided positive-field sample still locates the crossing plane."""
    from rayoptics_web_utils.analysis import _afocal

    field = SimpleNamespace(
        xv=0.0,
        yv=0.0,
        fov=SimpleNamespace(is_wide_angle=True),
        update=lambda: None,
    )
    chief_point = np.array([1.0, 0.0, 0.0])
    chief_pkg = _synthetic_ray_pkg(chief_point, [0.0, 0.0, 1.0])

    monkeypatch.setattr(
        _afocal,
        "_chief_ray_pkg",
        lambda _opm, perturbed_field, _wavelength: SimpleNamespace(
            yv=perturbed_field.yv
        ),
    )

    def one_sided_segment(ray_pkg):
        if ray_pkg.yv < 0.0:
            return None
        return (
            chief_point + np.array([2.0 * ray_pkg.yv, 0.0, 5.0 * ray_pkg.yv]),
            np.array([0.1 * ray_pkg.yv, 0.0, 1.0 + 0.4 * ray_pkg.yv]),
        )

    monkeypatch.setattr(_afocal, "_finite_output_segment", one_sided_segment)

    point, direction = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert point == pytest.approx([1.0, 0.0, -20.0], abs=1.0e-8)
    assert direction == pytest.approx([0.0, 0.0, 1.0])


def test_exit_pupil_forwards_wavelength_to_the_chief_ray_traces(monkeypatch):
    """Initial and perturbed chief-ray traces use the requested wavelength."""
    from rayoptics_web_utils.analysis import _afocal

    field = SimpleNamespace(xv=0.0, yv=0.0, update=lambda: None)
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
    wavelengths = []

    def fake_chief_ray_pkg(_opm, received_field, wavelength):
        wavelengths.append(wavelength)
        if received_field is field:
            return chief_pkg
        return SimpleNamespace(xv=received_field.xv, yv=received_field.yv)

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fake_chief_ray_pkg)
    monkeypatch.setattr(
        _afocal,
        "_finite_output_segment",
        lambda _ray_pkg: (np.zeros(3), np.array([0.0, 0.0, 1.0])),
    )

    _afocal.exit_pupil_plane(object(), field, 532.0)

    assert wavelengths == [532.0, 532.0, 532.0, 532.0, 532.0]


def test_exit_pupil_falls_back_to_the_chief_point_without_usable_derivatives(
    monkeypatch,
):
    """Unavailable perturbations leave the exit-pupil distance at zero."""
    from rayoptics_web_utils.analysis import _afocal

    field = SimpleNamespace(xv=0.0, yv=0.0, update=lambda: None)
    chief_pkg = _synthetic_ray_pkg([1.0, 2.0, 3.0], [0.0, 0.0, 1.0])
    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: object())
    monkeypatch.setattr(_afocal, "output_segment", lambda _pkg: (
        np.array([1.0, 2.0, 3.0]), np.array([0.0, 0.0, 1.0])
    ))
    monkeypatch.setattr(_afocal, "_finite_output_segment", lambda _pkg: None)

    point, direction = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert point == pytest.approx([1.0, 2.0, 3.0])
    assert direction == pytest.approx([0.0, 0.0, 1.0])


def test_exit_pupil_ignores_a_differential_direction_at_the_power_threshold(
    monkeypatch,
):
    """A squared differential norm equal to the cutoff is unresolved."""
    from rayoptics_web_utils.analysis import _afocal

    field = SimpleNamespace(
        xv=0.0,
        yv=0.0,
        fov=SimpleNamespace(is_wide_angle=True),
        update=lambda: None,
    )
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
    differential = np.sqrt(5.0e-21)
    monkeypatch.setattr(
        _afocal,
        "_chief_ray_pkg",
        lambda _opm, perturbed_field, _wavelength: SimpleNamespace(
            yv=perturbed_field.yv
        ),
    )
    monkeypatch.setattr(
        _afocal,
        "_finite_output_segment",
        lambda ray_pkg: (
            np.array([2.0 * ray_pkg.yv, 0.0, 0.0]),
            np.array(
                [differential * ray_pkg.yv, differential * ray_pkg.yv, 1.0]
            ),
        ),
    )

    point, _ = _afocal.exit_pupil_plane(
        object(), field, 587.562, chief_pkg=chief_pkg
    )

    assert point == pytest.approx([0.0, 0.0, 0.0])


def test_exit_pupil_propagates_unexpected_perturbation_errors(monkeypatch):
    from rayoptics.raytr.opticalspec import Field
    from rayoptics_web_utils.analysis import _afocal

    def fail_trace(_opm, _field, _wavelength_nm):
        raise RuntimeError("unexpected trace failure")

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fail_trace)
    chief_pkg = _synthetic_ray_pkg([0.0, 0.0, 0.0], [0.0, 0.0, 1.0])

    with pytest.raises(RuntimeError, match="unexpected trace failure"):
        _afocal.exit_pupil_plane(object(), Field(), 587.562, chief_pkg=chief_pkg)


@pytest.mark.parametrize("field_angle", [0.0, 47.0])
def test_output_vergence_uses_exact_local_direction_slope(monkeypatch, field_angle):
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array(
        [0.0, np.sin(np.deg2rad(field_angle)), np.cos(np.deg2rad(field_angle))]
    )
    axis = _afocal.transverse_axes(reference)[1]
    aperture_angle = np.deg2rad(35.0)
    height = 0.25
    refractive_index = 1.5
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    ray_pkg = _synthetic_ray_pkg(
        height * axis,
        np.cos(aperture_angle) * reference + np.sin(aperture_angle) * axis,
    )
    opm = _synthetic_opm(refractive_index)
    opm.system_spec.dimensions = "cm"

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: ray_pkg)

    result = _afocal.output_vergence(opm, object(), 587.562, [0.0, 1.0], axis=1)

    expected = -refractive_index * np.tan(aperture_angle) / height * 100.0
    assert result == pytest.approx(expected, rel=1e-12)


def test_output_vergence_forwards_wavelength_and_uses_the_chief_plane_intersection(
    monkeypatch,
):
    """Vergence traces use one wavelength and the chief point on the plane."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    sampled_pkg = object()
    observed = {}
    opm = _synthetic_opm(1.5)
    opm.system_spec.dimensions = "cm"
    opm.seq_model.gaps[0].medium = SimpleNamespace(
        rindex=lambda wavelength: (
            1.5 if wavelength == 532.0 else pytest.fail("unexpected wavelength")
        )
    )

    def fake_chief(model, field, wavelength):
        observed["chief"] = (model, field, wavelength)
        return chief_pkg

    def fake_exit(model, field, wavelength, *, chief_pkg):
        observed["exit"] = (model, field, wavelength, chief_pkg)
        return np.array([0.0, 0.0, 5.0]), reference

    def fake_trace(model, pupil, field, wavelength):
        observed["trace"] = (model, pupil, field, wavelength)
        return sampled_pkg

    def fake_coordinates(ray_pkg, chief_at_pupil, plane_point, normal, axis):
        observed["coordinates"] = (
            ray_pkg,
            chief_at_pupil,
            plane_point,
            normal,
            axis,
        )
        return 0.5, -0.25

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fake_chief)
    monkeypatch.setattr(_afocal, "exit_pupil_plane", fake_exit)
    monkeypatch.setattr(_afocal, "_trace_pkg", fake_trace)
    monkeypatch.setattr(_afocal, "_vergence_coordinates", fake_coordinates)

    field = object()
    result = _afocal.output_vergence(opm, field, 532.0, [0.25, -0.5], axis=1)

    assert result == pytest.approx(75.0)
    assert observed["chief"] == (opm, field, 532.0)
    assert observed["exit"] == (opm, field, 532.0, chief_pkg)
    assert observed["trace"] == (opm, [0.25, -0.5], field, 532.0)
    assert observed["coordinates"][0] is sampled_pkg
    assert observed["coordinates"][1] == pytest.approx([0.0, 0.0, 5.0])
    assert observed["coordinates"][2] == pytest.approx([0.0, 0.0, 5.0])
    assert observed["coordinates"][3] == pytest.approx(reference)
    assert observed["coordinates"][4] == pytest.approx([0.0, 1.0, 0.0])


def test_output_vergence_returns_nan_for_a_failed_sampled_ray(monkeypatch):
    """A failed output-ray trace has no finite vergence."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    opm = _synthetic_opm()
    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: None)

    result = _afocal.output_vergence(opm, object(), 587.562, [0.0, 1.0], axis=0)

    assert np.isnan(result)


def test_output_vergence_does_not_round_a_height_at_the_resolution_boundary(
    monkeypatch,
):
    """A height exactly at the cutoff still uses the signed vergence formula."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    opm = _synthetic_opm(1.5)
    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: object())
    monkeypatch.setattr(
        _afocal,
        "_vergence_coordinates",
        lambda *_args: (1.0e-15, 2.0),
    )

    result = _afocal.output_vergence(opm, object(), 587.562, [0.0, 1.0], axis=0)

    assert result == pytest.approx(-3.0e15)


def test_output_vergence_returns_zero_below_the_height_resolution_boundary(
    monkeypatch,
):
    """A height below the cutoff is intentionally treated as unresolved."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    opm = _synthetic_opm(1.5)
    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: object())
    monkeypatch.setattr(
        _afocal,
        "_vergence_coordinates",
        lambda *_args: (0.5e-15, 2.0),
    )

    result = _afocal.output_vergence(opm, object(), 587.562, [0.0, 1.0], axis=0)

    assert result == 0.0


def test_differential_vergence_uses_both_pupil_signs_and_central_slope(monkeypatch):
    from rayoptics_web_utils.analysis import _afocal

    field_angle = np.deg2rad(40.0)
    reference = np.array([0.0, np.sin(field_angle), np.cos(field_angle)])
    axis = _afocal.transverse_axes(reference)[1]
    refractive_index = 1.3
    heights = {-1.0: -0.002, 1.0: 0.003}
    slopes = {-1.0: -0.006, 1.0: 0.004}
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    calls = []
    opm = _synthetic_opm(refractive_index)
    opm.system_spec.dimensions = "cm"

    def trace_pupil(_opm, pupil, _field, _wavelength_nm):
        sign = float(np.sign(pupil[1]))
        calls.append(float(pupil[1]))
        return _synthetic_ray_pkg(
            heights[sign] * axis,
            reference + slopes[sign] * axis,
        )

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", trace_pupil)

    result = _afocal.differential_output_vergence(opm, object(), 587.562, axis=1)

    expected = -refractive_index * (
        (slopes[1.0] - slopes[-1.0]) / (heights[1.0] - heights[-1.0])
    )
    assert calls == pytest.approx([-1.0e-4, 1.0e-4])
    assert result == pytest.approx(expected * 100.0, rel=1e-12)


def test_differential_vergence_forwards_wavelength_and_chief_package(monkeypatch):
    """The differential pair shares the requested wavelength and chief plane."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    observed = {"trace": []}

    def fake_chief(model, field, wavelength):
        observed["chief"] = (model, field, wavelength)
        return chief_pkg

    def fake_exit(model, field, wavelength, *, chief_pkg):
        observed["exit"] = (model, field, wavelength, chief_pkg)
        return np.array([0.0, 0.0, 5.0]), reference

    def fake_trace(model, pupil, field, wavelength):
        assert pupil.shape == (2,)
        observed["trace"].append((model, pupil.copy(), field, wavelength))
        return float(pupil[1])

    def fake_coordinates(ray_pkg, chief_at_pupil, plane_point, normal, axis):
        observed.setdefault("coordinates", []).append(
            (ray_pkg, chief_at_pupil.copy(), plane_point, normal, axis)
        )
        return float(ray_pkg), 2.0 * float(ray_pkg)

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", fake_chief)
    monkeypatch.setattr(_afocal, "exit_pupil_plane", fake_exit)
    monkeypatch.setattr(_afocal, "_trace_pkg", fake_trace)
    monkeypatch.setattr(_afocal, "_vergence_coordinates", fake_coordinates)

    opm = _synthetic_opm(1.2)
    opm.seq_model.gaps[0].medium = SimpleNamespace(
        rindex=lambda wavelength: (
            1.2 if wavelength == 532.0 else pytest.fail("unexpected wavelength")
        )
    )
    field = object()
    result = _afocal.differential_output_vergence(opm, field, 532.0, axis=1)

    assert np.isfinite(result)
    assert observed["chief"] == (opm, field, 532.0)
    assert observed["exit"] == (opm, field, 532.0, chief_pkg)
    assert [call[3] for call in observed["trace"]] == [532.0, 532.0]
    np.testing.assert_allclose(
        [call[1][1] for call in observed["trace"]], [-1.0e-4, 1.0e-4]
    )
    assert all(
        call[1] == pytest.approx([0.0, 0.0, 5.0])
        for call in observed["coordinates"]
    )


def test_differential_vergence_uses_the_strict_height_resolution_boundary(
    monkeypatch,
):
    """A one-e-15 height separation remains a resolvable derivative."""
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)
    samples = iter([(0.0, -1.0), (1.0e-15, 1.0)])
    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", lambda *_args: object())
    monkeypatch.setattr(_afocal, "_vergence_coordinates", lambda *_args: next(samples))

    result = _afocal.differential_output_vergence(
        _synthetic_opm(1.5), object(), 587.562, axis=1
    )

    assert result == pytest.approx(-3.0e15)


@pytest.mark.parametrize("case", ["failed", "unresolved-height"])
def test_differential_vergence_preserves_failed_and_unresolved_results(monkeypatch, case):
    from rayoptics_web_utils.analysis import _afocal

    reference = np.array([0.0, 0.0, 1.0])
    axis = _afocal.transverse_axes(reference)[1]
    chief_pkg = _synthetic_ray_pkg(np.zeros(3), reference)

    def trace_pupil(_opm, pupil, _field, _wavelength_nm):
        sign = float(np.sign(pupil[1]))
        if case == "failed" and sign < 0.0:
            return None
        height = 0.001 if case == "unresolved-height" else sign * 0.001
        return _synthetic_ray_pkg(height * axis, reference + sign * 0.002 * axis)

    monkeypatch.setattr(_afocal, "_chief_ray_pkg", lambda *_args: chief_pkg)
    monkeypatch.setattr(
        _afocal,
        "exit_pupil_plane",
        lambda *_args, **_kwargs: (np.zeros(3), reference),
    )
    monkeypatch.setattr(_afocal, "_trace_pkg", trace_pupil)

    result = _afocal.differential_output_vergence(
        _synthetic_opm(), object(), 587.562, axis=1
    )

    if case == "failed":
        assert np.isnan(result)
    else:
        assert result == 0.0


def test_afocal_diffraction_payloads_use_exit_pupil_angular_scale(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_diffraction_mtf_data, get_diffraction_psf_data

    psf = get_diffraction_psf_data(afocal_two_lens, 0, 1, num_rays=16, max_dims=64)
    mtf = get_diffraction_mtf_data(afocal_two_lens, 0, 1, num_rays=16, max_dims=64)

    assert psf["unitX"] == psf["unitY"] == "arcsec"
    assert mtf["unitX"] == "cycles/arcsec"
    assert mtf["scaleKind"] == "exit-pupil"
    assert mtf["exitPupilDiameterTangential"] > 0.0
    assert mtf["exitPupilDiameterSagittal"] > 0.0
    expected_cutoff = mtf["exitPupilDiameterTangential"] / (587.562e-6) / 206264.806247
    assert mtf["cutoffTangential"] == pytest.approx(expected_cutoff, rel=1e-8)


def test_afocal_geometric_psf_is_an_angular_cloud(afocal_two_lens):
    from rayoptics_web_utils.analysis import get_geo_psf_data

    result = get_geo_psf_data(afocal_two_lens, 1, 1, num_rays=8)

    assert result["unitX"] == result["unitY"] == "arcsec"
    assert len(result["x"]) == len(result["y"]) > 0
    assert np.all(np.isfinite(result["x"]))
    assert np.all(np.isfinite(result["y"]))


def test_finite_mtf_metadata_remains_image_na(cooke_triplet):
    from rayoptics_web_utils.analysis import get_diffraction_mtf_data

    result = get_diffraction_mtf_data(cooke_triplet, 0, 1, num_rays=16, max_dims=64)

    assert result["scaleKind"] == "image-na"
    assert result["naTangential"] > 0.0
    assert result["naSagittal"] > 0.0


def test_afocal_longitudinal_payloads_use_output_vergence(afocal_two_lens):
    from rayoptics_web_utils.analysis import (
        get_astigmatism_curve_data,
        get_field_curvature_data,
        get_lsa_data,
    )

    field = get_field_curvature_data(afocal_two_lens, 1, num_points=3)
    astigmatism = get_astigmatism_curve_data(afocal_two_lens, 1, num_points=3)
    lsa = get_lsa_data(afocal_two_lens, num_points=3)

    assert field["unitX"] == "D"
    assert astigmatism["unitX"] == "D"
    assert all(series["unitX"] == "D" for series in lsa)
    assert np.all(np.isfinite(field["Sagittal"]["x"]))
    assert np.all(np.isfinite(field["Tangential"]["x"]))
    assert np.all(np.isfinite(lsa[1]["LSA"]["x"]))
