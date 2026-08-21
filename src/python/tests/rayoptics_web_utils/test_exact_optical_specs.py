"""Regression tests for opt-in exact real-ray optical specifications.

Wide-angle fields keep RayOptics' paraxial data for first-order reporting while
requiring verified physical launches. Finite Object Height holds every pupil
ray at its requested object point and solves the chief direction locally;
Image Height reuses native real-image-height aiming when it meets the stricter
project tolerance. Both cache chief rays with the optical-path convention
expected by OPD analysis. False and omitted flags delegate to plain RayOptics.
Exact Object-NA vignetting treats the unit angular-pupil boundary as a hard
limit, while aperture-clipped boundary rays retain RayOptics' inward bisection.
These tests exercise the public exact model and field classes through normal
tracing calls. The baseline model comes from the core optical module so
collection stays headless before the session fixture can install GUI stubs.
"""

from __future__ import annotations

from math import acos, atan, sin
from types import SimpleNamespace
from typing import Callable

import numpy as np
import pytest
import rayoptics.optical.model_constants as mc
from rayoptics.raytr import raytrace
from rayoptics.optical.opticalmodel import OpticalModel
from rayoptics.elem.surface import Circular, DecenterData
from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
from rayoptics.raytr.trace import get_chief_ray_pkg, trace_base
from rayoptics.raytr.traceerror import TraceRayBlockedError
from rayoptics.raytr.wideangle import (
    eval_real_image_ht as rayoptics_eval_real_image_ht,
)
from rayoptics.seq.medium import decode_medium
from scipy.optimize import least_squares, root as scipy_root

import rayoptics_web_utils.optical_specs as exact_optical_specs
from rayoptics_web_utils.optical_specs import (
    ExactImageHeightFieldSpec,
    ExactObjectHeightFieldSpec,
    ExactOpticalModel,
    ExactSpecConvergenceError,
    ExactSpecError,
    ExactSpecTraceError,
)


REFERENCE_WAVELENGTH_NM = 587.562


def test_exact_object_height_field_is_a_lazy_public_export():
    """The package root exposes the finite Object Height field class."""
    import rayoptics_web_utils

    assert (
        rayoptics_web_utils.ExactObjectHeightFieldSpec
        is ExactObjectHeightFieldSpec
    )


def _ray_angle(first_direction: np.ndarray, second_direction: np.ndarray) -> float:
    """Return the unsigned angle between two normalized ray directions."""
    first = first_direction / np.linalg.norm(first_direction)
    second = second_direction / np.linalg.norm(second_direction)
    return acos(float(np.clip(np.dot(first, second), -1.0, 1.0)))


def _trace_axial_rays(opm: OpticalModel):
    """Trace the on-axis chief and +Y marginal rays without clipping."""
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]
    wavelength = osp["wvls"].central_wvl
    return [
        trace_base(
            opm,
            pupil,
            field,
            wavelength,
            apply_vignetting=False,
            check_apertures=False,
        )
        for pupil in ([0.0, 0.0], [0.0, 1.0])
    ]


def _image_space_angle(opm: OpticalModel) -> float:
    """Return the real image-space angle between axial chief and +Y rays."""
    chief, marginal = _trace_axial_rays(opm)
    chief_direction = np.asarray(chief[mc.ray][-1][mc.d])
    marginal_direction = np.asarray(marginal[mc.ray][-1][mc.d])
    return _ray_angle(chief_direction, marginal_direction)


def _build_cooke(
    model_factory: Callable[[], OpticalModel],
    *,
    pupil_key: tuple[str, str],
    pupil_value: float,
    field_key: tuple[str, str] = ("object", "angle"),
    max_field: float = 0.0,
    fields: list[float] | None = None,
    object_distance: float = 1.0e10,
    image_distance: float = 41.2365,
    vector_solver: Callable | None = None,
    native_image_height_evaluator: Callable | None = None,
    is_wide_angle: bool | None = True,
    image_curvature_radius: float = 0.0,
    stop_offset_y: float = 0.0,
    stop_offset_x: float = 0.0,
    stop_decenter: tuple[float, float] | None = None,
    use_exact_image_height_field: bool = True,
    use_exact_object_height_field: bool = True,
    update: bool = True,
) -> OpticalModel:
    """Build a clear-aperture-free Cooke triplet for exact-spec tests."""
    opm = model_factory()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=pupil_key, value=pupil_value)
    if field_key == ("image", "height") and use_exact_image_height_field:
        field_class = ExactImageHeightFieldSpec
    elif (
        field_key == ("object", "height")
        and use_exact_object_height_field
    ):
        field_class = ExactObjectHeightFieldSpec
    else:
        field_class = FieldSpec
    field_kwargs = {}
    if field_class in (ExactImageHeightFieldSpec, ExactObjectHeightFieldSpec):
        field_kwargs["vector_solver"] = vector_solver
    if field_class is ExactImageHeightFieldSpec:
        field_kwargs["native_image_height_evaluator"] = (
            native_image_height_evaluator
        )
    if is_wide_angle is not None:
        field_kwargs["is_wide_angle"] = is_wide_angle
    osp["fov"] = field_class(
        osp,
        key=field_key,
        value=max_field,
        flds=fields if fields is not None else [0.0],
        is_relative=True,
        **field_kwargs,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = object_distance
    sm.gaps[0].medium = decode_medium("air")

    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface([7331.288, 5.86, "air"], sd=100.0)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=100.0)
    sm.set_stop()
    if stop_offset_x != 0.0 or stop_offset_y != 0.0:
        sm.ifcs[sm.stop_surface].clear_apertures = [
            Circular(
                radius=100.0,
                x_offset=stop_offset_x,
                y_offset=stop_offset_y,
            )
        ]
    if stop_decenter is not None:
        sm.ifcs[sm.stop_surface].decenter = DecenterData(
            "decenter",
            x=stop_decenter[0],
            y=stop_decenter[1],
        )
    sm.add_surface([21.896, 4.822, "air"], sd=100.0)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface([-20.4942, image_distance, "air"], sd=100.0)
    sm.ifcs[-1].profile.r = image_curvature_radius

    if update:
        opm.update_model()
    return opm


