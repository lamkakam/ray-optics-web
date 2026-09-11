"""Regression tests for opt-in exact real-ray optical specifications.

Wide-angle fields keep RayOptics' paraxial data for first-order reporting while
requiring verified physical launches. Finite Object Height holds every pupil
ray at its requested object point and solves the chief direction locally;
Image Height reuses native real-image-height aiming when it meets the stricter
project tolerance. Both cache chief rays with the optical-path convention
expected by OPD analysis, keyed by absolute field coordinate so ``Field.update``
can safely restore the matching launch and metadata without replacing a
wavelength-specific chief ray already installed by analysis. False and omitted
flags delegate to plain RayOptics.
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
from rayoptics.raytr import RayPkg
from rayoptics.raytr import raytrace
from rayoptics.optical.opticalmodel import OpticalModel
from rayoptics.elem.surface import Circular, DecenterData
from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
from rayoptics.raytr.trace import get_chief_ray_pkg, trace_base
from rayoptics.raytr.traceerror import TraceMissedSurfaceError, TraceRayBlockedError
from rayoptics.raytr.traceerror import TraceTIRError
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
    ExactOpticalSpecs,
    ExactSpecConvergenceError,
    ExactSpecError,
    ExactSpecTraceError,
)


REFERENCE_WAVELENGTH_NM = 587.562
CHROMATIC_WAVELENGTHS_NM = [486.133, REFERENCE_WAVELENGTH_NM, 656.273]


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


def test_exact_vector_solver_forwards_strict_tolerances_and_options(
    monkeypatch: pytest.MonkeyPatch,
):
    """The vector-solver adapter passes its configured SciPy contract exactly."""
    observed: list[dict[str, object]] = []
    sentinel = object()

    def fake_least_squares(residual, initial, **kwargs):
        observed.append(
            {
                "residual": residual,
                "initial": np.array(initial, copy=True),
                **kwargs,
            }
        )
        return sentinel

    monkeypatch.setattr(exact_optical_specs, "least_squares", fake_least_squares)

    assert exact_optical_specs._least_squares_vector_solver(
        lambda value: value,
        [1.0, 2.0],
        method="hybr",
        options={"xtol": 2.5e-8, "maxfev": 17},
    ) is sentinel
    assert exact_optical_specs._least_squares_vector_solver(
        lambda value: value,
        [3.0],
        options=None,
    ) is sentinel

    assert observed[0]["xtol"] == pytest.approx(2.5e-8)
    assert observed[0]["ftol"] == pytest.approx(1.0e-12)
    assert observed[0]["gtol"] == pytest.approx(1.0e-12)
    assert observed[0]["max_nfev"] == 17
    assert observed[1]["xtol"] == pytest.approx(1.0e-12)
    assert observed[1]["max_nfev"] == 400


def test_exact_vector_helpers_normalize_inputs_and_reject_invalid_directions():
    """Direction helpers accept numeric sequences and reject zero/non-finite norms."""
    assert exact_optical_specs._normalize(["3", "4", "0"]).tolist() == [
        pytest.approx(0.6),
        pytest.approx(0.8),
        pytest.approx(0.0),
    ]
    assert exact_optical_specs._angle_between([2.0, 0.0, 0.0], [0.0, 3.0, 0.0]) == pytest.approx(
        np.pi / 2.0
    )

    for direction in ([0.0, 0.0, 0.0], [np.inf, 0.0, 0.0], [np.nan, 0.0, 0.0]):
        with pytest.raises(
            ExactSpecError,
            match="^Exact real-ray direction must be finite and nonzero$",
        ):
            exact_optical_specs._normalize(direction)


def test_angle_between_clips_rounding_cosines_at_both_domain_boundaries(
    monkeypatch: pytest.MonkeyPatch,
):
    """The angle helper remains defined when an injected dot product rounds out of range."""
    monkeypatch.setattr(
        exact_optical_specs,
        "_normalize",
        lambda vector: np.asarray(vector, dtype=float),
    )

    assert exact_optical_specs._angle_between([2.0, 0.0], [3.0, 0.0]) == 0.0
    assert exact_optical_specs._angle_between([-2.0, 0.0], [3.0, 0.0]) == pytest.approx(
        np.pi
    )


@pytest.mark.parametrize("flag", [False, None, 1, np.bool_(True)])
def test_exact_stack_requires_the_boolean_true_opt_in(flag):
    """Only the literal boolean opt-in enables exact real-ray handling."""
    optical_spec = _SubscriptableNamespace(
        fov=SimpleNamespace(is_wide_angle=flag)
    )

    assert exact_optical_specs._is_exact_stack_enabled(optical_spec) is False


def test_exact_stack_missing_opt_in_is_disabled():
    """A field without an opt-in attribute remains on the native path."""
    optical_spec = _SubscriptableNamespace(fov=SimpleNamespace())

    assert exact_optical_specs._is_exact_stack_enabled(optical_spec) is False


def test_exact_trace_error_translation_preserves_context_surface_and_cause():
    """Ray-trace subclasses become stable exact errors with useful surface context."""
    tir_error = TraceRayBlockedError(7, np.array([0.0, 1.0]))
    tir_error.surf = 7
    with pytest.raises(ExactSpecTraceError, match="launch failed because.*TraceRayBlockedError at surface 7") as blocked:
        exact_optical_specs._raise_trace_error(tir_error, "launch")
    assert blocked.value.__cause__ is tir_error

    missed_error = TraceMissedSurfaceError(ifc=3)
    missed_error.surf = 3
    with pytest.raises(ExactSpecTraceError, match="target failed because.*missed surface at surface 3"):
        exact_optical_specs._raise_trace_error(missed_error, "target")

    tir = TraceTIRError(None, None, 1.0, 1.5)
    tir.surf = 4
    with pytest.raises(ExactSpecTraceError, match="angle failed because.*total internal reflection at surface 4"):
        exact_optical_specs._raise_trace_error(tir, "angle")

    missing_surface = TraceMissedSurfaceError()
    with pytest.raises(
        ExactSpecTraceError,
        match="target failed because the real ray encountered missed surface$",
    ):
        exact_optical_specs._raise_trace_error(missing_surface, "target")


@pytest.mark.parametrize(
    ("stop_surface", "clear_apertures", "expected_index", "expected_center"),
    [
        (None, None, 1, [0.0, 0.0]),
        (2, [], 2, [0.0, 0.0]),
        (2, [SimpleNamespace(x_offset=1.25, y_offset=-2.5)], 2, [1.25, -2.5]),
        (2, [SimpleNamespace(x_offset=4.5)], 2, [4.5, 0.0]),
        (2, [SimpleNamespace(y_offset=3.0)], 2, [0.0, 3.0]),
    ],
)
def test_stop_index_and_center_uses_selected_interface_and_offset_defaults(
    stop_surface,
    clear_apertures,
    expected_index,
    expected_center,
):
    """Exact solves use the physical stop index and its local aperture center."""
    seq_model = SimpleNamespace(
        stop_surface=stop_surface,
        ifcs=[SimpleNamespace(), SimpleNamespace(), SimpleNamespace()],
    )
    seq_model.ifcs[expected_index].clear_apertures = clear_apertures

    index, center = exact_optical_specs._stop_index_and_center(seq_model)

    assert index == expected_index
    np.testing.assert_allclose(center, expected_center)


def test_exact_close_uses_combined_relative_and_absolute_tolerances():
    """Tolerance checks accept relative agreement but reject larger residuals."""
    assert exact_optical_specs._is_close(1.0 + 1.5e-9, 1.0)
    assert not exact_optical_specs._is_close(1.0 + 3.0e-9, 1.0)
    assert exact_optical_specs._is_close([1.0e-10, -1.0e-10], [0.0, 0.0])


class _SubscriptableNamespace(SimpleNamespace):
    def __getitem__(self, key):
        return getattr(self, key)


def test_exact_ray_start_forwards_native_paths_with_original_arguments(
    monkeypatch: pytest.MonkeyPatch,
):
    """Delegated pupil starts preserve every argument passed by the caller."""
    class RoutingSpecs(ExactOpticalSpecs):
        """Minimal exact-spec container for routing-only contract tests."""

        def __init__(self, optical_spec, opt_model):
            self._optical_spec = optical_spec
            self.opt_model = opt_model

        def __getitem__(self, key):
            return self._optical_spec[key]

    parent_calls = []
    sentinel = object()

    def fake_parent(self, pupil, field, pupil_type):
        parent_calls.append((pupil, field, pupil_type))
        return sentinel

    monkeypatch.setattr(
        exact_optical_specs.OpticalSpecs,
        "ray_start_from_osp",
        fake_parent,
    )

    field = object()
    pupil = [0.2, -0.4]
    opt_model = SimpleNamespace(
        _resolved_object_na_direction_sine=None,
        _resolved_object_epd=None,
    )

    cases = [
        (SimpleNamespace(is_wide_angle=False), SimpleNamespace(key=("object", "NA"), value=0.2), "rel pupil"),
        (SimpleNamespace(is_wide_angle=True), SimpleNamespace(key=("object", "NA"), value=0.2), "aim pt"),
        (SimpleNamespace(is_wide_angle=True), SimpleNamespace(key=("object", "NA"), value=0.2), "rel pupil"),
        (SimpleNamespace(is_wide_angle=True), SimpleNamespace(key=("image", "f/#"), value=2.4), "rel pupil"),
        (SimpleNamespace(is_wide_angle=True), SimpleNamespace(key=("object", "unknown"), value=0.2), "rel pupil"),
    ]
    for fov, pupil_spec, pupil_type in cases:
        optical_spec = _SubscriptableNamespace(fov=fov, pupil=pupil_spec)
        spec = RoutingSpecs(optical_spec, opt_model)
        assert spec.ray_start_from_osp(pupil, field, pupil_type) is sentinel

    assert parent_calls == [
        (pupil, field, pupil_type)
        for _fov, _pupil_spec, pupil_type in cases
    ]


def test_exact_ray_start_routes_resolved_exact_pupils_and_object_epd_height(
    monkeypatch: pytest.MonkeyPatch,
):
    """Resolved physical pupils use exact helpers only on their supported branches."""
    class RoutingSpecs(ExactOpticalSpecs):
        """Minimal exact-spec container for exact routing contract tests."""

        def __init__(self, optical_spec, opt_model):
            self._optical_spec = optical_spec
            self.opt_model = opt_model

        def __getitem__(self, key):
            return self._optical_spec[key]

    exact_height = object.__new__(ExactImageHeightFieldSpec)
    exact_height.is_wide_angle = True
    field = object()
    pupil = [0.2, -0.4]
    opt_model = SimpleNamespace(
        _resolved_object_na_direction_sine=0.35,
        _resolved_object_epd=7.5,
    )
    optical_spec = _SubscriptableNamespace(
        fov=exact_height,
        pupil=SimpleNamespace(key=("object", "NA"), value=0.2),
    )
    spec = RoutingSpecs(optical_spec, opt_model)
    exact_na = object()
    monkeypatch.setattr(
        spec,
        "_start_from_exact_object_na",
        lambda actual_pupil, actual_field, direction_sine: (
            exact_na,
            actual_pupil,
            actual_field,
            direction_sine,
        ),
    )
    parent_sentinel = object()
    monkeypatch.setattr(
        exact_optical_specs.OpticalSpecs,
        "ray_start_from_osp",
        lambda *_args: parent_sentinel,
    )
    assert spec.ray_start_from_osp(pupil, field, "aim pt") is parent_sentinel
    assert spec.ray_start_from_osp(pupil, field, "rel pupil") == (
        exact_na,
        pupil,
        field,
        0.35,
    )

    optical_spec.pupil = SimpleNamespace(key=("image", "f/#"), value=2.4)
    exact_epd = object()
    monkeypatch.setattr(
        spec,
        "_start_from_object_epd",
        lambda actual_pupil, actual_field, object_epd: (
            exact_epd,
            actual_pupil,
            actual_field,
            object_epd,
        ),
    )
    assert spec.ray_start_from_osp(pupil, field, "rel pupil") == (
        exact_epd,
        pupil,
        field,
        7.5,
    )

    optical_spec.pupil = SimpleNamespace(key=("object", "epd"), value="8.0")
    assert spec.ray_start_from_osp(pupil, field, "rel pupil") == (
        exact_epd,
        pupil,
        field,
        8.0,
    )

    optical_spec.pupil = SimpleNamespace(key=("object", "unknown"), value=0.2)
    parent_result = object()
    monkeypatch.setattr(
        exact_optical_specs.OpticalSpecs,
        "ray_start_from_osp",
        lambda *_args: parent_result,
    )
    assert spec.ray_start_from_osp(pupil, field, "rel pupil") is parent_result


def _fake_exact_na_vignetting_model():
    """Build a small exact Object-NA model for trace-argument assertions."""
    class FakeOpticalSpec(_SubscriptableNamespace):
        """Provide the field lookup used by exact vignetting."""

        def lookup_fld_wvl_focus(self, field_index):
            return self.fov.fields[field_index], 543.21, "focus"

    field = SimpleNamespace(vux=None, vlx=None, vuy=None, vly=None)
    fov = SimpleNamespace(is_wide_angle=True, fields=[field])
    starts = [
        ["0.0", "1.0"],
        ["0.0", "-1.0"],
        ["1.0", "0.0"],
        ["-1.0", "0.0"],
    ]
    optical_spec = FakeOpticalSpec(
        fov=fov,
        pupil=SimpleNamespace(key=("object", "NA"), pupil_rays=[None, *starts]),
    )
    return _SubscriptableNamespace(optical_spec=optical_spec), optical_spec, starts


def test_exact_object_na_vignetting_passes_exact_trace_contract(
    monkeypatch: pytest.MonkeyPatch,
):
    """Unblocked unit-pupil boundaries use the configured wavelength and flags."""
    opm, optical_spec, starts = _fake_exact_na_vignetting_model()
    trace_calls = []

    def fake_trace(model, start, field, wavelength, **kwargs):
        trace_calls.append((model, start, field, wavelength, kwargs))
        return "ray"

    monkeypatch.setattr(exact_optical_specs, "trace_base", fake_trace)

    assert exact_optical_specs.set_vig_respecting_exact_pupil(opm) is None
    assert len(trace_calls) == 4
    for (model, start, field, wavelength, kwargs), expected_start in zip(
        trace_calls,
        starts,
    ):
        assert model is opm
        assert field is optical_spec.fov.fields[0]
        assert wavelength == 543.21
        assert start.dtype == np.dtype(float)
        np.testing.assert_allclose(start, np.asarray(expected_start, dtype=float))
        assert kwargs == {
            "apply_vignetting": False,
            "check_apertures": True,
            "pt_inside_fuzz": 1.0e-4,
        }
    assert [optical_spec.fov.fields[0].vux, optical_spec.fov.fields[0].vlx,
             optical_spec.fov.fields[0].vuy, optical_spec.fov.fields[0].vly] == [
                 0.0,
                 0.0,
                 0.0,
                 0.0,
             ]


def test_exact_object_na_vignetting_passes_exact_bisection_contract(
    monkeypatch: pytest.MonkeyPatch,
):
    """Blocked boundaries retain the original wavelength and cardinal axis."""
    opm, optical_spec, starts = _fake_exact_na_vignetting_model()
    trace_calls = []
    bisection_calls = []

    def fake_trace(model, start, field, wavelength, **kwargs):
        trace_calls.append((model, start, field, wavelength, kwargs))
        raise TraceMissedSurfaceError()

    def fake_bisection(model, axis, start, field, wavelength):
        bisection_calls.append((model, axis, start, field, wavelength))
        return 0.25, "last-index", "ray-package"

    monkeypatch.setattr(exact_optical_specs, "trace_base", fake_trace)
    monkeypatch.setattr(
        exact_optical_specs,
        "calc_vignetted_ray_by_bisection",
        fake_bisection,
    )

    exact_optical_specs.set_vig_respecting_exact_pupil(opm)

    assert [call[3] for call in trace_calls] == [543.21] * 4
    assert [call[1].dtype for call in trace_calls] == [np.dtype(float)] * 4
    assert [call[1][0] for call in trace_calls] == [0.0, 0.0, 1.0, -1.0]
    assert [call[1][1] for call in trace_calls] == [1.0, -1.0, 0.0, 0.0]
    assert [call[4] for call in bisection_calls] == [543.21] * 4
    assert [call[1] for call in bisection_calls] == [0, 0, 1, 1]
    assert [call[2] for call in bisection_calls] == starts
    assert [
        optical_spec.fov.fields[0].vux,
        optical_spec.fov.fields[0].vlx,
        optical_spec.fov.fields[0].vuy,
        optical_spec.fov.fields[0].vly,
    ] == [0.25] * 4


def test_on_axis_field_requires_both_coordinates_to_be_zero():
    """A meridional or sagittal field alone is not an axial sample."""
    meridional = SimpleNamespace(xv=0.0, yv=2.0)
    sagittal = SimpleNamespace(xv=3.0, yv=0.0)
    axial = SimpleNamespace(xv=0.0, yv=0.0)
    field_of_view = SimpleNamespace(fields=[meridional, sagittal, axial])
    model = _SubscriptableNamespace(
        optical_spec=_SubscriptableNamespace(fov=field_of_view)
    )

    assert ExactOpticalModel._on_axis_field(model) is axial


def test_on_axis_field_creates_a_field_bound_to_the_current_field_spec():
    """A temporary axial sample retains the current field specification."""
    field_of_view = SimpleNamespace(
        fields=[SimpleNamespace(xv=1.0, yv=2.0)],
        is_relative=False,
    )
    model = _SubscriptableNamespace(
        optical_spec=_SubscriptableNamespace(fov=field_of_view)
    )

    axial = ExactOpticalModel._on_axis_field(model)

    assert axial.xv == 0.0
    assert axial.yv == 0.0
    assert axial.fov is field_of_view


def test_trace_axial_pupil_ray_passes_wavelength_and_unclipped_flags(
    monkeypatch: pytest.MonkeyPatch,
):
    """Axial F/# and NA probes use the central wavelength without clipping."""
    field = object()
    optical_spec = _SubscriptableNamespace(
        wvls=SimpleNamespace(central_wvl=532.8)
    )
    model = _SubscriptableNamespace(optical_spec=optical_spec)
    model._on_axis_field = lambda: field
    calls = []
    sentinel = object()

    def fake_trace(model_arg, pupil, field_arg, wavelength, **kwargs):
        calls.append((model_arg, pupil, field_arg, wavelength, kwargs))
        return sentinel

    monkeypatch.setattr(exact_optical_specs, "trace_base", fake_trace)

    assert ExactOpticalModel._trace_axial_pupil_ray(
        model,
        [0.0, 1.0],
        "probe context",
    ) is sentinel
    assert calls == [
        (
            model,
            [0.0, 1.0],
            field,
            532.8,
            {"apply_vignetting": False, "check_apertures": False},
        )
    ]


