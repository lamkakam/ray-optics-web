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

    model = {"analysis_results": {"parax_data": SimpleNamespace(fod=SimpleNamespace(efl=80.0, fno=4.0))}}

    assert compute_focal_length(model, None, None, None) == pytest.approx(80.0)
    assert compute_f_number(model, None, None, None) == pytest.approx(4.0)
    assert inspect.signature(compute_focal_length).parameters["image_point"].default == "chief_ray"
    assert inspect.signature(compute_f_number).parameters["image_point"].default == "chief_ray"