def _build_uniform_medium_na_model(
    na: float,
    *,
    object_index: float = 1.5,
    field_angle: float = 0.0,
    is_wide_angle: bool | None = True,
) -> ExactOpticalModel:
    """Build an unpowered model whose object-space angle is easy to verify."""
    opm = ExactOpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=("object", "NA"), value=na)
    field_kwargs = {}
    if is_wide_angle is not None:
        field_kwargs["is_wide_angle"] = is_wide_angle
    osp["fov"] = FieldSpec(
        osp,
        key=("object", "angle"),
        value=field_angle,
        flds=[0.0 if field_angle == 0.0 else 1.0],
        is_relative=True,
        **field_kwargs,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 10.0
    sm.gaps[0].medium = decode_medium(object_index)
    sm.add_surface([0.0, 5.0, object_index], sd=100.0)
    sm.set_stop()
    sm.add_surface([0.0, 5.0, object_index], sd=100.0)
    return opm


def test_image_f_number_is_resolved_from_the_real_image_space_angle():
    """Image F/# follows atan(1/(2F)), not RayOptics' paraxial launch."""
    f_number = 2.4
    exact = _build_cooke(
        ExactOpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=f_number,
    )
    paraxial = _build_cooke(
        OpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=f_number,
    )
    expected_angle = atan(1.0 / (2.0 * f_number))

    assert _image_space_angle(exact) == pytest.approx(
        expected_angle,
        rel=1.0e-9,
        abs=1.0e-9,
    )
    assert abs(_image_space_angle(paraxial) - expected_angle) > 1.0e-4
    assert exact.resolved_object_epd != pytest.approx(
        2.0 * paraxial["analysis_results"]["parax_data"].fod.enp_radius,
    )


def test_object_na_uses_the_reference_wavelength_object_medium_index():
    """Object NA is n_object*sin(theta), including immersion media."""
    requested_na = 1.2
    object_index = 1.5
    opm = _build_uniform_medium_na_model(
        requested_na,
        object_index=object_index,
    )
    opm.update_model()

    chief, marginal = _trace_axial_rays(opm)
    actual_angle = _ray_angle(
        np.asarray(chief[mc.ray][0][mc.d]),
        np.asarray(marginal[mc.ray][0][mc.d]),
    )

    assert object_index * sin(actual_angle) == pytest.approx(
        requested_na,
        rel=1.0e-9,
        abs=1.0e-9,
    )
    assert actual_angle != pytest.approx(atan(requested_na))


@pytest.mark.parametrize("radius", [0.0, 0.2, 0.5, 0.8, 1.0])
def test_object_na_samples_pupil_radius_linearly_in_direction_sine(radius: float):
    """Every interior radius obeys n*sin(theta)=radius*Object NA."""
    requested_na = 1.2
    object_index = 1.5
    opm = _build_uniform_medium_na_model(
        requested_na,
        object_index=object_index,
    )
    opm.update_model()
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]
    point, chief_direction = osp.ray_start_from_osp(
        [0.0, 0.0],
        field,
        "rel pupil",
    )
    sample_point, sample_direction = osp.ray_start_from_osp(
        [radius, 0.0],
        field,
        "rel pupil",
    )

    np.testing.assert_allclose(sample_point, point)
    angle = _ray_angle(chief_direction, sample_direction)
    assert object_index * sin(angle) == pytest.approx(
        radius * requested_na,
        rel=1.0e-9,
        abs=1.0e-9,
    )


