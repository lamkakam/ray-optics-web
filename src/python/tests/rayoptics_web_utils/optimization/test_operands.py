"""Behavioral tests for optimization operand adapters and residual shaping.

Deterministic trace and analysis fakes verify pupil sampling, wavelength and
image-point forwarding, scalar/vector residual dimensions, non-finite padding,
and penalty behavior without depending on a particular lens prescription.
"""

from types import SimpleNamespace

import numpy as np
import pytest


def test_operand_ray_counts_and_nominal_residual_dimensions_cover_scalar_and_fans():
    from rayoptics_web_utils.optimization.operands import (
        get_nominal_operand_sample_residual_count,
        get_operand_num_rays,
    )

    assert get_operand_num_rays(None) == 21
    assert get_operand_num_rays(None, default=7) == 7
    assert get_operand_num_rays({"num_rays": "5"}) == 5
    assert get_nominal_operand_sample_residual_count(
        {"kind": "ray_fan", "options": {"num_rays": 3}}
    ) == 6
    assert get_nominal_operand_sample_residual_count(
        {"kind": "ray_fan_tangential", "options": {"num_rays": 3}}
    ) == 3
    assert get_nominal_operand_sample_residual_count(
        {"kind": "f_number", "options": None}
    ) == 1


def test_operand_registry_is_partitioned_by_target_mode():
    from rayoptics_web_utils.optimization.operands import (
        OPERAND_REGISTRY,
        RANGE_OPERAND_KINDS,
        ADJUSTABLE_TARGET_OPERAND_KINDS,
        FIXED_TARGET_OPERAND_KINDS,
        operand_goal,
    )

    assert ADJUSTABLE_TARGET_OPERAND_KINDS == {
        "focal_length",
        "f_number",
        "opd_difference",
        "opd_difference_tangential",
        "opd_difference_sagittal",
        "rms_spot_size",
        "rms_wavefront_error",
    }
    assert FIXED_TARGET_OPERAND_KINDS == {"ray_fan", "ray_fan_tangential", "ray_fan_sagittal"}
    assert RANGE_OPERAND_KINDS == frozenset()
    assert ADJUSTABLE_TARGET_OPERAND_KINDS.isdisjoint(FIXED_TARGET_OPERAND_KINDS)
    assert set(OPERAND_REGISTRY) == ADJUSTABLE_TARGET_OPERAND_KINDS | FIXED_TARGET_OPERAND_KINDS | RANGE_OPERAND_KINDS
    assert {operand_goal(kind) for kind in ADJUSTABLE_TARGET_OPERAND_KINDS} == {"adjustable_target"}
    assert {operand_goal(kind) for kind in FIXED_TARGET_OPERAND_KINDS} == {"fixed_target"}


def test_operand_goal_resolves_range_kinds_and_rejects_unknown_kinds(monkeypatch):
    import rayoptics_web_utils.optimization.operands as operands_module

    monkeypatch.setattr(operands_module, "RANGE_OPERAND_KINDS", frozenset({"fake_range"}))

    assert operands_module.operand_goal("fake_range") == "range"
    with pytest.raises(ValueError) as exc_info:
        operands_module.operand_goal("unknown_metric")
    assert exc_info.value.args == ("Unknown operand kind: unknown_metric",)


@pytest.mark.parametrize(
    ("sample", "actual", "expected"),
    [
        ({"kind": "focal_length", "target": 100.0}, 103.5, 3.5),
        ({"kind": "focal_length", "target": 100.0}, 98.0, -2.0),
        ({"kind": "ray_fan"}, -0.25, -0.25),
        ({"kind": "fake_range", "min": 1.0, "max": 2.0}, 1.5, 0.0),
        ({"kind": "fake_range", "min": 1.0, "max": 2.0}, 1.0, 0.0),
        ({"kind": "fake_range", "min": 1.0, "max": 2.0}, 2.0, 0.0),
        ({"kind": "fake_range", "min": 1.0, "max": 2.0}, 0.25, 0.75),
        ({"kind": "fake_range", "min": 1.0, "max": 2.0}, 2.5, 0.5),
        ({"kind": "fake_range", "min": 1.0}, 1e9, 0.0),
        ({"kind": "fake_range", "min": 1.0}, -1.0, 2.0),
        ({"kind": "fake_range", "max": 2.0}, -1e9, 0.0),
        ({"kind": "fake_range", "max": 2.0}, 3.0, 1.0),
    ],
)
def test_operand_goal_residual_follows_the_sample_target_mode(monkeypatch, sample, actual, expected):
    import rayoptics_web_utils.optimization.operands as operands_module

    monkeypatch.setattr(operands_module, "RANGE_OPERAND_KINDS", frozenset({"fake_range"}))

    assert operands_module.operand_goal_residual(sample, actual) == pytest.approx(expected)