def test_trace_axial_pupil_ray_translates_trace_failures_with_context(
    monkeypatch: pytest.MonkeyPatch,
):
    """A failed axial probe reports its exact-spec context and original cause."""
    error = TraceMissedSurfaceError(ifc=6)
    optical_spec = _SubscriptableNamespace(wvls=SimpleNamespace(central_wvl=532.8))
    model = _SubscriptableNamespace(optical_spec=optical_spec)
    model._on_axis_field = lambda: object()

    def fail_trace(*_args, **_kwargs):
        raise error

    monkeypatch.setattr(exact_optical_specs, "trace_base", fail_trace)

    with pytest.raises(
        ExactSpecTraceError,
        match="probe context failed because.*missed surface",
    ) as translated:
        ExactOpticalModel._trace_axial_pupil_ray(model, [0.0, 1.0], "probe context")
    assert translated.value.__cause__ is error


def test_real_image_space_angle_uses_last_segment_and_stable_contexts(
    monkeypatch: pytest.MonkeyPatch,
):
    """The geometric F/# angle compares the final chief and +Y directions."""
    chief = RayPkg(
        [
            [np.zeros(3), np.array([1.0, 0.0, 0.0])],
            [np.ones(3), np.array([0.0, 0.0, 1.0])],
            [2.0 * np.ones(3), np.array([0.0, 1.0, 0.0])],
        ],
        "chief-op",
        532.8,
    )
    marginal = RayPkg(
        [
            [np.zeros(3), np.array([0.0, 0.0, 1.0])],
            [np.ones(3), np.array([1.0, 0.0, 0.0])],
            [2.0 * np.ones(3), np.array([0.0, 0.0, -1.0])],
        ],
        "marginal-op",
        532.8,
    )
    traces = []
    angle_inputs = []
    model = _SubscriptableNamespace()

    def fake_trace(pupil, context):
        traces.append((pupil, context))
        return chief if pupil == [0.0, 0.0] else marginal

    def fake_angle(first, second):
        angle_inputs.append((first, second))
        return 0.375

    model._trace_axial_pupil_ray = fake_trace
    monkeypatch.setattr(exact_optical_specs, "_angle_between", fake_angle)

    assert ExactOpticalModel._real_image_space_angle(model) == 0.375
    assert traces == [
        ([0.0, 0.0], "Exact Image F/# chief ray"),
        ([0.0, 1.0], "Exact Image F/# +Y marginal ray"),
    ]
    np.testing.assert_allclose(angle_inputs[0][0], [0.0, 1.0, 0.0])
    np.testing.assert_allclose(angle_inputs[0][1], [0.0, 0.0, -1.0])