def test_object_na_direction_sines_use_the_off_axis_chief_basis():
    """Sagittal, tangential, and longitudinal cosines follow an off-axis chief."""
    requested_na = 1.2
    object_index = 1.5
    pupil = np.array([0.3, 0.4])
    opm = _build_uniform_medium_na_model(
        requested_na,
        object_index=object_index,
        field_angle=20.0,
    )
    opm.update_model()
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]
    _, chief_direction = osp.ray_start_from_osp(
        [0.0, 0.0],
        field,
        "rel pupil",
    )
    _, sample_direction = osp.ray_start_from_osp(
        pupil,
        field,
        "rel pupil",
    )
    chief_direction = np.asarray(chief_direction, dtype=float)
    sample_direction = np.asarray(sample_direction, dtype=float)
    x_axis, y_axis = osp._transverse_axes(chief_direction)
    sine_scale = requested_na / object_index

    assert np.dot(sample_direction, x_axis) == pytest.approx(
        sine_scale * pupil[0],
        abs=1.0e-12,
    )
    assert np.dot(sample_direction, y_axis) == pytest.approx(
        sine_scale * pupil[1],
        abs=1.0e-12,
    )
    assert np.dot(sample_direction, chief_direction) == pytest.approx(
        np.sqrt(1.0 - sine_scale * sine_scale * np.dot(pupil, pupil)),
        abs=1.0e-12,
    )


def test_object_na_blocks_samples_outside_the_unit_angular_disk():
    """Square analysis grids treat angular-pupil corners as blocked samples."""
    from rayoptics_web_utils.raygrid import make_ray_grid

    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm.update_model()
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]

    with pytest.raises(TraceRayBlockedError):
        osp.ray_start_from_osp([1.0, 1.0], field, "rel pupil")

    ray_grid = make_ray_grid(
        opm,
        fi=0,
        wavelength_nm=osp["wvls"].central_wvl,
        num_rays=3,
    )

    assert np.isnan(ray_grid.grid[2, 0, 0])
    assert np.isnan(ray_grid.grid[2, 0, 2])
    assert np.isnan(ray_grid.grid[2, 2, 0])
    assert np.isnan(ray_grid.grid[2, 2, 2])


def test_exact_object_na_unvignetted_boundary_never_probes_outside_unit_pupil(
    monkeypatch: pytest.MonkeyPatch,
):
    """Passing Object-NA boundaries mean zero vignetting, not a wider NA."""
    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm.update_model()
    osp = opm["optical_spec"]
    requested_radii: list[float] = []
    original_start = osp._start_from_exact_object_na

    def recording_start(pupil, field, direction_sine):
        requested_radii.append(float(np.linalg.norm(pupil)))
        return original_start(pupil, field, direction_sine)

    monkeypatch.setattr(osp, "_start_from_exact_object_na", recording_start)

    exact_optical_specs.set_vig_respecting_exact_pupil(opm)

    field = osp["fov"].fields[0]
    assert [field.vux, field.vlx, field.vuy, field.vly] == pytest.approx(
        [0.0, 0.0, 0.0, 0.0]
    )
    assert requested_radii
    assert max(requested_radii) <= 1.0


def test_exact_object_na_clipped_boundary_bisects_inside_unit_pupil(
    monkeypatch: pytest.MonkeyPatch,
):
    """Physical clipping keeps positive vignetting and searches only inward."""
    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm.update_model()
    osp = opm["optical_spec"]
    opm["seq_model"].ifcs[1].clear_apertures = [Circular(radius=8.0)]
    requested_radii: list[float] = []
    original_start = osp._start_from_exact_object_na

    def recording_start(pupil, field, direction_sine):
        requested_radii.append(float(np.linalg.norm(pupil)))
        return original_start(pupil, field, direction_sine)

    monkeypatch.setattr(osp, "_start_from_exact_object_na", recording_start)

    exact_optical_specs.set_vig_respecting_exact_pupil(opm)

    field = osp["fov"].fields[0]
    vignetting = [field.vux, field.vlx, field.vuy, field.vly]
    assert all(0.0 < factor < 1.0 for factor in vignetting)
    assert requested_radii
    assert max(requested_radii) <= 1.0