def test_surface_operand_groups_register_edge_thickness_as_the_only_surface_kind():
    from rayoptics_web_utils.optimization.operands import (
        OPERAND_REGISTRY,
        POSITIVE_RANGE_OPERAND_KINDS,
        SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
        SURFACE_FIXED_TARGET_OPERAND_KINDS,
        SURFACE_OPERAND_REGISTRY,
        SURFACE_RANGE_OPERAND_KINDS,
        compute_edge_thickness,
        operand_goal,
        operand_scope,
    )

    assert SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS == frozenset()
    assert SURFACE_FIXED_TARGET_OPERAND_KINDS == frozenset()
    assert SURFACE_RANGE_OPERAND_KINDS == {"edge_thickness"}
    assert SURFACE_OPERAND_REGISTRY == {"edge_thickness": compute_edge_thickness}
    assert POSITIVE_RANGE_OPERAND_KINDS == {"edge_thickness"}
    assert operand_goal("edge_thickness") == "range"
    assert operand_scope("edge_thickness") == "surface"
    assert {operand_scope(kind) for kind in OPERAND_REGISTRY} == {"system"}


@pytest.fixture
def fake_surface_kinds(monkeypatch):
    import rayoptics_web_utils.optimization.operands as operands_module

    monkeypatch.setattr(operands_module, "SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS", frozenset({"fake_surface_target"}))
    monkeypatch.setattr(operands_module, "SURFACE_FIXED_TARGET_OPERAND_KINDS", frozenset({"fake_surface_fixed"}))
    monkeypatch.setattr(operands_module, "SURFACE_RANGE_OPERAND_KINDS", frozenset({"fake_surface_range"}))
    return operands_module


@pytest.mark.parametrize(
    ("kind", "goal"),
    [
        ("fake_surface_target", "adjustable_target"),
        ("fake_surface_fixed", "fixed_target"),
        ("fake_surface_range", "range"),
    ],
)
def test_surface_operand_kinds_share_goals_and_report_surface_scope(fake_surface_kinds, kind, goal):
    assert fake_surface_kinds.operand_goal(kind) == goal
    assert fake_surface_kinds.operand_scope(kind) == "surface"


def test_operand_scope_reports_system_kinds_and_rejects_unknown_kinds(fake_surface_kinds):
    assert fake_surface_kinds.operand_scope("focal_length") == "system"
    assert fake_surface_kinds.operand_scope("ray_fan") == "system"
    with pytest.raises(ValueError) as exc_info:
        fake_surface_kinds.operand_scope("unknown_metric")
    assert exc_info.value.args == ("Unknown operand kind: unknown_metric",)


@pytest.mark.parametrize(
    ("sample", "actual", "expected"),
    [
        ({"kind": "fake_surface_target", "target": 2.0, "surface_index": 1}, 2.5, 0.5),
        ({"kind": "fake_surface_fixed", "surface_index": 1}, -0.75, -0.75),
        ({"kind": "fake_surface_range", "min": 1.0, "surface_index": 1}, 0.5, 0.5),
        ({"kind": "fake_surface_range", "max": 1.0, "surface_index": 1}, 0.5, 0.0),
    ],
)
def test_operand_goal_residual_applies_to_surface_samples(fake_surface_kinds, sample, actual, expected):
    assert fake_surface_kinds.operand_goal_residual(sample, actual) == pytest.approx(expected)


def test_registered_operand_kinds_include_both_registries(fake_surface_kinds, monkeypatch):
    monkeypatch.setitem(fake_surface_kinds.SURFACE_OPERAND_REGISTRY, "fake_surface_target", lambda *args: 0.0)

    assert fake_surface_kinds.is_registered_operand_kind("focal_length")
    assert fake_surface_kinds.is_registered_operand_kind("fake_surface_target")
    assert not fake_surface_kinds.is_registered_operand_kind("fake_surface_fixed")
    assert not fake_surface_kinds.is_registered_operand_kind("unknown_metric")