def _fake_image_f_number_model(paraxial_data, scalar_solver):
    """Build a scalar exact-model fake whose real angle equals its EPD."""
    model = _SubscriptableNamespace(
        analysis_results={"parax_data": paraxial_data},
        _resolved_object_epd=None,
        _scalar_solver=scalar_solver,
    )
    model._real_image_space_angle = lambda: float(model._resolved_object_epd)
    return model


@pytest.mark.parametrize(
    ("target_angle", "expected_bracket"),
    [
        (0.25, (0.125, 0.25)),
        (0.125, (0.0, 0.125)),
    ],
)
def test_image_f_number_scalar_contract_brackets_and_verifies_exact_angle(
    target_angle: float,
    expected_bracket: tuple[float, float],
):
    """Image F/# continuation and Brent solving retain exact scalar options."""
    f_number = 1.0 / (2.0 * np.tan(target_angle))
    observed = {}

    def fake_scalar_solver(residual, **kwargs):
        observed.update(kwargs)
        observed["endpoint_residuals"] = (
            residual(kwargs["bracket"][0]),
            residual(kwargs["bracket"][1]),
        )
        return SimpleNamespace(root=target_angle, converged=True)

    model = _fake_image_f_number_model(
        SimpleNamespace(fod=SimpleNamespace(enp_radius=2.0)),
        fake_scalar_solver,
    )

    ExactOpticalModel._resolve_image_f_number(model, f_number)

    assert observed["bracket"] == pytest.approx(expected_bracket)
    assert observed["method"] == "brentq"
    assert observed["xtol"] == exact_optical_specs._ROOT_X_TOLERANCE
    assert observed["rtol"] == exact_optical_specs._ROOT_RELATIVE_TOLERANCE
    assert observed["maxiter"] == 100
    assert observed["endpoint_residuals"][0] <= 0.0
    assert observed["endpoint_residuals"][1] >= 0.0
    assert model._resolved_object_epd == pytest.approx(target_angle)


def test_image_f_number_uses_unit_search_scale_without_paraxial_data():
    """Missing first-order data still gets the documented deterministic search step."""
    observed = {}
    target_angle = 0.25
    f_number = 1.0 / (2.0 * np.tan(target_angle))

    def fake_scalar_solver(_residual, **kwargs):
        observed.update(kwargs)
        return SimpleNamespace(root=target_angle, converged=True)

    model = _fake_image_f_number_model(None, fake_scalar_solver)
    ExactOpticalModel._resolve_image_f_number(model, f_number)

    assert observed["bracket"] == pytest.approx((0.21875, 0.25))


@pytest.mark.parametrize("invalid_f_number", [0.0, -1.0, np.inf, np.nan])
def test_image_f_number_rejects_nonpositive_and_nonfinite_requests(invalid_f_number):
    """Invalid geometric F/# values fail before any real-ray trace is attempted."""
    model = _fake_image_f_number_model(None, lambda *_args, **_kwargs: None)

    with pytest.raises(
        ExactSpecError,
        match="^Image F/# must be finite and greater than zero$",
    ):
        ExactOpticalModel._resolve_image_f_number(model, invalid_f_number)


def test_image_f_number_rejects_an_off_axis_axial_initialization():
    """A nonzero chief-to-marginal axial angle cannot seed the scalar solve."""
    model = _SubscriptableNamespace(
        _resolved_object_epd=None,
        _real_image_space_angle=lambda: 0.01,
    )

    with pytest.raises(
        ExactSpecConvergenceError,
        match="^Exact Image F/# axial real-ray initialization is not on axis$",
    ):
        ExactOpticalModel._resolve_image_f_number(model, 2.4)


def test_image_f_number_reports_unreachable_continuation_with_stable_error():
    """An angle that never reaches the target is a hard exact-spec failure."""
    scalar_calls = []

    def unexpected_scalar_solver(*args, **kwargs):
        scalar_calls.append((args, kwargs))
        return SimpleNamespace(converged=False)

    model = _SubscriptableNamespace(
        analysis_results={"parax_data": None},
        _resolved_object_epd=None,
        _scalar_solver=unexpected_scalar_solver,
        _real_image_space_angle=lambda: 0.0,
    )

    with pytest.raises(
        ExactSpecConvergenceError,
        match="^Exact Image F/# target is unreachable by continued real rays$",
    ):
        ExactOpticalModel._resolve_image_f_number(model, 2.4)
    assert scalar_calls == []


def test_image_f_number_reports_nonconverged_scalar_result_exactly():
    """A scalar solver result without convergence never becomes a physical pupil."""
    target_angle = 0.25
    f_number = 1.0 / (2.0 * np.tan(target_angle))

    def fake_scalar_solver(_residual, **_kwargs):
        return SimpleNamespace(root=target_angle, converged=False)

    model = _fake_image_f_number_model(
        SimpleNamespace(fod=SimpleNamespace(enp_radius=2.0)),
        fake_scalar_solver,
    )
    with pytest.raises(
        ExactSpecConvergenceError,
        match="^Exact Image F/# real-ray solve did not converge$",
    ):
        ExactOpticalModel._resolve_image_f_number(model, f_number)


def test_image_f_number_reports_missing_scalar_convergence_status():
    """A result without a convergence status is not accepted as a solved pupil."""
    target_angle = 0.25
    f_number = 1.0 / (2.0 * np.tan(target_angle))

    def fake_scalar_solver(_residual, **_kwargs):
        return SimpleNamespace(root=target_angle)

    model = _fake_image_f_number_model(
        SimpleNamespace(fod=SimpleNamespace(enp_radius=2.0)),
        fake_scalar_solver,
    )
    with pytest.raises(
        ExactSpecConvergenceError,
        match="^Exact Image F/# real-ray solve did not converge$",
    ):
        ExactOpticalModel._resolve_image_f_number(model, f_number)


def test_image_f_number_verifies_the_final_root_with_exact_error_text():
    """A converged scalar root that misses the real angle is rejected after solving."""
    target_angle = 0.25
    f_number = 1.0 / (2.0 * np.tan(target_angle))

    def fake_scalar_solver(_residual, **_kwargs):
        return SimpleNamespace(root=target_angle + 0.1, converged=True)

    model = _fake_image_f_number_model(
        SimpleNamespace(fod=SimpleNamespace(enp_radius=2.0)),
        fake_scalar_solver,
    )
    with pytest.raises(
        ExactSpecConvergenceError,
        match=(
            "^Exact Image F/# real-ray solve did not converge within "
            "the required tolerance$"
        ),
    ):
        ExactOpticalModel._resolve_image_f_number(model, f_number)


def _fake_image_height_field(*, conjugate_type="finite"):
    """Build an image-height field with deterministic reverse-path fakes."""
    class FakeProfile:
        cv = 0.0

        @staticmethod
        def sag(x, y):
            return 7.5 + x - y

    class FakeSequenceModel:
        stop_surface = 2

        def __init__(self):
            self.ifcs = [
                SimpleNamespace(profile=FakeProfile())
                for _ in range(5)
            ]
            self.lcl_tfrms = [(np.eye(3), np.array([10.0, 20.0, 30.0]))]
            self.reverse_kwargs = None
            self.path_kwargs = None

        def reverse_path(self, **kwargs):
            self.reverse_kwargs = kwargs
            return [np.array([0.0, 0.0, 0.0, 0.0, -1.0]) for _ in self.ifcs]

        def path(self, **kwargs):
            self.path_kwargs = kwargs
            return [np.array([0.0, 0.0, 0.0, 0.0, 1.0]) for _ in self.ifcs]

    seq_model = FakeSequenceModel()
    opm = _SubscriptableNamespace(seq_model=seq_model)
    optical_spec = _SubscriptableNamespace(
        opt_model=opm,
        wvls=_SubscriptableNamespace(central_wvl=532.0),
        conjugate_type=lambda _space: conjugate_type,
    )
    field = object.__new__(ExactImageHeightFieldSpec)
    field.optical_spec = optical_spec
    return field, seq_model


def _fake_reverse_trace_segments(direction):
    """Return a reverse ray with a direction-dependent stop hit."""
    direction = np.asarray(direction, dtype=float)
    return [
        [np.array([0.0, 0.0, 0.0]), np.array([0.0, 0.0, -1.0])],
        [np.array([1.0, 1.0, 1.0]), np.array([0.0, 0.0, -1.0])],
        [np.array([direction[0], direction[1], 0.0]), direction],
        [np.array([4.0, 5.0, 6.0]), np.array([-0.2, -0.3, -1.0])],
        [np.array([7.0, 8.0, 9.0]), np.array([0.1, 0.2, 0.97])],
    ]


def test_image_reverse_solver_forwards_path_wavelength_flags_and_vector_residual(
    monkeypatch: pytest.MonkeyPatch,
):
    """The reverse solve preserves path geometry and verifies a full 2-D residual."""
    field, seq_model = _fake_image_height_field()
    observed: dict[str, object] = {"trace": [], "solver": {}}

    def fake_trace_raw(path, point, direction, wavelength, **kwargs):
        path = list(path)
        cast_trace = observed["trace"]
        assert isinstance(cast_trace, list)
        cast_trace.append(
            {
                "path": path,
                "point": np.array(point, copy=True),
                "direction": np.array(direction, copy=True),
                "wavelength": wavelength,
                "kwargs": kwargs,
            }
        )
        return [_fake_reverse_trace_segments(direction)]

    def fake_solver(residual, initial, **kwargs):
        observed["solver"] = {
            "initial": np.array(initial, copy=True),
            "method": kwargs.get("method"),
            "options": kwargs.get("options"),
            "residual_at_zero": np.array(residual(np.zeros_like(initial))),
        }
        return SimpleNamespace(success=True, x=np.zeros_like(initial), message="ok")

    forward_ray = object()
    chief_ray = object()
    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver
    def fake_verify_forward_retrace(launch, coordinate, index, center, wavelength):
        observed["verification"] = (launch, coordinate, index, center, wavelength)
        return forward_ray

    field._verify_forward_retrace = fake_verify_forward_retrace
    field._chief_ray_cache = lambda ray: chief_ray

    result = field._solve_reverse_direction(
        np.array([1.0, 2.0]),
        np.array([0.25, 0.5]),
    )

    assert seq_model.reverse_kwargs == {
        "wl": 532.0,
        "start": 5,
        "stop": None,
        "step": -1,
    }
    solver = observed["solver"]
    assert isinstance(solver, dict)
    np.testing.assert_allclose(solver["initial"], [0.25, 0.5])
    assert solver["method"] == "hybr"
    assert solver["options"] == {"xtol": 1.0e-12, "maxfev": 400}
    np.testing.assert_allclose(solver["residual_at_zero"], [0.0, 0.0])

    traces = observed["trace"]
    assert isinstance(traces, list) and traces
    assert all(trace["wavelength"] == 532.0 for trace in traces)
    assert all(
        trace["kwargs"] == {"check_apertures": False, "intersect_obj": False}
        for trace in traces
    )
    verification = observed["verification"]
    assert isinstance(verification, tuple)
    assert verification[1].tolist() == [1.0, 2.0]
    assert verification[2] == 2
    assert verification[4] == 532.0
    np.testing.assert_allclose(result[0], [0.0, 0.0])
    np.testing.assert_allclose(result[1][0], [7.0, 8.0, 9.0])
    np.testing.assert_allclose(result[1][1], -np.array([0.1, 0.2, 0.97]) / np.linalg.norm([0.1, 0.2, 0.97]))
    assert result[3] is chief_ray