def test_exact_pupil_vignetting_delegates_other_pupil_modes(
    monkeypatch: pytest.MonkeyPatch,
):
    """Non-Object-NA models retain RayOptics' complete vignetting behavior."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
    )
    delegated_models: list[OpticalModel] = []

    def recording_set_vig(model):
        delegated_models.append(model)
        return "delegated"

    monkeypatch.setattr(
        exact_optical_specs,
        "_rayoptics_set_vig",
        recording_set_vig,
        raising=False,
    )

    assert exact_optical_specs.set_vig_respecting_exact_pupil(opm) == "delegated"
    assert delegated_models == [opm]


@pytest.mark.parametrize("is_wide_angle", [False, None], ids=["false", "missing"])
@pytest.mark.parametrize(
    ("pupil_key", "pupil_value"),
    [(("object", "NA"), 0.15), (("image", "f/#"), 2.4)],
    ids=["object-na", "image-f-number"],
)
def test_exact_pupil_specs_delegate_when_wide_angle_is_not_true(
    is_wide_angle: bool | None,
    pupil_key: tuple[str, str],
    pupil_value: float,
):
    """False and omitted flags preserve plain RayOptics pupil launches."""
    object_distance = 120.0 if pupil_key == ("object", "NA") else 1.0e10
    exact = _build_cooke(
        ExactOpticalModel,
        pupil_key=pupil_key,
        pupil_value=pupil_value,
        is_wide_angle=is_wide_angle,
        object_distance=object_distance,
    )
    plain = _build_cooke(
        OpticalModel,
        pupil_key=pupil_key,
        pupil_value=pupil_value,
        is_wide_angle=is_wide_angle,
        object_distance=object_distance,
    )

    assert exact.resolved_object_epd is None
    assert exact.exact_pupil_resolve_count == 0
    exact_osp = exact["optical_spec"]
    plain_osp = plain["optical_spec"]
    exact_field = exact_osp["fov"].fields[0]
    plain_field = plain_osp["fov"].fields[0]
    for pupil in ([0.0, 0.0], [0.0, 1.0]):
        exact_point, exact_direction = exact_osp.ray_start_from_osp(
            pupil,
            exact_field,
            "rel pupil",
        )
        plain_point, plain_direction = plain_osp.ray_start_from_osp(
            pupil,
            plain_field,
            "rel pupil",
        )
        np.testing.assert_allclose(exact_point, plain_point)
        np.testing.assert_allclose(exact_direction, plain_direction)


@pytest.mark.parametrize("is_wide_angle", [False, None], ids=["false", "missing"])
def test_exact_image_height_field_delegates_to_plain_rayoptics_when_not_wide(
    is_wide_angle: bool | None,
):
    """The public exact field class is inert without an explicit opt-in."""
    exact = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 0.5, 1.0],
        is_wide_angle=is_wide_angle,
    )
    plain = _build_cooke(
        OpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 0.5, 1.0],
        is_wide_angle=is_wide_angle,
        use_exact_image_height_field=False,
    )

    exact_fov = exact["optical_spec"]["fov"]
    plain_fov = plain["optical_spec"]["fov"]
    assert exact_fov.is_wide_angle is False
    for exact_field, plain_field in zip(exact_fov.fields, plain_fov.fields):
        exact_point, exact_direction = exact_fov.obj_coords(exact_field)
        plain_point, plain_direction = plain_fov.obj_coords(plain_field)
        np.testing.assert_allclose(exact_point, plain_point)
        np.testing.assert_allclose(exact_direction, plain_direction)


@pytest.mark.parametrize("is_wide_angle", [False, None], ids=["false", "missing"])
def test_exact_object_height_field_delegates_when_not_wide(
    is_wide_angle: bool | None,
):
    """The exact Object Height class is inert without explicit opt-in."""
    exact = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=2.0,
        fields=[0.0, 0.5, 1.0],
        object_distance=120.0,
        is_wide_angle=is_wide_angle,
    )
    plain = _build_cooke(
        OpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=2.0,
        fields=[0.0, 0.5, 1.0],
        object_distance=120.0,
        is_wide_angle=is_wide_angle,
        use_exact_object_height_field=False,
    )

    exact_fov = exact["optical_spec"]["fov"]
    plain_fov = plain["optical_spec"]["fov"]
    for exact_field, plain_field in zip(exact_fov.fields, plain_fov.fields):
        exact_point, exact_direction = exact_fov.obj_coords(exact_field)
        plain_point, plain_direction = plain_fov.obj_coords(plain_field)
        np.testing.assert_allclose(exact_point, plain_point)
        np.testing.assert_allclose(exact_direction, plain_direction)


@pytest.mark.parametrize("invalid_na", [-0.1, 1.5, 1.6])
def test_object_na_rejects_negative_and_non_propagating_values(invalid_na: float):
    """Negative NA and NA at or above the object index are invalid."""
    opm = _build_uniform_medium_na_model(invalid_na, object_index=1.5)

    with pytest.raises(ExactSpecError, match="Object NA"):
        opm.update_model()


@pytest.mark.parametrize(
    ("object_distance", "max_height"),
    [(120.0, 2.0), (1.0e10, 5.0)],
)
def test_image_height_samples_are_exact_real_chief_ray_intersections(
    object_distance: float,
    max_height: float,
):
    """Finite and infinite conjugates hit every nonuniform relative sample."""
    relative_samples = [0.0, 0.19, 0.63, 1.0]
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=max_height,
        fields=relative_samples,
        object_distance=object_distance,
    )
    osp = opm["optical_spec"]
    wavelength = osp["wvls"].central_wvl

    for relative_height, field in zip(relative_samples, osp["fov"].fields):
        chief = trace_base(
            opm,
            [0.0, 0.0],
            field,
            wavelength,
            apply_vignetting=False,
            check_apertures=False,
        )
        image_point = np.asarray(chief[mc.ray][-1][mc.p])
        assert image_point[0] == pytest.approx(0.0, abs=1.0e-9)
        assert image_point[1] == pytest.approx(
            relative_height * max_height,
            rel=1.0e-9,
            abs=1.0e-9,
        )


@pytest.mark.parametrize(
    ("pupil_key", "pupil_value"),
    [
        (("object", "epd"), 8.0),
        (("object", "NA"), 0.08),
        (("image", "f/#"), 10.0),
    ],
    ids=["object-epd", "object-na", "image-f-number"],
)
def test_object_height_keeps_every_pupil_launch_at_the_requested_object_point(
    pupil_key: tuple[str, str],
    pupil_value: float,
):
    """Every supported pupil construction preserves exact Object Height."""
    relative_samples = [0.0, 0.19, 0.63, 1.0]
    max_height = 2.0
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=pupil_key,
        pupil_value=pupil_value,
        field_key=("object", "height"),
        max_field=max_height,
        fields=relative_samples,
        object_distance=120.0,
    )
    osp = opm["optical_spec"]
    stop_index = opm["seq_model"].stop_surface
    wavelength = osp["wvls"].central_wvl

    for relative_height, field in zip(relative_samples, osp["fov"].fields):
        expected_point = np.array([0.0, relative_height * max_height, 0.0])
        for pupil in ([0.0, 0.0], [0.0, 1.0], [1.0, 0.0]):
            point, _ = osp.ray_start_from_osp(pupil, field, "rel pupil")
            np.testing.assert_allclose(point, expected_point, rtol=1.0e-9, atol=1.0e-9)

        chief = trace_base(
            opm,
            [0.0, 0.0],
            field,
            wavelength,
            apply_vignetting=False,
            check_apertures=False,
        )
        np.testing.assert_allclose(chief[mc.ray][0][mc.p], expected_point)
        np.testing.assert_allclose(
            chief[mc.ray][stop_index][mc.p][:2],
            np.zeros(2),
            rtol=1.0e-9,
            atol=1.0e-9,
        )


def test_object_height_solves_general_two_axis_local_stop_residuals():
    """Off-axis X/Y fields target an offset stop in its decentered frame."""
    solve_dimensions: list[int] = []

    def dimension_recording_solver(residual, initial, **kwargs):
        initial = np.atleast_1d(initial)
        solve_dimensions.append(initial.size)
        options = kwargs.get("options", {})
        return least_squares(
            residual,
            initial,
            xtol=float(options.get("xtol", 1.0e-12)),
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=int(options.get("maxfev", 400)),
        )

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=2.0,
        fields=[0.0, 1.0],
        object_distance=120.0,
        stop_offset_x=0.12,
        stop_offset_y=-0.08,
        stop_decenter=(0.2, -0.15),
        vector_solver=dimension_recording_solver,
        update=False,
    )
    general_field = opm["optical_spec"]["fov"].fields[-1]
    general_field.x = 0.3
    general_field.y = 0.4
    opm.update_model()

    point, _ = opm["optical_spec"]["fov"].obj_coords(general_field)
    np.testing.assert_allclose(point, [0.6, 0.8, 0.0])
    chief = trace_base(
        opm,
        [0.0, 0.0],
        general_field,
        opm["optical_spec"]["wvls"].central_wvl,
        apply_vignetting=False,
        check_apertures=False,
    )
    stop_index = opm["seq_model"].stop_surface
    np.testing.assert_allclose(
        chief[mc.ray][stop_index][mc.p][:2],
        [0.12, -0.08],
        rtol=1.0e-9,
        atol=1.0e-9,
    )
    assert 2 in solve_dimensions


def test_object_height_continuation_caches_duplicates_and_analysis_chiefs(
    monkeypatch: pytest.MonkeyPatch,
):
    """Continuation starts axially, bounds steps, and shares duplicate rays."""
    solve_dimensions: list[int] = []

    def recording_solver(residual, initial, **kwargs):
        initial = np.atleast_1d(initial)
        solve_dimensions.append(initial.size)
        options = kwargs.get("options", {})
        return least_squares(
            residual,
            initial,
            xtol=float(options.get("xtol", 1.0e-12)),
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=int(options.get("maxfev", 400)),
        )

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=1.2,
        fields=[0.0, 0.1, 0.1, 1.0],
        object_distance=120.0,
        vector_solver=recording_solver,
    )
    fov = opm["optical_spec"]["fov"]

    assert len(solve_dimensions) == 21
    assert set(solve_dimensions) == {1}
    assert len(fov._coordinate_launches) == 3
    assert fov.fields[1].chief_ray is fov.fields[2].chief_ray

    def fail_find_real_enp(*_args, **_kwargs):
        raise AssertionError("analysis repeated wide-angle chief aiming")

    monkeypatch.setattr(
        "rayoptics.raytr.trace.find_real_enp",
        fail_find_real_enp,
    )
    wavelength = opm["optical_spec"]["wvls"].central_wvl
    for field in fov.fields:
        assert get_chief_ray_pkg(opm, field, wavelength, 0.0) is field.chief_ray


def test_object_height_continuation_fully_retraces_only_cached_coordinates(
    monkeypatch: pytest.MonkeyPatch,
):
    """Intermediate continuation roots trace only through the physical stop."""
    original_trace_raw = raytrace.trace_raw
    trace_calls: list[tuple[int, bool]] = []

    def recording_trace_raw(path, *args, **kwargs):
        path_list = list(path)
        trace_calls.append((len(path_list), "first_surf" in kwargs))
        return original_trace_raw(iter(path_list), *args, **kwargs)

    monkeypatch.setattr(raytrace, "trace_raw", recording_trace_raw)
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=0.8,
        fields=[0.0, 1.0],
        object_distance=120.0,
    )
    surface_count = len(opm["seq_model"].ifcs)
    strict_full_traces = [
        call for call in trace_calls if call == (surface_count, False)
    ]

    assert len(strict_full_traces) == 2
    assert any(path_length < surface_count for path_length, _ in trace_calls)


def test_object_height_rejects_an_out_of_tolerance_full_retrace(
    monkeypatch: pytest.MonkeyPatch,
):
    """Solver success cannot hide a final local stop-centre mismatch."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=0.2,
        fields=[0.0, 1.0],
        object_distance=120.0,
        update=False,
    )
    original_trace_raw = raytrace.trace_raw
    surface_count = len(opm["seq_model"].ifcs)
    stop_index = opm["seq_model"].stop_surface

    def perturbed_full_retrace(path, *args, **kwargs):
        path_list = list(path)
        result = original_trace_raw(iter(path_list), *args, **kwargs)
        if len(path_list) == surface_count and "first_surf" not in kwargs:
            result[mc.ray][stop_index][mc.p][1] += 1.0e-5
        return result

    monkeypatch.setattr(raytrace, "trace_raw", perturbed_full_retrace)
    with pytest.raises(ExactSpecConvergenceError, match="local stop centre"):
        opm.update_model()