def test_evaluate_operand_sample_passes_surface_index_to_surface_evaluators(fake_surface_kinds, monkeypatch):
    calls = []
    opm = object()

    def fake_surface_evaluator(model, surface_index, field_index, wavelength_index, options, image_point):
        calls.append((model, surface_index, field_index, wavelength_index, options, image_point))
        return 1.25

    monkeypatch.setitem(fake_surface_kinds.SURFACE_OPERAND_REGISTRY, "fake_surface_target", fake_surface_evaluator)

    value = fake_surface_kinds.evaluate_operand_sample(
        opm,
        {
            "kind": "fake_surface_target",
            "target": 0.0,
            "surface_index": 2,
            "weight": 1.0,
            "field_index": 0,
            "field_weight": 1.0,
            "wavelength_index": 1,
            "wavelength_weight": 1.0,
            "options": {"num_rays": 5},
        },
        "image_heights",
    )

    assert value == 1.25
    assert calls == [(opm, 2, 0, 1, {"num_rays": 5}, "image_heights")]


def test_evaluate_operand_sample_calls_system_evaluators_without_surface_index(monkeypatch):
    import rayoptics_web_utils.optimization.operands as operands_module

    calls = []
    opm = object()

    def fake_system_evaluator(*args):
        calls.append(args)
        return [0.5, -0.5]

    monkeypatch.setitem(operands_module.OPERAND_REGISTRY, "ray_fan", fake_system_evaluator)

    value = operands_module.evaluate_operand_sample(
        opm,
        {
            "kind": "ray_fan",
            "weight": 1.0,
            "field_index": 1,
            "field_weight": 1.0,
            "wavelength_index": 0,
            "wavelength_weight": 1.0,
            "options": {},
        },
        "chief_ray",
    )

    assert value == [0.5, -0.5]
    assert calls == [(opm, 1, 0, {}, "chief_ray")]


def test_spot_function_returns_transverse_defocus_and_none_for_blocked_ray():
    import rayoptics.optical.model_constants as mc
    from rayoptics_web_utils.optimization.operands import _spot_fn

    field = SimpleNamespace(ref_sphere=(np.array([0.5, 1.0, 0.0]), None))
    ray_pkg = [
        [
            [
                np.array([1.0, 2.0, 3.0]),
                np.array([0.0, 0.0, 2.0]),
            ]
        ]
    ]

    result = _spot_fn(None, None, ray_pkg, field, None, 4.0)

    assert result.tolist() == [pytest.approx(0.5), pytest.approx(1.0)]
    assert _spot_fn(None, None, None, field, None, 4.0) is None
    assert mc.ray == 0


def _fake_spot_model(trace_result):
    calls = []

    class SequenceModel:
        def trace_grid(self, *args, **kwargs):
            calls.append((args, kwargs))
            return trace_result

    model = {
        "optical_spec": {"wvls": SimpleNamespace(wavelengths=[500.0, 600.0])},
        "seq_model": SequenceModel(),
    }
    return model, calls


def test_rms_spot_size_forwards_sampling_contract_and_computes_vector_rms():
    from rayoptics_web_utils.optimization.operands import compute_rms_spot_size

    model, calls = _fake_spot_model(([[[3.0, 4.0], [-3.0, 0.0]]], {"trace": True}))

    value = compute_rms_spot_size(
        model,
        field_index=2,
        wavelength_index=1,
        options={"num_rays": 7},
        image_point="centroid",
    )

    assert value == pytest.approx(np.sqrt(17.0))
    assert len(calls) == 1
    args, kwargs = calls[0]
    assert args[1:] == (2,)
    assert kwargs == {
        "wl": 600.0,
        "num_rays": 7,
        "form": "list",
        "append_if_none": False,
    }


@pytest.mark.parametrize(
    "trace_result",
    [([], {"meta": "empty"}), ([[]], {"meta": "empty"})],
)
def test_rms_spot_size_returns_penalty_for_no_points(trace_result):
    from rayoptics_web_utils.optimization.operands import PENALTY_RESIDUAL, compute_rms_spot_size

    model, _calls = _fake_spot_model(trace_result)

    assert compute_rms_spot_size(model, 0, 0, None) == PENALTY_RESIDUAL