def test_image_reverse_solver_uses_the_first_reverse_path_direction_sign(
    monkeypatch: pytest.MonkeyPatch,
):
    """The launch z sign comes from the first interface in the reverse path."""
    field, seq_model = _fake_image_height_field()
    reverse_path = [
        np.array([0.0, 0.0, 0.0, 0.0, -1.0]),
        np.array([0.0, 0.0, 0.0, 0.0, -2.0]),
        np.array([0.0, 0.0, 0.0, 0.0, -3.0]),
        np.array([0.0, 0.0, 0.0, 0.0, -4.0]),
        np.array([0.0, 0.0, 0.0, 0.0, -5.0]),
    ]
    seq_model.reverse_path = lambda **_kwargs: reverse_path
    observed_directions: list[np.ndarray] = []

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        observed_directions.append(np.array(direction, copy=True))
        return [_fake_reverse_trace_segments(direction)]

    def fake_solver(residual, initial, **_kwargs):
        assert np.asarray(initial).shape == (2,)
        residual(np.array([0.0, 0.5]))
        return SimpleNamespace(success=True, x=np.array(["0.0", "0.0"]), message="ok")

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "chief"

    field._solve_reverse_direction(
        np.array([1.0, 2.0]),
        np.array([0.0, 0.5]),
    )

    assert observed_directions
    np.testing.assert_allclose(
        observed_directions[0],
        np.array([0.0, 0.5, -1.0]) / np.linalg.norm([0.0, 0.5, -1.0]),
    )


def test_image_reverse_solver_coerces_numeric_trace_payloads_to_float(
    monkeypatch: pytest.MonkeyPatch,
):
    """String-like trace payloads are converted before residual and launch math."""
    field, _seq_model = _fake_image_height_field()
    observed: dict[str, object] = {}

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        direction = np.asarray(direction, dtype=float)
        return [[
            [np.array([0.0, 0.0, 0.0]), direction],
            [np.array([1.0, 1.0, 1.0]), direction],
            [np.array(["0.0", "0.0", "0.0"]), direction],
            [np.array([4.0, 5.0, 6.0]), np.array([0.2, 0.3, -0.97])],
            [
                np.array(["7.0", "8.0", "9.0"]),
                np.array(["0.1", "0.2", "0.97"]),
            ],
        ]]

    def fake_verify(launch, *_args):
        observed["launch"] = launch
        return "forward-ray"

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=True,
        x=np.array(["0.0", "0.0"]),
        message="ok",
    )
    field._verify_forward_retrace = fake_verify
    field._chief_ray_cache = lambda _ray: "chief"

    result = field._solve_reverse_direction(
        np.array([1.0, 2.0]),
        np.array([0.25, 0.5]),
    )

    launch = observed["launch"]
    assert isinstance(launch, tuple)
    assert np.issubdtype(launch[0].dtype, np.floating)
    assert np.issubdtype(launch[1].dtype, np.floating)
    assert np.issubdtype(result[0].dtype, np.floating)
    np.testing.assert_allclose(launch[0], [7.0, 8.0, 9.0])
    np.testing.assert_allclose(
        launch[1],
        -np.array([0.1, 0.2, 0.97]) / np.linalg.norm([0.1, 0.2, 0.97]),
    )


def test_image_reverse_solver_uses_scalar_meridional_branch_and_metadata(
    monkeypatch: pytest.MonkeyPatch,
):
    """A centred Y-only target uses one tangent while retaining aim metadata."""
    field, _seq_model = _fake_image_height_field()
    observed: dict[str, object] = {}

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        return [_fake_reverse_trace_segments(direction)]

    def fake_solver(residual, initial, **kwargs):
        observed["initial"] = np.array(initial, copy=True)
        observed["method"] = kwargs.get("method")
        observed["options"] = kwargs.get("options")
        observed["scalar_residual"] = np.array(residual(np.array([0.0])))
        return SimpleNamespace(success=True, x=np.array([0.0]), message="ok")

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "cached-chief"

    tangent, launch, aim_info, chief_ray = field._solve_reverse_direction(
        np.array([0.0, 2.0]),
        np.array([0.0, 0.5]),
    )

    np.testing.assert_allclose(observed["initial"], [0.5])
    assert observed["method"] == "hybr"
    assert observed["options"] == {"xtol": 1.0e-12, "maxfev": 400}
    np.testing.assert_allclose(observed["scalar_residual"], [0.0])
    np.testing.assert_allclose(tangent, [0.0, 0.0])
    assert aim_info == pytest.approx(6.0 + np.linalg.norm([4.0, 5.0]) / np.linalg.norm([0.2, 0.3]))
    assert chief_ray == "cached-chief"
    assert launch[0].tolist() == [7.0, 8.0, 9.0]


def test_image_reverse_solver_keeps_two_dimensions_for_a_decentered_stop(
    monkeypatch: pytest.MonkeyPatch,
):
    """A nonzero stop x offset prevents the centred meridional shortcut."""
    field, seq_model = _fake_image_height_field()
    seq_model.ifcs[2].clear_apertures = [
        SimpleNamespace(x_offset=1.0, y_offset=0.0),
    ]
    observed: dict[str, object] = {}

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        segments = _fake_reverse_trace_segments(direction)
        segments[2][mc.p] = np.array([1.0, float(direction[1]), 0.0])
        return [segments]

    def fake_solver(residual, initial, **_kwargs):
        observed["initial"] = np.array(initial, copy=True)
        residual(np.zeros_like(initial))
        return SimpleNamespace(success=True, x=np.zeros(2), message="ok")

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "chief"

    field._solve_reverse_direction(
        np.array([0.0, 2.0]),
        np.array([0.0, 0.5]),
    )

    initial = observed["initial"]
    assert isinstance(initial, np.ndarray)
    np.testing.assert_allclose(initial, [0.0, 0.5])


def test_image_reverse_solver_coerces_string_initial_tangents_to_float(
    monkeypatch: pytest.MonkeyPatch,
):
    """Initial tangents are numeric before symmetry and solver decisions."""
    field, _seq_model = _fake_image_height_field()
    observed: dict[str, object] = {}

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, _point, direction, _wavelength, **_kwargs: [
            _fake_reverse_trace_segments(direction)
        ],
    )

    def fake_solver(_residual, initial, **_kwargs):
        observed["initial"] = np.array(initial, copy=True)
        return SimpleNamespace(success=True, x=np.zeros(2), message="ok")

    field._vector_solver = fake_solver
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "chief"

    field._solve_reverse_direction(
        np.array([0.0, 2.0]),
        ["0.25", "0.5"],
    )

    initial = observed["initial"]
    assert isinstance(initial, np.ndarray)
    assert np.issubdtype(initial.dtype, np.floating)
    np.testing.assert_allclose(initial, [0.25, 0.5])


def test_image_reverse_solver_transforms_infinite_object_launch_to_local_coordinates(
    monkeypatch: pytest.MonkeyPatch,
):
    """Infinite-conjugate reverse rays become object-plane points via the local transform."""
    field, _seq_model = _fake_image_height_field(conjugate_type="infinite")

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
            lambda _path, _point, direction, _wavelength, **_kwargs: [
                _fake_reverse_trace_segments(direction)
            ],
    )
    field._vector_solver = lambda _residual, initial, **_kwargs: SimpleNamespace(
        success=True,
        x=np.zeros_like(initial),
    )
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "chief"

    _tangent, launch, _aim_info, _chief = field._solve_reverse_direction(
        np.array([1.0, 2.0]),
        np.array([0.25, 0.5]),
    )

    reverse_direction = np.array([0.2, 0.3, 1.0])
    first_surface_point = np.array([4.0, 5.0, 6.0])
    vertex_plane_point = first_surface_point - (
        first_surface_point[2] / reverse_direction[2] * reverse_direction
    )
    expected_point = vertex_plane_point + np.array([10.0, 20.0, 30.0])
    expected_direction = reverse_direction + np.array([0.0, 0.0, 0.0])
    expected_direction /= np.linalg.norm(expected_direction)
    np.testing.assert_allclose(launch[0], expected_point)
    np.testing.assert_allclose(launch[1], expected_direction)


def test_image_reverse_solver_coerces_infinite_launch_payloads_to_float(
    monkeypatch: pytest.MonkeyPatch,
):
    """The infinite-conjugate local launch is computed from numeric values."""
    field, _seq_model = _fake_image_height_field(conjugate_type="infinite")

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        direction = np.asarray(direction, dtype=float)
        return [[
            [np.array([0.0, 0.0, 0.0]), direction],
            [np.array([1.0, 1.0, 1.0]), direction],
            [np.array([0.0, 0.0, 0.0]), direction],
            [
                np.array(["4.0", "5.0", "6.0"]),
                np.array(["0.2", "0.3", "1.0"]),
            ],
            [np.array([7.0, 8.0, 9.0]), direction],
        ]]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=True,
        x=np.zeros(2),
        message="ok",
    )
    field._verify_forward_retrace = lambda *_args: object()
    field._chief_ray_cache = lambda _ray: "chief"

    _tangent, launch, _aim_info, _chief = field._solve_reverse_direction(
        np.array([1.0, 2.0]),
        np.array([0.25, 0.5]),
    )

    assert np.issubdtype(launch[0].dtype, np.floating)
    assert np.issubdtype(launch[1].dtype, np.floating)
    np.testing.assert_allclose(launch[0], [12.8, 23.2, 30.0])