def test_cached_object_height_chief_keeps_reference_wavelength_opd_zero():
    """Object Height chief caching follows RayOptics' OPD normalization."""
    from rayoptics_web_utils.analysis import get_opd_fan_data_for_wavelength

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=0.2,
        fields=[0.0, 1.0],
        object_distance=120.0,
    )

    result = get_opd_fan_data_for_wavelength(opm, fi=1, wvl_idx=0)

    for axis in ("Tangential", "Sagittal"):
        zero_index = min(
            range(len(result[axis]["x"])),
            key=lambda index: abs(result[axis]["x"][index]),
        )
        assert result[axis]["x"][zero_index] == pytest.approx(0.0, abs=1.0e-12)
        assert result[axis]["y"][zero_index] == pytest.approx(0.0, abs=1.0e-9)


def test_object_height_launches_are_recomputed_after_geometry_changes():
    """Cached Object Height directions and chief rays track model mutations."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=2.0,
        fields=[0.0, 1.0],
        object_distance=120.0,
    )
    fov = opm["optical_spec"]["fov"]
    field = fov.fields[-1]
    _, initial_direction = fov.obj_coords(field)
    initial_chief = field.chief_ray

    opm["seq_model"].ifcs[1].profile.r = 25.0
    opm.update_model()
    point, updated_direction = fov.obj_coords(field)

    np.testing.assert_allclose(point, [0.0, 2.0, 0.0])
    assert updated_direction != pytest.approx(initial_direction)
    assert field.chief_ray is not initial_chief


def test_exact_object_height_rejects_infinite_object_conjugates():
    """Object Height has no finite point to preserve at infinite conjugates."""
    with pytest.raises(ExactSpecError, match="finite object conjugate"):
        _build_cooke(
            ExactOpticalModel,
            pupil_key=("object", "epd"),
            pupil_value=8.0,
            field_key=("object", "height"),
            max_field=2.0,
            fields=[0.0, 1.0],
            object_distance=1.0e10,
        )


def test_non_converged_object_height_solve_is_a_hard_error():
    """An unsuccessful direction solve must never supply an object launch."""
    def non_converging_solver(*_args, **_kwargs):
        return SimpleNamespace(success=False, message="no physical root")

    with pytest.raises(ExactSpecConvergenceError, match="did not converge"):
        _build_cooke(
            ExactOpticalModel,
            pupil_key=("object", "epd"),
            pupil_value=8.0,
            field_key=("object", "height"),
            max_field=2.0,
            fields=[0.0, 1.0],
            object_distance=120.0,
            vector_solver=non_converging_solver,
        )


def test_supported_image_heights_use_each_native_solution_once_without_extension():
    """Centred flat infinite fields reuse RayOptics when it is already exact."""
    native_coordinates: list[tuple[float, float]] = []
    extension_initials: list[np.ndarray] = []

    def recording_native_evaluator(opt_model, field, wavelength):
        native_coordinates.append((float(field.xv), float(field.yv)))
        return rayoptics_eval_real_image_ht(opt_model, field, wavelength)

    def recording_extension_solver(residual, initial, **kwargs):
        extension_initials.append(np.atleast_1d(initial))
        options = kwargs.get("options", {})
        return least_squares(
            residual,
            initial,
            xtol=float(options.get("xtol", 1.0e-12)),
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=int(options.get("maxfev", 400)),
        )

    _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=0.01,
        fields=[0.0, 0.5, 0.5, 1.0],
        native_image_height_evaluator=recording_native_evaluator,
        vector_solver=recording_extension_solver,
    )

    assert native_coordinates == [(0.0, 0.0), (0.0, 0.005), (0.0, 0.01)]
    assert extension_initials == []


def test_native_image_height_solution_is_refined_to_strict_tolerance():
    """A close native launch seeds the extension when forward verification misses."""
    extension_initials: list[np.ndarray] = []

    def perturbed_native_evaluator(opt_model, field, wavelength):
        (point, direction), aim_info = rayoptics_eval_real_image_ht(
            opt_model,
            field,
            wavelength,
        )
        perturbed_point = np.asarray(point, dtype=float) + np.array(
            [0.0, 1.0e-5, 0.0]
        )
        return (perturbed_point, direction), aim_info

    def recording_extension_solver(residual, initial, **kwargs):
        extension_initials.append(np.atleast_1d(initial))
        options = kwargs.get("options", {})
        return least_squares(
            residual,
            initial,
            xtol=float(options.get("xtol", 1.0e-12)),
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=int(options.get("maxfev", 400)),
        )

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=1.0,
        fields=[0.0, 1.0],
        native_image_height_evaluator=perturbed_native_evaluator,
        vector_solver=recording_extension_solver,
    )

    assert extension_initials
    field = opm["optical_spec"]["fov"].fields[-1]
    wavelength = opm["optical_spec"]["wvls"].central_wvl
    chief = trace_base(
        opm,
        [0.0, 0.0],
        field,
        wavelength,
        apply_vignetting=False,
        check_apertures=False,
    )
    assert chief[mc.ray][-1][mc.p][1] == pytest.approx(
        1.0,
        rel=1.0e-9,
        abs=1.0e-9,
    )


@pytest.mark.parametrize(
    "extension_case",
    ["finite", "curved_image", "decentered_stop"],
)
def test_extended_image_height_cases_bypass_the_native_evaluator(
    extension_case: str,
):
    """Finite, curved-image, and offset-stop fields retain custom aiming."""
    extension_initials: list[np.ndarray] = []

    def forbidden_native_evaluator(*_args):
        raise AssertionError("native evaluator must not handle extension cases")

    def recording_extension_solver(residual, initial, **kwargs):
        extension_initials.append(np.atleast_1d(initial))
        options = kwargs.get("options", {})
        return least_squares(
            residual,
            initial,
            xtol=float(options.get("xtol", 1.0e-12)),
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=int(options.get("maxfev", 400)),
        )

    case_kwargs = {
        "object_distance": 1.0e10,
        "image_curvature_radius": 0.0,
        "stop_offset_y": 0.0,
    }
    if extension_case == "finite":
        case_kwargs["object_distance"] = 120.0
    elif extension_case == "curved_image":
        case_kwargs["image_curvature_radius"] = 200.0
    else:
        case_kwargs["stop_offset_y"] = 0.1

    _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=1.0,
        fields=[0.0, 1.0],
        native_image_height_evaluator=forbidden_native_evaluator,
        vector_solver=recording_extension_solver,
        **case_kwargs,
    )

    assert extension_initials


def test_configured_image_height_fields_cache_native_aiming_for_analysis(
    monkeypatch: pytest.MonkeyPatch,
):
    """Analysis consumes configured chief-ray caches without find_real_enp."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=0.01,
        fields=[0.0, 0.5, 1.0],
    )
    fields = opm["optical_spec"]["fov"].fields
    cached_chief_rays = [field.chief_ray for field in fields]

    assert all(field.aim_info is not None for field in fields)
    assert all(chief_ray is not None for chief_ray in cached_chief_rays)

    def fail_find_real_enp(*_args, **_kwargs):
        raise AssertionError("analysis repeated the full entrance-pupil solve")

    monkeypatch.setattr(
        "rayoptics.raytr.trace.find_real_enp",
        fail_find_real_enp,
    )
    wavelength = opm["optical_spec"]["wvls"].central_wvl
    for field, cached_chief_ray in zip(fields, cached_chief_rays):
        assert get_chief_ray_pkg(opm, field, wavelength, 0.0) is cached_chief_ray