@pytest.mark.parametrize(
    ("field_index", "wavelength_index", "error"),
    [
        (None, 0, "requires field and wavelength"),
        (0, None, "requires field and wavelength"),
        (0, 99, "wavelength index 99"),
    ],
)
def test_rms_spot_size_rejects_missing_and_invalid_sample_indices(
    field_index,
    wavelength_index,
    error,
):
    from rayoptics_web_utils.optimization.operands import compute_rms_spot_size

    model, _calls = _fake_spot_model(([], None))

    with pytest.raises((ValueError, IndexError), match=error):
        compute_rms_spot_size(model, field_index, wavelength_index, None)


def test_opd_difference_filters_nonfinite_samples_and_selects_requested_axis(monkeypatch):
    from rayoptics_web_utils.optimization.operands import (
        compute_opd_difference,
        compute_opd_difference_sagittal,
    )

    calls = []

    def fake_opd(opm, fi, wvl_idx, image_point="chief_ray"):
        calls.append((opm, fi, wvl_idx, image_point))
        return {
            "Tangential": {"y": [1.0, float("nan"), 5.0]},
            "Sagittal": {"y": [2.0, float("inf"), 8.0]},
        }

    monkeypatch.setattr(
        "rayoptics_web_utils.optimization.operands.get_opd_fan_data_for_wavelength",
        fake_opd,
    )

    assert compute_opd_difference(None, 1, 2, {"ignored": True}, "centroid") == pytest.approx(2.5)
    assert compute_opd_difference_sagittal(None, 1, 2, None) == pytest.approx(3.0)
    assert calls == [(None, 1, 2, "centroid"), (None, 1, 2, "chief_ray")]


def test_opd_difference_returns_penalty_when_combined_fan_has_no_finite_samples(monkeypatch):
    from rayoptics_web_utils.optimization.operands import PENALTY_RESIDUAL, compute_opd_difference

    monkeypatch.setattr(
        "rayoptics_web_utils.optimization.operands.get_opd_fan_data_for_wavelength",
        lambda *args, **kwargs: {
            "Tangential": {"y": [float("nan")]},
            "Sagittal": {"y": [float("inf")]},
        },
    )

    assert compute_opd_difference(None, 0, 0, None) == PENALTY_RESIDUAL


def test_focal_length_and_f_number_read_paraxial_values_and_have_shared_defaults():
    import inspect

    from rayoptics_web_utils.optimization.operands import compute_f_number, compute_focal_length

    model = {
        "optical_spec": {"pupil": SimpleNamespace(key=("object", "epd"), value=10.0)},
        "analysis_results": {"parax_data": SimpleNamespace(fod=SimpleNamespace(efl=80.0, fno=4.0))},
    }

    assert compute_focal_length(model, None, None, None) == pytest.approx(80.0)
    assert compute_f_number(model, None, None, None) == pytest.approx(4.0)
    assert inspect.signature(compute_focal_length).parameters["image_point"].default == "chief_ray"
    assert inspect.signature(compute_f_number).parameters["image_point"].default == "chief_ray"


# WORKAROUND(rayoptics 0.9.10 NA bug): remove with
# rayoptics_web_utils._paraxial_na_workaround once
# tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
def test_f_number_for_object_na_matches_equivalent_object_epd(make_constant_index_singlet):
    """Object NA 0.9 in n=1.5 yields the same paraxial f/# as EPD 24."""
    from rayoptics_web_utils.optimization.operands import compute_f_number

    na_model = make_constant_index_singlet(("object", "NA"), 0.9)
    epd_model = make_constant_index_singlet(("object", "epd"), 24.0)

    assert compute_f_number(na_model, None, None, None) == pytest.approx(
        compute_f_number(epd_model, None, None, None)
    )


def _spherical_sag(radius: float, height: float) -> float:
    if radius == 0:
        return 0.0
    curvature = 1.0 / radius
    return curvature * height**2 / (1.0 + np.sqrt(1.0 - curvature**2 * height**2))