def test_image_reverse_solver_rejects_an_exactly_parallel_infinite_launch(
    monkeypatch: pytest.MonkeyPatch,
):
    """An infinite-conjugate chief ray at the epsilon boundary is rejected."""
    field, _seq_model = _fake_image_height_field(conjugate_type="infinite")
    epsilon = np.finfo(float).eps

    def fake_trace_raw(_path, _point, direction, _wavelength, **_kwargs):
        segments = _fake_reverse_trace_segments(direction)
        segments[3][mc.d] = np.array([0.0, 0.0, -epsilon])
        return [segments]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=True,
        x=np.zeros(2),
        message="ok",
    )

    with pytest.raises(ExactSpecError) as error:
        field._solve_reverse_direction(
            np.array([1.0, 2.0]),
            np.array([0.25, 0.5]),
        )

    assert str(error.value) == (
        "Exact infinite-conjugate chief ray is parallel to the "
        "first-surface vertex plane"
    )


def _fake_object_height_field():
    """Build an object-height field with deterministic forward-path fakes."""
    class FakeSequenceModel:
        stop_surface = 1

        def __init__(self):
            self.ifcs = [SimpleNamespace(), SimpleNamespace()]
            self.path_kwargs = None

        def path(self, **kwargs):
            self.path_kwargs = kwargs
            return [
                np.array([0.0, 0.0, 0.0, 0.0, 1.0]),
                np.array([0.0, 0.0, 0.0, 0.0, 2.0]),
            ]

    seq_model = FakeSequenceModel()
    opm = _SubscriptableNamespace(seq_model=seq_model)
    optical_spec = _SubscriptableNamespace(
        opt_model=opm,
        wvls=_SubscriptableNamespace(central_wvl=543.0),
        conjugate_type=lambda _space: "finite",
    )
    field = object.__new__(ExactObjectHeightFieldSpec)
    field.optical_spec = optical_spec
    field._require_finite_object_conjugate = lambda: None
    return field, seq_model


def test_object_forward_solver_forwards_stop_path_and_verifies_full_launch(
    monkeypatch: pytest.MonkeyPatch,
):
    """Object Height solves against the local stop with exact wavelength and flags."""
    field, seq_model = _fake_object_height_field()
    observed: dict[str, object] = {"trace": [], "solver": {}}

    def fake_trace_raw(path, point, direction, wavelength, **kwargs):
        path = list(path)
        traces = observed["trace"]
        assert isinstance(traces, list)
        traces.append((path, np.array(point, copy=True), np.array(direction, copy=True), wavelength, kwargs))
        direction = np.asarray(direction, dtype=float)
        return [[
            [np.array(point, copy=True), direction],
            [np.array([direction[0], direction[1], 5.0]), direction],
        ]]

    def fake_solver(residual, initial, **kwargs):
        observed["solver"] = {
            "initial": np.array(initial, copy=True),
            "method": kwargs.get("method"),
            "options": kwargs.get("options"),
            "residual_at_zero": np.array(residual(np.zeros_like(initial))),
        }
        return SimpleNamespace(success=True, x=np.zeros_like(initial), message="ok")

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver
    def fake_verify_forward_launch(launch, index, center, wavelength):
        observed["verification"] = (launch, index, center, wavelength)
        return "forward-ray"

    field._verify_forward_launch = fake_verify_forward_launch
    cache_contexts = []
    monkeypatch.setattr(
        exact_optical_specs,
        "_cache_verified_chief_ray",
        lambda _spec, _ray, context: cache_contexts.append(context) or "chief",
    )

    result = field._solve_forward_direction(
        np.array([1.0, 2.0]),
        np.array([0.25, 0.5]),
    )

    assert seq_model.path_kwargs == {"wl": 543.0, "start": 0, "stop": 2}
    solver = observed["solver"]
    assert isinstance(solver, dict)
    np.testing.assert_allclose(solver["initial"], [0.25, 0.5])
    assert solver["method"] == "hybr"
    assert solver["options"] == {"xtol": 1.0e-12, "maxfev": 400}
    np.testing.assert_allclose(solver["residual_at_zero"], [0.0, 0.0])
    traces = observed["trace"]
    assert isinstance(traces, list) and traces
    assert all(trace[3] == 543.0 for trace in traces)
    assert all(trace[4] == {"check_apertures": False, "intersect_obj": False} for trace in traces)
    verification = observed["verification"]
    assert isinstance(verification, tuple)
    assert verification[1] == 1
    assert verification[3] == 543.0
    assert traces[0][2][2] == pytest.approx(1.0 / np.sqrt(1.25))
    np.testing.assert_allclose(result[0], [0.0, 0.0])
    np.testing.assert_allclose(result[1][0], [1.0, 2.0, 0.0])
    assert result[2] == "chief"
    assert cache_contexts == ["Exact Object Height"]


def test_object_forward_solver_rejects_an_empty_stop_path_with_exact_message():
    """Object Height cannot solve when the sequence model has no stop path."""
    field, seq_model = _fake_object_height_field()
    seq_model.path = lambda **_kwargs: []

    with pytest.raises(
        ExactSpecError,
        match="^Exact Object Height stop path is empty$",
    ):
        field._solve_forward_direction(
            np.array([1.0, 0.0]),
            np.array([0.2, 0.3]),
        )


def test_object_forward_solver_coerces_string_trace_and_tangent_arrays(
    monkeypatch: pytest.MonkeyPatch,
):
    """Forward solving keeps residual and tangent arrays numeric after faked I/O."""
    field, _seq_model = _fake_object_height_field()

    def fake_trace_raw(_path, point, direction, _wavelength, **_kwargs):
        direction = np.asarray(direction, dtype=float)
        return [[
            [np.asarray(point, dtype=float), direction],
            [np.array(["0.0", "0.0", "5.0"]), direction],
        ]]

    def fake_solver(_residual, initial, **_kwargs):
        assert np.issubdtype(np.asarray(initial).dtype, np.floating)
        return SimpleNamespace(
            success=True,
            x=np.array(["0.0", "0.0"]),
            message="ok",
        )

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    field._vector_solver = fake_solver

    tangent, launch, chief = field._solve_forward_direction(
        np.array([1.0, 2.0]),
        ["0.25", "0.5"],
        verify=False,
    )

    assert np.issubdtype(tangent.dtype, np.floating)
    assert np.issubdtype(launch[1].dtype, np.floating)
    assert chief is None


def test_object_forward_solver_uses_scalar_meridional_residual_and_skips_verification(
    monkeypatch: pytest.MonkeyPatch,
):
    """Centered Object Height reduces the solve to one tangent and can defer tracing."""
    field, _seq_model = _fake_object_height_field()
    observed: dict[str, object] = {}

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, point, direction, _wavelength, **_kwargs: [[
            [np.array(point, copy=True), np.asarray(direction, dtype=float)],
            [np.array([0.0, np.asarray(direction)[1], 5.0]), np.asarray(direction, dtype=float)],
        ]],
    )

    def fake_solver(residual, initial, **kwargs):
        observed["initial"] = np.array(initial, copy=True)
        observed["residual"] = np.array(residual(np.array([0.0])))
        observed["method"] = kwargs["method"]
        observed["options"] = kwargs["options"]
        return SimpleNamespace(success=True, x=np.array([0.0]))

    monkeypatch.setattr(exact_optical_specs, "_cache_verified_chief_ray", pytest.fail)
    field._vector_solver = fake_solver

    tangent, launch, chief = field._solve_forward_direction(
        np.array([0.0, 2.0]),
        np.array([0.0, 0.5]),
        verify=False,
    )

    np.testing.assert_allclose(observed["initial"], [0.5])
    np.testing.assert_allclose(observed["residual"], [0.0])
    assert observed["method"] == "hybr"
    assert observed["options"] == {"xtol": 1.0e-12, "maxfev": 400}
    np.testing.assert_allclose(tangent, [0.0, 0.0])
    np.testing.assert_allclose(launch[1], [0.0, 0.0, 1.0])
    assert chief is None


def test_object_forward_solver_requires_a_zero_sagittal_stop_offset_for_scalar_mode(
    monkeypatch: pytest.MonkeyPatch,
):
    """A decentered stop keeps Object Height solving both tangent components."""
    field, seq_model = _fake_object_height_field()
    seq_model.ifcs[1].clear_apertures = [SimpleNamespace(x_offset=1.0)]
    observed = {}

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, point, direction, _wavelength, **_kwargs: [[
            [np.asarray(point, dtype=float), np.asarray(direction, dtype=float)],
            [
                np.array([1.0, np.asarray(direction, dtype=float)[1], 5.0]),
                np.asarray(direction, dtype=float),
            ],
        ]],
    )

    def fake_solver(_residual, initial, **_kwargs):
        observed["initial"] = np.array(initial, copy=True)
        return SimpleNamespace(
            success=True,
            x=np.zeros_like(initial),
        )

    field._vector_solver = fake_solver
    field._solve_forward_direction(
        np.array([0.0, 2.0]),
        np.array([0.0, 0.5]),
        verify=False,
    )

    np.testing.assert_allclose(observed["initial"], [0.0, 0.5])


@pytest.mark.parametrize(
    ("conjugate", "image_cv", "stop_center", "decenter", "expected"),
    [
        ("finite", 0.0, [0.0, 0.0], None, False),
        ("infinite", None, [0.0, 0.0], None, False),
        ("infinite", 0.01, [0.0, 0.0], None, False),
        ("infinite", 0.0, [0.1, 0.0], None, False),
        ("infinite", 0.0, [0.0, 0.0], SimpleNamespace(), False),
        ("infinite", 0.0, [0.0, 0.0], None, True),
    ],
)
def test_native_image_height_support_checks_every_geometry_requirement(
    conjugate,
    image_cv,
    stop_center,
    decenter,
    expected,
):
    """Native aiming is selected only for infinite, centred, flat-image systems."""
    field, seq_model = _fake_image_height_field(conjugate_type=conjugate)
    seq_model.ifcs[-1].profile.cv = image_cv
    seq_model.ifcs[2].clear_apertures = [
        SimpleNamespace(x_offset=stop_center[0], y_offset=stop_center[1])
    ] if stop_center != [0.0, 0.0] else []
    if decenter is not None:
        seq_model.ifcs[2].decenter = decenter

    assert field._supports_native_image_height_evaluator() is expected