def test_cached_native_chief_ray_keeps_reference_wavelength_opd_zero():
    """The cached chief must not add the artificial infinite-object gap to OPD."""
    from rayoptics_web_utils.analysis import get_opd_fan_data_for_wavelength

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=0.01,
        fields=[0.0],
        object_distance=1.0e10,
    )

    result = get_opd_fan_data_for_wavelength(opm, fi=0, wvl_idx=0)

    for axis in ("Tangential", "Sagittal"):
        zero_index = min(
            range(len(result[axis]["x"])),
            key=lambda index: abs(result[axis]["x"][index]),
        )
        assert result[axis]["x"][zero_index] == pytest.approx(0.0, abs=1.0e-12)
        assert result[axis]["y"][zero_index] == pytest.approx(0.0, abs=1.0e-9)


def test_meridional_image_height_uses_a_nonsingular_scalar_solve():
    """A centred Y-only field must not expose a singular two-axis Jacobian."""
    solve_dimensions: list[int] = []

    def dimension_recording_solver(residual, initial, **kwargs):
        initial = np.atleast_1d(initial)
        solve_dimensions.append(initial.size)
        if initial.size != 1:
            return SimpleNamespace(
                success=False,
                message="singular two-axis meridional Jacobian",
            )
        return scipy_root(residual, initial, **kwargs)

    _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 0.25, 1.0],
        vector_solver=dimension_recording_solver,
        image_curvature_radius=200.0,
    )

    assert solve_dimensions
    assert set(solve_dimensions) == {1}