@pytest.mark.parametrize(
    ("surface_index", "radius", "next_radius", "thickness", "semi_diameter"),
    [
        (1, 23.713, 7331.288, 4.831, 10.009),
        (3, -24.456, 21.896, 0.975, 4.7919),
        (6, -20.4942, 0.0, 41.2365, 8.3321),
    ],
)
def test_edge_thickness_measures_the_gap_at_the_surface_semi_diameter(
    cooke_triplet, surface_index, radius, next_radius, thickness, semi_diameter
):
    from rayoptics_web_utils.optimization.operands import compute_edge_thickness

    expected = thickness + _spherical_sag(next_radius, semi_diameter) - _spherical_sag(radius, semi_diameter)

    assert compute_edge_thickness(cooke_triplet, surface_index, None, None, None, "chief_ray") == pytest.approx(
        expected
    )


def _fake_edge_model(sags, thicknesses, semi_diameters, z_dirs):
    class FakeProfile:
        def __init__(self, sag):
            self._sag = sag

        def sag(self, x, y):
            if callable(self._sag):
                return self._sag(x, y)
            return self._sag

    ifcs = [
        SimpleNamespace(profile=FakeProfile(sag), surface_od=lambda sd=sd: sd)
        for sag, sd in zip(sags, semi_diameters)
    ]
    gaps = [SimpleNamespace(thi=thi) for thi in thicknesses]
    return {"seq_model": SimpleNamespace(ifcs=ifcs, gaps=gaps, z_dir=z_dirs)}


def test_edge_thickness_uses_only_the_selected_surface_semi_diameter():
    from rayoptics_web_utils.optimization.operands import compute_edge_thickness

    heights = []

    def recording_sag(x, y):
        heights.append((x, y))
        return 0.0

    model = _fake_edge_model([0.0, recording_sag, recording_sag], [0.0, 2.0, 0.0], [1.0, 5.0, 9.0], [1, 1, 1])

    assert compute_edge_thickness(model, 1, None, None, None, "chief_ray") == pytest.approx(2.0)
    assert heights == [(0.0, 5.0), (0.0, 5.0)]


def test_edge_thickness_reports_physical_thickness_in_reversed_space():
    from rayoptics_web_utils.optimization.operands import compute_edge_thickness

    model = _fake_edge_model([0.0, 0.5, 0.2], [0.0, -3.0, 0.0], [1.0, 4.0, 4.0], [1, -1, -1])

    assert compute_edge_thickness(model, 1, None, None, None, "chief_ray") == pytest.approx(3.3)


@pytest.mark.parametrize("sag", ["raises", float("nan"), float("inf")])
def test_edge_thickness_is_nan_when_a_sag_is_undefined_at_the_edge(sag):
    from rayoptics.raytr.traceerror import TraceMissedSurfaceError

    from rayoptics_web_utils.optimization.operands import compute_edge_thickness

    def raising_sag(x, y):
        raise TraceMissedSurfaceError()

    next_sag = raising_sag if sag == "raises" else sag
    model = _fake_edge_model([0.0, 0.1, next_sag], [0.0, 2.0, 0.0], [1.0, 5.0, 5.0], [1, 1, 1])

    assert np.isnan(compute_edge_thickness(model, 1, None, None, None, "chief_ray"))


@pytest.mark.parametrize(
    ("sample", "actual", "expected"),
    [
        ({"kind": "edge_thickness", "surface_index": 1, "min": 3.0}, 2.0, 1.0),
        ({"kind": "edge_thickness", "surface_index": 1, "min": 3.0}, 4.0, 0.0),
        ({"kind": "edge_thickness", "surface_index": 1, "max": 5.0}, 6.5, 1.5),
        ({"kind": "edge_thickness", "surface_index": 1, "min": 3.0}, float("nan"), 1e6),
        ({"kind": "edge_thickness", "surface_index": 1, "max": 5.0}, float("nan"), 1e6),
        ({"kind": "edge_thickness", "surface_index": 1, "min": 3.0}, float("inf"), 1e6),
    ],
)
def test_edge_thickness_residual_uses_the_dead_zone_and_penalizes_undefined_values(sample, actual, expected):
    from rayoptics_web_utils.optimization.operands import operand_goal_residual

    assert operand_goal_residual(sample, actual) == pytest.approx(expected)