def test_native_image_height_solution_forwards_wavelength_and_refines_only_failed_verification(
    monkeypatch: pytest.MonkeyPatch,
):
    """Native launches are normalized, verified, and refined from their reverse tangent when needed."""
    field, _seq_model = _fake_image_height_field()
    field.optical_spec.conjugate_type = lambda _space: "infinite"
    native_calls: list[tuple[object, object, float]] = []
    trace_calls: list[tuple[object, object, object, float]] = []
    forward_ray = [[
        [np.array([0.0, 0.0, 0.0]), np.array([0.0, 0.0, 1.0])],
        [np.array([0.0, 0.0, 0.0]), np.array([0.2, -0.4, -0.8])],
    ]]

    def evaluator(opm, field_arg, wavelength):
        native_calls.append((opm, field_arg, wavelength))
        return (["1", "2", "3"], [0.25, 0.5, 1.0]), 13.0

    def trace_retrace(launch, coordinate, stop_index, stop_center, wavelength):
        trace_calls.append((launch, coordinate, stop_index, wavelength))
        return forward_ray, np.zeros(2), np.zeros(2)

    field._native_image_height_evaluator = evaluator
    field._trace_forward_retrace = trace_retrace
    field._chief_ray_cache = lambda ray: "chief"

    class FakeField:
        xv = 1.0
        yv = 2.0

    native_field = FakeField()
    result = field._solve_native_first(native_field, np.array([1.0, 2.0]))

    assert native_calls == [(field.optical_spec.opt_model, native_field, 532.0)]
    assert trace_calls[0][1].tolist() == [1.0, 2.0]
    assert trace_calls[0][2] == 2
    assert trace_calls[0][3] == 532.0
    np.testing.assert_allclose(result[0], [-0.25, 0.5])
    np.testing.assert_allclose(result[1][0], [1.0, 2.0, 3.0])
    np.testing.assert_allclose(result[1][1], np.array([0.25, 0.5, 1.0]) / np.linalg.norm([0.25, 0.5, 1.0]))
    assert result[2] == 13.0
    assert result[3] == "chief"

    refinement = {}
    field._trace_forward_retrace = lambda *_args: (
        forward_ray,
        np.array([1.0, 0.0]),
        np.zeros(2),
    )
    field._solve_reverse_direction = lambda coordinate, initial: (
        refinement.update({"coordinate": coordinate, "initial": initial})
        or ("tangent", "launch", "aim", "chief")
    )
    refined = field._solve_native_first(native_field, np.array([1.0, 2.0]))
    assert refined == ("tangent", "launch", "aim", "chief")
    assert refinement["coordinate"].tolist() == [1.0, 2.0]
    np.testing.assert_allclose(refinement["initial"], [-0.25, 0.5])


def test_native_image_height_rejects_invalid_aiming_and_translates_trace_errors(
    monkeypatch: pytest.MonkeyPatch,
):
    """Native evaluator failures remain exact-spec errors instead of falling back silently."""
    field, _seq_model = _fake_image_height_field()

    field._native_image_height_evaluator = lambda *_args: (([0.0, 0.0, 0.0], [0.0, 0.0, 1.0]), np.inf)
    field._trace_forward_retrace = lambda *_args: (
        [[
            [np.zeros(3), np.array([0.0, 0.0, 1.0])],
            [np.zeros(3), np.array([0.0, 0.0, -1.0])],
        ]],
        np.zeros(2),
        np.zeros(2),
    )
    with pytest.raises(ExactSpecConvergenceError, match="invalid aiming data"):
        field._solve_native_first(SimpleNamespace(), np.array([0.0, 0.0]))

    error = TraceMissedSurfaceError(ifc=4)
    field._native_image_height_evaluator = lambda *_args: (_ for _ in ()).throw(error)
    with pytest.raises(ExactSpecTraceError, match="Native image-height evaluation failed.*missed surface"):
        field._solve_native_first(SimpleNamespace(), np.array([0.0, 0.0]))


def test_image_height_coordinate_helpers_preserve_types_and_surface_sag():
    """Image coordinate and launch helpers retain local coordinates and signed tangents."""
    field, _seq_model = _fake_image_height_field()

    assert field._absolute_field_coordinate(SimpleNamespace(xv="1.5", yv="-2.0")).tolist() == [1.5, -2.0]
    assert field._coordinate_key(["1.5", -2.0]) == (1.5, -2.0)
    np.testing.assert_allclose(
        field._image_surface_point(np.array([1.5, -2.0])),
        [1.5, -2.0, 11.0],
    )

    forward_ray = [[
        [np.zeros(3), np.zeros(3)],
        [np.zeros(3), np.array([0.2, -0.4, -0.8])],
    ]]
    np.testing.assert_allclose(
        field._reverse_tangent_from_forward_ray(forward_ray),
        [-0.25, 0.5],
    )

    parallel_ray = [[
        [np.zeros(3), np.zeros(3)],
        [np.zeros(3), np.array([1.0, 0.0, 0.0])],
    ]]
    with pytest.raises(ExactSpecError, match="parallel to the image plane"):
        field._reverse_tangent_from_forward_ray(parallel_ray)


def test_image_height_forward_retrace_forwards_raw_trace_contract_and_residuals(
    monkeypatch: pytest.MonkeyPatch,
):
    """Forward verification traces the complete path and reports local stop/image residuals."""
    field, seq_model = _fake_image_height_field()
    observed = {}
    ray = _fake_reverse_trace_segments([0.0, 0.0, -1.0])

    def fake_trace_raw(path, point, direction, wavelength, **kwargs):
        observed.update(
            path=list(path),
            point=np.array(point, copy=True),
            direction=np.array(direction, copy=True),
            wavelength=wavelength,
            kwargs=kwargs,
        )
        return [ray]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    result = field._trace_forward_retrace(
        (np.array([3.0, 4.0, 0.0]), np.array([0.0, 0.0, 1.0])),
        np.array([7.0, 8.0]),
        2,
        np.zeros(2),
        532.0,
    )

    assert seq_model.path_kwargs == {"wl": 532.0}
    assert observed["wavelength"] == 532.0
    assert observed["kwargs"] == {"check_apertures": False, "intersect_obj": False}
    np.testing.assert_allclose(result[1], [0.0, 0.0])
    np.testing.assert_allclose(result[2], [0.0, 0.0])


def test_image_height_forward_verification_rejects_stop_and_image_residuals():
    """Reverse solutions must satisfy both local stop and requested image coordinates."""
    field, _seq_model = _fake_image_height_field()
    field._trace_forward_retrace = lambda *_args: ("ray", np.array([1.0, 0.0]), np.zeros(2))
    with pytest.raises(ExactSpecConvergenceError, match="reach the stop centre"):
        field._verify_forward_retrace(None, np.zeros(2), 2, np.zeros(2), 532.0)

    field._trace_forward_retrace = lambda *_args: ("ray", np.zeros(2), np.array([0.0, 1.0]))
    with pytest.raises(ExactSpecConvergenceError, match="requested image-surface intersection"):
        field._verify_forward_retrace(None, np.zeros(2), 2, np.zeros(2), 532.0)


def test_exact_chief_cache_retraces_without_reaiming_and_forwards_opd_geometry(
    monkeypatch: pytest.MonkeyPatch,
):
    """Verified real-ray geometry is normalized through RayOptics' standard trace wrapper."""
    seq_model = SimpleNamespace(ifcs=[object(), object(), object()])
    opm = _SubscriptableNamespace(
        seq_model=seq_model,
        analysis_results={
            "parax_data": SimpleNamespace(fod=SimpleNamespace(exp_dist=42.0))
        },
    )
    optical_spec = _SubscriptableNamespace(opt_model=opm)
    raw_ray = [
        [np.array([1.0, 2.0, 3.0]), np.array([0.0, 0.0, 1.0])],
        [np.array([4.0, 5.0, 6.0]), np.array([0.1, 0.2, 0.97])],
        [np.array([7.0, 8.0, 9.0]), np.array([0.2, 0.3, 0.9])],
    ]
    forward_ray = (raw_ray, "forward-op", 532.0)
    observed: dict[str, object] = {}

    def fake_trace(seq, point, direction, wavelength, **kwargs):
        observed["trace"] = (seq, np.array(point, copy=True), np.array(direction, copy=True), wavelength, kwargs)
        return (
            [
                [np.array(point, copy=True), np.array(direction, copy=True)],
                [np.array([4.0, 5.0, 6.0]), np.array([0.1, 0.2, 0.97])],
                [np.array([7.0, 8.0, 9.0]), np.array([0.2, 0.3, 0.9])],
            ],
            "chief-op",
            wavelength,
        )

    def fake_transfer(interface, segment, exp_dist):
        observed["transfer"] = (interface, segment, exp_dist)
        return "exit-segment"

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace", fake_trace)
    monkeypatch.setattr(exact_optical_specs, "transfer_to_exit_pupil", fake_transfer)

    chief_ray, exit_segment = exact_optical_specs._cache_verified_chief_ray(
        optical_spec,
        forward_ray,
        "test context",
    )

    trace_call = observed["trace"]
    assert isinstance(trace_call, tuple)
    assert trace_call[0] is seq_model
    np.testing.assert_allclose(trace_call[1], raw_ray[0][0])
    np.testing.assert_allclose(trace_call[2], raw_ray[0][1])
    assert trace_call[3] == 532.0
    assert trace_call[4] == {"check_apertures": False, "intersect_obj": False}
    transfer_call = observed["transfer"]
    assert isinstance(transfer_call, tuple)
    assert transfer_call[0] is seq_model.ifcs[-2]
    np.testing.assert_allclose(transfer_call[1][0], chief_ray.ray[-2][mc.p])
    np.testing.assert_allclose(transfer_call[1][1], chief_ray.ray[-2][mc.d])
    assert transfer_call[2] == 42.0
    assert exit_segment == "exit-segment"
    assert chief_ray.wvl == 532.0


def test_exact_chief_cache_requires_first_order_data_and_translates_retrace_errors(
    monkeypatch: pytest.MonkeyPatch,
):
    """Chief caching reports missing paraxial state and physical retrace failures clearly."""
    seq_model = SimpleNamespace(ifcs=[object(), object()])
    opm = _SubscriptableNamespace(
        seq_model=seq_model,
        analysis_results={"parax_data": None},
    )
    optical_spec = _SubscriptableNamespace(opt_model=opm)
    forward_ray = (
        [[np.zeros(3), np.array([0.0, 0.0, 1.0])]],
        "op",
        532.0,
    )
    with pytest.raises(ExactSpecError, match="caching requires current first-order data"):
        exact_optical_specs._cache_verified_chief_ray(optical_spec, forward_ray, "missing")

    opm.analysis_results["parax_data"] = SimpleNamespace(fod=SimpleNamespace(exp_dist=1.0))
    error = TraceMissedSurfaceError(ifc=3)
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(error),
    )
    with pytest.raises(ExactSpecTraceError, match="retrace chief-ray caching failed.*missed surface"):
        exact_optical_specs._cache_verified_chief_ray(optical_spec, forward_ray, "retrace")