def test_exact_constraints_are_resolved_again_after_geometry_changes():
    """Pupil and image-height launches track focusing/optimization mutations."""
    pupil_model = _build_cooke(
        ExactOpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=3.0,
    )
    initial_epd = pupil_model.resolved_object_epd
    initial_count = pupil_model.exact_pupil_resolve_count

    pupil_model["seq_model"].ifcs[1].profile.r = 25.0
    pupil_model.update_model()

    assert pupil_model.exact_pupil_resolve_count == initial_count + 1
    assert pupil_model.resolved_object_epd != pytest.approx(initial_epd)
    assert _image_space_angle(pupil_model) == pytest.approx(
        atan(1.0 / 6.0),
        rel=1.0e-9,
        abs=1.0e-9,
    )

    field_model = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 1.0],
        object_distance=120.0,
    )
    fov = field_model["optical_spec"]["fov"]
    edge_field = fov.fields[-1]
    _, initial_direction = fov.obj_coords(edge_field)

    field_model["seq_model"].gaps[-1].thi += 2.0
    field_model.update_model()
    _, updated_direction = fov.obj_coords(edge_field)

    assert updated_direction != pytest.approx(initial_direction)
    wavelength = field_model["optical_spec"]["wvls"].central_wvl
    chief = trace_base(
        field_model,
        [0.0, 0.0],
        edge_field,
        wavelength,
        apply_vignetting=False,
        check_apertures=False,
    )
    assert chief[mc.ray][-1][mc.p][1] == pytest.approx(
        2.0,
        rel=1.0e-9,
        abs=1.0e-9,
    )


def test_total_internal_reflection_is_a_hard_exact_spec_error():
    """An exact Object NA ray that TIRs must not fall back to paraxial data."""
    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm["seq_model"].gaps[1].medium = decode_medium("air")

    with pytest.raises(ExactSpecTraceError, match="total internal reflection"):
        opm.update_model()


def test_missed_surface_is_a_hard_exact_spec_error():
    """A physical marginal ray that misses a profile must abort model update."""
    opm = ExactOpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=("object", "NA"), value=0.9)
    osp["fov"] = FieldSpec(
        osp,
        key=("object", "height"),
        value=0.0,
        flds=[0.0],
        is_relative=True,
        is_wide_angle=True,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    sm.do_apertures = False
    sm.gaps[0].thi = 10.0
    sm.add_surface([1.0, 2.0, "air"], sd=100.0)
    sm.set_stop()
    sm.add_surface([0.0, 2.0, "air"], sd=100.0)

    with pytest.raises(ExactSpecTraceError, match="missed surface"):
        opm.update_model()


def test_non_converged_image_f_number_solve_is_a_hard_error():
    """A solver result without convergence must never supply a launch."""

    def non_converging_solver(*_args, **_kwargs):
        return SimpleNamespace(converged=False, root=0.0)

    opm = _build_cooke(
        lambda: ExactOpticalModel(scalar_solver=non_converging_solver),
        pupil_key=("image", "f/#"),
        pupil_value=4.0,
        update=False,
    )

    with pytest.raises(ExactSpecConvergenceError, match="did not converge"):
        opm.update_model()