def test_transverse_axes_fallback_and_orientation_are_orthonormal():
    """The axis helper handles an on-axis X direction without losing handedness."""
    x_axis, y_axis = exact_optical_specs.ExactOpticalSpecs._transverse_axes(
        np.array([1.0, 0.0, 0.0])
    )
    np.testing.assert_allclose(x_axis, [0.0, 1.0, 0.0])
    np.testing.assert_allclose(y_axis, [0.0, 0.0, 1.0])
    np.testing.assert_allclose(np.dot(x_axis, y_axis), 0.0)
    np.testing.assert_allclose(np.cross(x_axis, y_axis), [1.0, 0.0, 0.0])


def test_object_space_epd_launch_uses_exact_chief_center_and_plane_geometry(
    monkeypatch: pytest.MonkeyPatch,
):
    """Object-space EPD launches preserve the chief point and aim at the pupil plane."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=0.0,
        fields=[0.0],
        object_distance=120.0,
    )
    osp = opm["optical_spec"]
    point = np.array([2.0, 3.0, 4.0])
    chief_direction = np.array([0.2, 0.3, 0.93])
    monkeypatch.setattr(osp, "obj_coords", lambda _field: (point, chief_direction))

    launch_point, launch_direction = osp._start_from_object_epd(
        np.array([0.5, -0.25]),
        osp["fov"].fields[0],
        8.0,
    )

    paraxial_data = opm["analysis_results"]["parax_data"]
    pupil_plane_z = paraxial_data.fod.obj_dist + paraxial_data.fod.enp_dist
    distance = (pupil_plane_z - point[2]) / exact_optical_specs._normalize(chief_direction)[2]
    pupil_center = point + distance * exact_optical_specs._normalize(chief_direction)
    target = np.array(
        [pupil_center[0] + 2.0, pupil_center[1] - 1.0, pupil_plane_z]
    )
    np.testing.assert_allclose(launch_point, point)
    np.testing.assert_allclose(launch_direction, exact_optical_specs._normalize(target - point))


def test_infinite_image_height_epd_launch_offsets_the_object_point_in_transverse_axes(
    monkeypatch: pytest.MonkeyPatch,
):
    """Infinite-conjugate Image Height uses a chief-centred transverse pupil plane."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=10.0,
        field_key=("image", "height"),
        max_field=0.0,
        fields=[0.0],
        object_distance=1.0e10,
        update=False,
    )
    osp = opm["optical_spec"]
    point = np.array([1.0, 2.0, 3.0])
    chief_direction = exact_optical_specs._normalize([0.3, 0.4, 0.85])
    monkeypatch.setattr(osp, "obj_coords", lambda _field: (point, chief_direction))
    pupil = np.array([0.4, -0.2])

    launch_point, launch_direction = osp._start_from_object_epd(
        pupil,
        osp["fov"].fields[0],
        10.0,
    )

    x_axis, y_axis = osp._transverse_axes(chief_direction)
    np.testing.assert_allclose(
        launch_point,
        point + 5.0 * (pupil[0] * x_axis + pupil[1] * y_axis),
    )
    np.testing.assert_allclose(launch_direction, chief_direction)


def test_object_space_epd_launch_rejects_chief_rays_parallel_to_the_pupil_plane(
    monkeypatch: pytest.MonkeyPatch,
):
    """A zero axial chief direction cannot define an exact object-space pupil aim."""
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("object", "height"),
        max_field=0.0,
        fields=[0.0],
        object_distance=120.0,
    )
    osp = opm["optical_spec"]
    monkeypatch.setattr(
        osp,
        "obj_coords",
        lambda _field: (np.zeros(3), np.array([1.0, 0.0, 0.0])),
    )

    with pytest.raises(ExactSpecError, match="cannot reach the object-space pupil plane"):
        osp._start_from_object_epd(np.zeros(2), osp["fov"].fields[0], 8.0)


def test_exact_object_na_launch_normalizes_near_boundary_and_rejects_invalid_radius():
    """Object-NA launches clamp only numerical boundary noise and reject true out-of-disk samples."""
    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm.update_model()
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]
    boundary = np.array([1.0 + 0.5e-9, 0.0])
    _, boundary_direction = osp.ray_start_from_osp(boundary, field, "rel pupil")
    _, unit_direction = osp.ray_start_from_osp([1.0, 0.0], field, "rel pupil")
    np.testing.assert_allclose(boundary_direction, unit_direction)

    with pytest.raises(TraceRayBlockedError):
        osp.ray_start_from_osp([1.0 + 2.0e-9, 0.0], field, "rel pupil")


def test_object_height_continuation_uses_bounded_steps_and_verifies_only_endpoint():
    """Object-height continuation carries each tangent forward and verifies its endpoint."""
    field = object.__new__(ExactObjectHeightFieldSpec)
    calls = []

    def solve(coordinate, tangent, *, verify=True):
        calls.append((coordinate.copy(), tangent.copy(), verify))
        return tangent + np.array([1.0, 2.0]), "launch", "chief" if verify else None

    field._solve_forward_direction = solve
    result = field._continue_forward_solution(
        np.array([0.0, 0.0]),
        np.array([0.25, 0.0]),
        np.array([0.0, 0.0]),
    )

    assert len(calls) == 8
    np.testing.assert_allclose(calls[0][0], [0.03125, 0.0])
    np.testing.assert_allclose(calls[-1][0], [0.25, 0.0])
    assert all(call[2] is False for call in calls[:-1])
    assert calls[-1][2] is True
    np.testing.assert_allclose(calls[1][1], [1.0, 2.0])
    np.testing.assert_allclose(result[0], [8.0, 16.0])
    assert result[1:] == ("launch", "chief")


def test_image_height_continuation_uses_radial_steps_and_previous_tangent():
    """Image-height continuation advances from the previous solved coordinate."""
    field = object.__new__(ExactImageHeightFieldSpec)
    calls = []

    def solve(coordinate, tangent):
        calls.append((coordinate.copy(), tangent.copy()))
        return tangent + np.array([0.5, -0.25]), "launch", 11.0, "chief"

    field._solve_reverse_direction = solve
    result = field._continue_reverse_solution(
        np.array([0.0, 0.0]),
        np.array([0.25, 0.0]),
        np.array([0.0, 0.0]),
    )

    assert len(calls) == 8
    np.testing.assert_allclose(calls[0][0], [0.03125, 0.0])
    np.testing.assert_allclose(calls[-1][0], [0.25, 0.0])
    np.testing.assert_allclose(calls[1][1], [0.5, -0.25])
    np.testing.assert_allclose(result[0], [4.0, -2.0])
    assert result[1:] == ("launch", 11.0, "chief")


def test_object_height_full_verification_forwards_wavelength_and_checks_point_and_stop(
    monkeypatch: pytest.MonkeyPatch,
):
    """Object Height full verification checks both the fixed object point and local stop hit."""
    field, seq_model = _fake_object_height_field()
    observed = {}
    point = np.array([1.0, 2.0, 0.0])
    direction = np.array([0.0, 0.0, 1.0])

    def fake_trace_raw(path, traced_point, traced_direction, wavelength, **kwargs):
        observed.update(
            path=list(path),
            point=np.array(traced_point, copy=True),
            direction=np.array(traced_direction, copy=True),
            wavelength=wavelength,
            kwargs=kwargs,
        )
        return [[
            [point.copy(), direction.copy()],
            [np.array([0.0, 0.0, 5.0]), direction.copy()],
        ]]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", fake_trace_raw)
    result = field._verify_forward_launch(
        (point, direction),
        1,
        np.zeros(2),
        543.0,
    )

    assert result[0][0][0].tolist() == [1.0, 2.0, 0.0]
    assert observed["path"] == seq_model.path_kwargs or seq_model.path_kwargs == {"wl": 543.0}
    assert observed["wavelength"] == 543.0
    assert observed["kwargs"] == {"check_apertures": False, "intersect_obj": False}

    def bad_object_trace(*_args, **_kwargs):
        return [[
            [np.array([1.0, 2.1, 0.0]), direction.copy()],
            [np.array([0.0, 0.0, 5.0]), direction.copy()],
        ]]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", bad_object_trace)
    with pytest.raises(ExactSpecConvergenceError, match="did not preserve the requested object point"):
        field._verify_forward_launch((point, direction), 1, np.zeros(2), 543.0)

    def bad_stop_trace(*_args, **_kwargs):
        return [[
            [point.copy(), direction.copy()],
            [np.array([0.1, 0.0, 5.0]), direction.copy()],
        ]]

    monkeypatch.setattr(exact_optical_specs.raytrace, "trace_raw", bad_stop_trace)
    with pytest.raises(ExactSpecConvergenceError, match="did not reach the local stop centre"):
        field._verify_forward_launch((point, direction), 1, np.zeros(2), 543.0)


def test_object_height_solver_reports_trace_and_convergence_failures(
    monkeypatch: pytest.MonkeyPatch,
):
    """Object Height never converts solver or physical-ray failures into a launch."""
    field, _seq_model = _fake_object_height_field()
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=False,
        message="not converged",
    )
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda *_args, **_kwargs: [[
            [np.zeros(3), np.array([0.0, 0.0, 1.0])],
            [np.zeros(3), np.array([0.0, 0.0, 1.0])],
        ]],
    )
    with pytest.raises(ExactSpecConvergenceError) as convergence_error:
        field._solve_forward_direction(np.array([1.0, 0.0]), np.array([0.2, 0.3]))
    assert str(convergence_error.value) == (
        "Exact Object Height direction solve did not converge for "
        "object coordinate [1.0, 0.0]: not converged"
    )

    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=True,
        x=np.array([0.2, 0.3]),
    )
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, point, direction, _wavelength, **_kwargs: [[
            [np.array(point, copy=True), np.asarray(direction, dtype=float)],
            [np.asarray(direction, dtype=float), np.asarray(direction, dtype=float)],
        ]],
    )
    with pytest.raises(ExactSpecConvergenceError) as residual_error:
        field._solve_forward_direction(np.array([1.0, 0.0]), np.array([0.2, 0.3]))
    assert str(residual_error.value) == (
        "Exact Object Height direction solve did not converge within "
        "the required real-ray tolerance"
    )

    error = TraceMissedSurfaceError(ifc=2)
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(error),
    )
    with pytest.raises(ExactSpecTraceError) as trace_error:
        field._solve_forward_direction(np.array([1.0, 0.0]), np.array([0.2, 0.3]))
    assert str(trace_error.value) == (
        "Exact Object Height stop trace failed because the real ray "
        "encountered missed surface"
    )
    assert trace_error.value.__cause__ is error


def test_object_forward_solver_uses_default_failure_text_when_success_is_missing(
    monkeypatch: pytest.MonkeyPatch,
):
    """A solver result without a success flag is treated as a failed solve."""
    field, _seq_model = _fake_object_height_field()
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, point, direction, _wavelength, **_kwargs: [[
            [np.asarray(point, dtype=float), np.asarray(direction, dtype=float)],
            [np.array([0.0, 0.0, 5.0]), np.asarray(direction, dtype=float)],
        ]],
    )
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        message="missing success",
    )

    with pytest.raises(ExactSpecConvergenceError) as error:
        field._solve_forward_direction(
            np.array([1.0, 0.0]),
            np.array([0.2, 0.3]),
        )

    assert str(error.value) == (
        "Exact Object Height direction solve did not converge for "
        "object coordinate [1.0, 0.0]: missing success"
    )


def test_object_forward_solver_uses_unknown_failure_text_when_message_is_missing(
    monkeypatch: pytest.MonkeyPatch,
):
    """A failed solver without a message uses the stable fallback text."""
    field, _seq_model = _fake_object_height_field()
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, point, direction, _wavelength, **_kwargs: [[
            [np.asarray(point, dtype=float), np.asarray(direction, dtype=float)],
            [np.array([0.0, 0.0, 5.0]), np.asarray(direction, dtype=float)],
        ]],
    )
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(success=False)

    with pytest.raises(ExactSpecConvergenceError) as error:
        field._solve_forward_direction(
            np.array([1.0, 0.0]),
            np.array([0.2, 0.3]),
        )

    assert str(error.value) == (
        "Exact Object Height direction solve did not converge for "
        "object coordinate [1.0, 0.0]: unknown solver failure"
    )


def test_image_height_reverse_solver_reports_trace_and_convergence_failures(
    monkeypatch: pytest.MonkeyPatch,
):
    """Image Height never converts a reverse physical failure into a cached solution."""
    field, _seq_model = _fake_image_height_field()
    error = TraceMissedSurfaceError(ifc=2)
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(error),
    )
    with pytest.raises(ExactSpecTraceError) as trace_error:
        field._solve_reverse_direction(np.array([1.0, 0.0]), np.array([0.2, 0.3]))
    assert str(trace_error.value) == (
        "Exact image-height reverse trace failed because the real ray "
        "encountered missed surface"
    )

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, _point, direction, _wavelength, **_kwargs: [
            _fake_reverse_trace_segments(direction)
        ],
    )
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=False,
        message="not converged",
    )
    with pytest.raises(ExactSpecConvergenceError) as convergence_error:
        field._solve_reverse_direction(np.array([1.0, 0.0]), np.array([0.2, 0.3]))
    assert str(convergence_error.value) == (
        "Exact image-height reverse solve did not converge for "
        "image coordinate [1.0, 0.0]: not converged"
    )

    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=False,
    )
    with pytest.raises(ExactSpecConvergenceError) as default_error:
        field._solve_reverse_direction(
            np.array([1.0, 0.0]),
            ["0.2", "0.3"],
        )
    assert str(default_error.value) == (
        "Exact image-height reverse solve did not converge for "
        "image coordinate [1.0, 0.0]: unknown solver failure"
    )


def test_image_height_reverse_solver_reports_an_exact_residual_failure(
    monkeypatch: pytest.MonkeyPatch,
):
    """A successful numerical solve still fails when its physical residual remains."""
    field, _seq_model = _fake_image_height_field()

    def bad_residual_trace(_path, _point, direction, _wavelength, **_kwargs):
        segments = _fake_reverse_trace_segments(direction)
        segments[2][mc.p] = np.array([1.0, float(direction[1]), 0.0])
        return [segments]

    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        bad_residual_trace,
    )
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        success=True,
        x=np.zeros(2),
        message="ok",
    )

    with pytest.raises(ExactSpecConvergenceError) as convergence_error:
        field._solve_reverse_direction(
            np.array([1.0, 0.0]),
            np.array([0.2, 0.3]),
        )

    assert str(convergence_error.value) == (
        "Exact image-height reverse solve did not converge within the "
        "required real-ray tolerance"
    )


def test_image_reverse_solver_treats_a_missing_success_flag_as_failure(
    monkeypatch: pytest.MonkeyPatch,
):
    """A reverse solver result without success cannot produce a launch."""
    field, _seq_model = _fake_image_height_field()
    monkeypatch.setattr(
        exact_optical_specs.raytrace,
        "trace_raw",
        lambda _path, _point, direction, _wavelength, **_kwargs: [
            _fake_reverse_trace_segments(direction)
        ],
    )
    field._vector_solver = lambda *_args, **_kwargs: SimpleNamespace(
        message="missing success",
    )

    with pytest.raises(ExactSpecConvergenceError) as error:
        field._solve_reverse_direction(
            np.array([1.0, 0.0]),
            np.array([0.2, 0.3]),
        )

    assert str(error.value) == (
        "Exact image-height reverse solve did not converge for "
        "image coordinate [1.0, 0.0]: missing success"
    )


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


def _build_exact_height_cache_model(field_key: tuple[str, str]) -> OpticalModel:
    """Build a finite model with three cached exact height coordinates."""
    return _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=field_key,
        max_field=1.0,
        fields=[0.0, 0.5, 1.0],
        object_distance=120.0,
    )


def _assert_launch_matches_height(
    opm: OpticalModel,
    launch: tuple[np.ndarray, np.ndarray],
    expected_height: float,
) -> None:
    """Verify an exact launch preserves its requested object or image height."""
    fov = opm["optical_spec"]["fov"]
    point, direction = launch
    if fov.key == ("object", "height"):
        np.testing.assert_allclose(point, [0.0, expected_height, 0.0])
        return

    wavelength = opm["optical_spec"]["wvls"].central_wvl
    traced_ray = raytrace.trace_raw(
        opm["seq_model"].path(wl=wavelength),
        point,
        direction,
        wavelength,
        check_apertures=False,
        intersect_obj=False,
    )
    np.testing.assert_allclose(
        traced_ray[mc.ray][-1][mc.p][:2],
        [0.0, expected_height],
        rtol=1.0e-9,
        atol=1.0e-9,
    )


@pytest.mark.parametrize(
    "field_key",
    [("object", "height"), ("image", "height")],
)
def test_field_update_restores_the_same_coordinate_solution(field_key):
    """A cleared field reuses its coordinate's launch and chief metadata."""
    opm = _build_exact_height_cache_model(field_key)
    fov = opm["optical_spec"]["fov"]
    field = fov.fields[1]
    coordinate = fov._absolute_field_coordinate(field)
    key = fov._coordinate_key(coordinate)
    cached_launch = fov._coordinate_launches[key]
    cached_chief_ray = fov._coordinate_chief_rays[key]
    cached_aim_info = field.aim_info
    cache_size = len(fov._coordinate_launches)

    field.update()
    launch = fov.obj_coords(field)

    assert len(fov._coordinate_launches) == cache_size
    assert fov._coordinate_launches[key] is cached_launch
    assert field.chief_ray is cached_chief_ray
    assert field.aim_info == cached_aim_info
    _assert_launch_matches_height(opm, launch, 0.5)


@pytest.mark.parametrize(
    "field_key",
    [("object", "height"), ("image", "height")],
)
def test_field_update_resolves_an_unsolved_coordinate(field_key):
    """A moved field solves and caches its new absolute coordinate."""
    opm = _build_exact_height_cache_model(field_key)
    fov = opm["optical_spec"]["fov"]
    field = fov.fields[1]
    cache_size = len(fov._coordinate_launches)

    field.yv = 0.75
    field.update()
    launch = fov.obj_coords(field)

    key = fov._coordinate_key([0.0, 0.75])
    assert len(fov._coordinate_launches) == cache_size + 1
    assert field.chief_ray is fov._coordinate_chief_rays[key]
    np.testing.assert_allclose(launch[0], fov._coordinate_launches[key][0])
    np.testing.assert_allclose(launch[1], fov._coordinate_launches[key][1])
    _assert_launch_matches_height(opm, launch, 0.75)


@pytest.mark.parametrize(
    "field_key",
    [("object", "height"), ("image", "height")],
)
def test_field_update_switches_to_an_already_cached_coordinate(field_key):
    """A moved field reuses the target coordinate's launch and chief metadata."""
    opm = _build_exact_height_cache_model(field_key)
    fov = opm["optical_spec"]["fov"]
    field = fov.fields[1]
    target_field = fov.fields[2]
    target_coordinate = fov._absolute_field_coordinate(target_field)
    target_key = fov._coordinate_key(target_coordinate)
    target_launch = fov._coordinate_launches[target_key]
    target_chief_ray = fov._coordinate_chief_rays[target_key]
    target_aim_info = target_field.aim_info
    cache_size = len(fov._coordinate_launches)

    field.yv = 1.0
    field.update()
    launch = fov.obj_coords(field)

    assert len(fov._coordinate_launches) == cache_size
    assert fov._coordinate_launches[target_key] is target_launch
    assert field.chief_ray is target_chief_ray
    assert field.aim_info == target_aim_info
    np.testing.assert_allclose(launch[0], target_launch[0])
    np.testing.assert_allclose(launch[1], target_launch[1])
    _assert_launch_matches_height(opm, launch, 1.0)


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


@pytest.mark.parametrize(
    "field_key, object_distance",
    [
        (("object", "height"), 120.0),
        (("image", "height"), 1.0e10),
    ],
)
def test_exact_height_chief_ray_opd_is_zero_at_every_wavelength(
    field_key,
    object_distance,
):
    """Coordinate caching must preserve RayOptics' chromatic chief ray."""
    from rayoptics_web_utils.analysis import get_opd_fan_data_for_wavelength

    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=field_key,
        max_field=0.01,
        fields=[1.0],
        object_distance=object_distance,
        update=False,
    )
    osp = opm["optical_spec"]
    osp["wvls"] = WvlSpec(
        [(wavelength, 1.0) for wavelength in CHROMATIC_WAVELENGTHS_NM],
        ref_wl=1,
    )
    opm.update_model()

    for wavelength_index in range(len(CHROMATIC_WAVELENGTHS_NM)):
        result = get_opd_fan_data_for_wavelength(
            opm,
            fi=0,
            wvl_idx=wavelength_index,
        )
        for axis in ("Tangential", "Sagittal"):
            zero_index = min(
                range(len(result[axis]["x"])),
                key=lambda index: abs(result[axis]["x"][index]),
            )
            assert result[axis]["x"][zero_index] == pytest.approx(
                0.0,
                abs=1.0e-12,
            )
            assert result[axis]["y"][zero_index] == pytest.approx(
                0.0,
                abs=1.0e-9,
            )


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
