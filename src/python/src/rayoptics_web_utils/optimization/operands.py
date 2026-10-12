"""Evaluate registered optimization operands.

Scalar and ray-fan operands share a penalty value of ``1e6`` when analysis data is
unavailable. Fan operands preserve a stable residual dimension by padding blocked
or non-finite samples. OPD-based operands propagate the app-wide image-point
reference, trace only their normalized sample's wavelength, and scale wavefront
grids to the traced wavelength before evaluation. Every registered kind belongs to
exactly one target-mode group, which decides how its values become residuals.
Kinds are also scoped: system kinds live in ``OPERAND_REGISTRY``, while
surface kinds live in ``SURFACE_OPERAND_REGISTRY`` and are evaluated at the
sample's 1-based ``surface_index``. A system-or-surface kind is registered in
both and is dispatched by whether its sample carries a ``surface_index``. Edge
thickness is the first surface-scoped range operand; its bounds must be
positive, and an edge thickness that cannot be evaluated (``NaN``) is penalized
whichever bounds are supplied. The third-order aberration kinds are the first
system-or-surface operands; they read paraxial third-order wavefront
coefficients (``get_surface_by_surface_wavefront``) for the system sum or one
surface, not a real-ray wavefront.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING, Literal, TypeAliasType, get_args, get_origin

import numpy as np
from rayoptics.raytr.traceerror import TraceError

from rayoptics_web_utils.analysis import get_opd_fan_data_for_wavelength
from rayoptics_web_utils.analysis import get_ray_fan_data
from rayoptics_web_utils.analysis import get_surface_by_surface_wavefront
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_data
from rayoptics_web_utils._spot import _rms_radius, _spot_fn
from rayoptics_web_utils.zernike.zernike import _opd_wfe, _scale_opd_grid_to_wavelength

from ._types import (
    OperandEvaluator,
    OperandGoal,
    OperandOptions,
    OperandSample,
    OperandScope,
    OperandValue,
    RangeOperandKind,
    FixedTargetOperandKind,
    AdjustableTargetOperandKind,
    SurfaceAdjustableTargetOperandKind,
    SurfaceFixedTargetOperandKind,
    SurfaceOperandEvaluator,
    SurfaceRangeOperandKind,
)
from .parameters import validate_surface_index

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

PENALTY_RESIDUAL = 1e6


def _literal_values(kind_type: object) -> frozenset[str]:
    """Return every string literal of an operand-kind type.

    Type aliases, unions, and ``Literal`` arguments are flattened recursively, so
    kind groups may compose aliases such as ``ThirdOrderAberrationOperandKind``;
    ``Never`` contributes no literal.

    Args:
        kind_type: Operand-kind type alias, union, or ``Literal``.

    Returns:
        The string literals of ``kind_type``.
    """
    if isinstance(kind_type, TypeAliasType):
        return _literal_values(kind_type.__value__)
    if get_origin(kind_type) is Literal:
        return frozenset(value for value in get_args(kind_type) if isinstance(value, str))
    return frozenset().union(*(_literal_values(arg) for arg in get_args(kind_type)))


ADJUSTABLE_TARGET_OPERAND_KINDS: frozenset[str] = _literal_values(AdjustableTargetOperandKind)
"""Runtime mirror of ``AdjustableTargetOperandKind``."""
FIXED_TARGET_OPERAND_KINDS: frozenset[str] = _literal_values(FixedTargetOperandKind)
"""Runtime mirror of ``FixedTargetOperandKind``."""
RANGE_OPERAND_KINDS: frozenset[str] = _literal_values(RangeOperandKind)
"""Runtime mirror of ``RangeOperandKind``; empty until the first range operand is registered."""
SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS: frozenset[str] = _literal_values(SurfaceAdjustableTargetOperandKind)
"""Runtime mirror of ``SurfaceAdjustableTargetOperandKind``: the third-order aberration kinds."""
SURFACE_FIXED_TARGET_OPERAND_KINDS: frozenset[str] = _literal_values(SurfaceFixedTargetOperandKind)
"""Runtime mirror of ``SurfaceFixedTargetOperandKind``; empty until the first such operand is registered."""
SURFACE_RANGE_OPERAND_KINDS: frozenset[str] = _literal_values(SurfaceRangeOperandKind)
"""Runtime mirror of ``SurfaceRangeOperandKind``."""
THIRD_ORDER_WAVEFRONT_COLUMNS: dict[str, str] = {
    "third_order_spherical_aberration": "W040",
    "third_order_coma": "W131",
    "third_order_astigmatism": "W222",
    "third_order_petzval_curvature": "W220P",
    "third_order_field_curvature": "W220",
    "third_order_distortion": "W311",
    "primary_axial_chromatic_aberration": "W020",
    "primary_lateral_chromatic_aberration": "W111",
}
"""``get_surface_by_surface_wavefront`` column read by each third-order aberration kind."""
POSITIVE_RANGE_OPERAND_KINDS: frozenset[str] = frozenset({"edge_thickness"})
"""Range kinds whose ``min``/``max`` bounds must be strictly positive."""
UNEXPANDED_OPERAND_KINDS: frozenset[str] = frozenset(
    {"focal_length", "f_number", "edge_thickness", *THIRD_ORDER_WAVEFRONT_COLUMNS}
)
"""Kinds evaluated once per operand rather than once per field/wavelength sample."""


def operand_goal(kind: str) -> OperandGoal:
    """Return the target mode of an operand kind.

    System and surface kind groups of the same mode share one goal. The kind
    groups are read at call time so range and surface handling can be exercised
    before any registered operand uses them.

    Args:
        kind: Operand kind.

    Returns:
        ``"adjustable_target"``, ``"fixed_target"``, or ``"range"``.

    Raises:
        ValueError: If the kind belongs to no target-mode group.
    """
    if kind in ADJUSTABLE_TARGET_OPERAND_KINDS or kind in SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS:
        return "adjustable_target"
    if kind in FIXED_TARGET_OPERAND_KINDS or kind in SURFACE_FIXED_TARGET_OPERAND_KINDS:
        return "fixed_target"
    if kind in RANGE_OPERAND_KINDS or kind in SURFACE_RANGE_OPERAND_KINDS:
        return "range"
    raise ValueError(f"Unknown operand kind: {kind}")


def operand_scope(kind: str) -> OperandScope:
    """Return whether an operand kind evaluates the whole system, one surface, or either.

    A kind listed in both a system group and a surface group, such as the
    third-order aberration kinds, is ``"system_or_surface"``. The kind groups are
    read at call time so tests can register fake kinds.

    Args:
        kind: Operand kind.

    Returns:
        ``"system_or_surface"`` for kinds in both scopes, ``"surface"`` for
        surface-only kinds, otherwise ``"system"``.

    Raises:
        ValueError: If the kind belongs to no target-mode group.
    """
    operand_goal(kind)
    is_surface = (
        kind in SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS
        or kind in SURFACE_FIXED_TARGET_OPERAND_KINDS
        or kind in SURFACE_RANGE_OPERAND_KINDS
    )
    is_system = (
        kind in ADJUSTABLE_TARGET_OPERAND_KINDS or kind in FIXED_TARGET_OPERAND_KINDS or kind in RANGE_OPERAND_KINDS
    )
    if is_surface and is_system:
        return "system_or_surface"
    if is_surface:
        return "surface"
    return "system"


def is_registered_operand_kind(kind: object) -> bool:
    """Return whether a kind has a system or surface evaluator.

    Args:
        kind: Candidate operand kind.

    Returns:
        Whether ``kind`` is in ``OPERAND_REGISTRY`` or ``SURFACE_OPERAND_REGISTRY``.
    """
    return kind in OPERAND_REGISTRY or kind in SURFACE_OPERAND_REGISTRY


def evaluate_operand_sample(opm: OpticalModel, sample: OperandSample, image_point: str) -> OperandValue:
    """Evaluate one normalized operand sample with its registered evaluator.

    Samples carrying a ``surface_index`` use the kind's surface evaluator and pass
    that index before the field index; other samples use the system evaluator.
    A system-or-surface kind therefore dispatches on whether its sample has a
    ``surface_index``.

    Args:
        opm: RayOptics optical model.
        sample: Normalized operand sample.
        image_point: Image-point reference convention.

    Returns:
        The evaluator's scalar or vector value.
    """
    kind = sample["kind"]  # pyright: ignore[reportGeneralTypeIssues]  # reserved operand variants type "kind" as Never
    if "surface_index" in sample:
        return SURFACE_OPERAND_REGISTRY[kind](
            opm,
            sample["surface_index"],  # pyright: ignore[reportGeneralTypeIssues]  # only surface-scoped variants reach here
            sample["field_index"],
            sample["wavelength_index"],
            sample["options"],
            image_point,
        )
    return OPERAND_REGISTRY[kind](
        opm,
        sample["field_index"],
        sample["wavelength_index"],
        sample["options"],
        image_point,
    )


def operand_goal_residual(sample: OperandSample, actual: float) -> float:
    """Return the unweighted residual of one evaluated operand value.

    Adjustable-target operands return ``actual - target`` and fixed-target
    operands return ``actual`` (their implicit target is zero). Range operands return a dead-zone residual: zero inside the
    inclusive ``[min, max]`` band and the distance to the violated bound outside
    it; a missing bound is unbounded on that side. A non-finite range value
    returns ``PENALTY_RESIDUAL``, because no single sentinel value lies outside
    every possible one-sided band.

    Args:
        sample: Normalized operand sample.
        actual: One evaluated operand value.

    Returns:
        Unweighted residual.
    """
    goal = operand_goal(sample["kind"])  # pyright: ignore[reportGeneralTypeIssues]  # reserved operand variants type "kind" as Never
    if goal == "adjustable_target":
        return actual - sample["target"]  # pyright: ignore[reportGeneralTypeIssues]  # only adjustable-target variants reach here
    if goal == "fixed_target":
        return actual
    if not math.isfinite(actual):
        return PENALTY_RESIDUAL
    below = sample["min"] - actual if "min" in sample else 0.0
    above = actual - sample["max"] if "max" in sample else 0.0
    return max(0.0, below) + max(0.0, above)


def get_operand_num_rays(options: OperandOptions | None, default: int = 21) -> int:
    """Return the caller-configured ray sampling count for operand analyses.

    Args:
        options: Normalized operand options.
        default: Fallback ray-sampling count.

    Returns:
        The caller-configured ray sampling count for operand analyses.
    """
    return int((options or {}).get("num_rays", default))


def get_nominal_operand_sample_residual_count(sample: OperandSample) -> int:
    """Return the stable residual count contributed by one normalized operand sample.

    Args:
        sample: Normalized operand sample.

    Returns:
        The stable residual count contributed by one normalized operand sample.
    """
    if sample["kind"] == "ray_fan":  # pyright: ignore[reportGeneralTypeIssues]  # reserved operand variants type "kind" as Never
        return get_operand_num_rays(sample.get("options")) * 2
    if sample["kind"] in {"ray_fan_tangential", "ray_fan_sagittal"}:  # pyright: ignore[reportGeneralTypeIssues]  # reserved operand variants type "kind" as Never
        return get_operand_num_rays(sample.get("options"))
    return 1


def compute_rms_spot_size(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return RMS spot size for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        RMS spot size for one field/wavelength sample.
    """
    del image_point
    if field_index is None or wavelength_index is None:
        raise ValueError("rms_spot_size requires field and wavelength indices")
    num_rays = get_operand_num_rays(options)
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    grids, _ = opm["seq_model"].trace_grid(
        _spot_fn,
        field_index,
        wl=wavelengths[wavelength_index],
        num_rays=num_rays,
        form="list",
        append_if_none=False,
    )
    return _rms_radius(grids[0] if grids else [])


def compute_rms_wavefront_error(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return RMS WFE in waves for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        RMS WFE in waves for one field/wavelength sample.
    """
    if field_index is None or wavelength_index is None:
        raise ValueError("rms_wavefront_error requires field and wavelength indices")
    num_rays = get_operand_num_rays(options)
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    wavelength_nm = wavelengths[wavelength_index]
    ray_grid = make_ray_grid(
        opm,
        fi=field_index,
        wavelength_nm=wavelength_nm,
        num_rays=num_rays,
        image_point=image_point,
    )
    return _opd_wfe(_scale_opd_grid_to_wavelength(ray_grid.grid[2], opm, wavelength_nm))


def _select_fan_samples(wavelength_fan: dict, axis: str | None) -> list[float | None]:
    if axis is None:
        return [
            *wavelength_fan["Tangential"]["y"],
            *wavelength_fan["Sagittal"]["y"],
        ]
    return list(wavelength_fan[axis]["y"])


def _compute_opd_difference_for_axis(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
    axis: str | None = None,
) -> float:
    """Return mean absolute OPD deviation in waves for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.
        axis: Fan-axis payload key, or `None` to combine both axes.

    Returns:
        Mean absolute OPD deviation in waves for one field/wavelength sample.
    """
    if field_index is None or wavelength_index is None:
        raise ValueError("opd_difference requires field and wavelength indices")
    del options
    wavelength_fan = get_opd_fan_data_for_wavelength(
        opm,
        fi=field_index,
        wvl_idx=wavelength_index,
        image_point=image_point,
    )
    samples = np.array(_select_fan_samples(wavelength_fan, axis), dtype=float)
    valid = samples[np.isfinite(samples)]
    if len(valid) == 0:
        return PENALTY_RESIDUAL

    mean = float(np.mean(valid))
    return float(np.mean(np.abs(valid - mean)))


def compute_opd_difference(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return combined tangential and sagittal mean absolute OPD deviation.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Combined tangential and sagittal mean absolute OPD deviation.
    """
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, image_point)


def compute_opd_difference_tangential(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return tangential mean absolute OPD deviation.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Tangential mean absolute OPD deviation.
    """
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, image_point, "Tangential")


def compute_opd_difference_sagittal(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return sagittal mean absolute OPD deviation.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Sagittal mean absolute OPD deviation.
    """
    return _compute_opd_difference_for_axis(opm, field_index, wavelength_index, options, image_point, "Sagittal")


def compute_focal_length(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return paraxial effective focal length.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Paraxial effective focal length.
    """
    del field_index, wavelength_index, options, image_point
    return float(opm["analysis_results"]["parax_data"].fod.efl)


def compute_f_number(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return paraxial f-number.

    NA-specified pupils use ``corrected_parax_data`` so the f-number matches
    the specified NA rather than RayOptics 0.9.10's index-doubled axial ray.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Paraxial f-number.
    """
    del field_index, wavelength_index, options, image_point
    # WORKAROUND(rayoptics 0.9.10 NA bug): read the cached `fod.fno` directly
    # again once tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    return float(corrected_parax_data(opm).fod.fno)


def _compute_ray_fan_for_axis(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
    axis: str | None = None,
) -> list[float]:
    """Return ray-fan ordinates for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.
        axis: Axis to evaluate, where 0 is sagittal and 1 is tangential.

    Returns:
        Ray-fan ordinates for one field/wavelength sample.
    """
    if field_index is None or wavelength_index is None:
        raise ValueError("ray_fan requires field and wavelength indices")
    residual_count = get_operand_num_rays(options) * (2 if axis is None else 1)
    ray_fan_data = get_ray_fan_data(opm, fi=field_index, image_point=image_point)
    validate_surface_index(ray_fan_data, wavelength_index, "wavelength index")
    wavelength_fan = ray_fan_data[wavelength_index]
    samples = _select_fan_samples(wavelength_fan, axis)
    padded_samples = list(samples[:residual_count])
    while len(padded_samples) < residual_count:
        padded_samples.append(float("nan"))
    return [
        float(sample) if sample is not None and np.isfinite(sample) else PENALTY_RESIDUAL
        for sample in padded_samples
    ]


def compute_ray_fan(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> list[float]:
    """Return combined tangential and sagittal ray-fan ordinates for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Combined tangential and sagittal ray-fan ordinates for one field/wavelength sample.
    """
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, image_point)


def compute_ray_fan_tangential(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> list[float]:
    """Return tangential ray-fan ordinates for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Tangential ray-fan ordinates for one field/wavelength sample.
    """
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, image_point, "Tangential")


def compute_ray_fan_sagittal(
    opm: OpticalModel,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> list[float]:
    """Return sagittal ray-fan ordinates for one field/wavelength sample.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wavelength_index: Wavelength index.
        options: Normalized operand options.
        image_point: Image-point reference convention.

    Returns:
        Sagittal ray-fan ordinates for one field/wavelength sample.
    """
    return _compute_ray_fan_for_axis(opm, field_index, wavelength_index, options, image_point, "Sagittal")


def compute_edge_thickness(
    opm: OpticalModel,
    surface_index: int,
    field_index: int | None,
    wavelength_index: int | None,
    options: OperandOptions | None,
    image_point: str = "chief_ray",
) -> float:
    """Return the physical edge thickness of the gap after one surface.

    The edge thickness is ``thi + sag_next(h) - sag(h)`` measured along the gap's
    propagation direction (``seq_model.z_dir``, so gaps after an odd number of
    reflections still report a positive physical thickness), where ``h`` is the
    semi-diameter (``surface_od()``) of the selected surface only and ``sag_next``
    belongs to the following interface, which is the image for the last real
    surface. Both sags are evaluated at ``(x, y) = (0, h)``.

    Args:
        opm: RayOptics optical model.
        surface_index: 1-based real surface index; the object and image are excluded.
        field_index: Field index; unused.
        wavelength_index: Wavelength index; unused.
        options: Normalized operand options; unused.
        image_point: Image-point reference convention; unused.

    Returns:
        The edge thickness, or ``NaN`` when either sag is undefined at ``h`` (for
        example a semi-diameter beyond a sphere's radius) or the result is not finite.
    """
    del field_index, wavelength_index, options, image_point
    sm = opm["seq_model"]
    surface = sm.ifcs[surface_index]
    next_surface = sm.ifcs[surface_index + 1]
    height = float(surface.surface_od())
    try:
        sag = float(surface.profile.sag(0.0, height))
        next_sag = float(next_surface.profile.sag(0.0, height))
    except (TraceError, ValueError, ZeroDivisionError):
        return math.nan
    edge_thickness = sm.z_dir[surface_index] * (float(sm.gaps[surface_index].thi) + next_sag - sag)
    return edge_thickness if math.isfinite(edge_thickness) else math.nan


def compute_third_order_wavefront_coefficient(opm: OpticalModel, kind: str, surface_index: int | None) -> float:
    """Return one third-order wavefront coefficient in waves of the central wavelength.

    Values come from ``get_surface_by_surface_wavefront``: the paraxial
    third-order Seidel and primary colour package (NA-corrected, with aspheric
    contributions merged into their surface), not a real-ray wavefront.

    Args:
        opm: RayOptics optical model.
        kind: Third-order aberration operand kind; selects the column through
            ``THIRD_ORDER_WAVEFRONT_COLUMNS``.
        surface_index: 1-based real surface whose contribution is returned, or
            ``None`` for the system ``"sum"`` row.

    Returns:
        The coefficient of the selected row and column.
    """
    row = "sum" if surface_index is None else str(surface_index)
    return float(get_surface_by_surface_wavefront(opm).loc[row, THIRD_ORDER_WAVEFRONT_COLUMNS[kind]])


def _third_order_system_evaluator(kind: str) -> OperandEvaluator:
    """Return the system evaluator of a third-order kind, which reads the ``"sum"`` row."""

    def evaluate(
        opm: OpticalModel,
        field_index: int | None,
        wavelength_index: int | None,
        options: OperandOptions | None,
        image_point: str = "chief_ray",
    ) -> float:
        del field_index, wavelength_index, options, image_point
        return compute_third_order_wavefront_coefficient(opm, kind, None)

    return evaluate


def _third_order_surface_evaluator(kind: str) -> SurfaceOperandEvaluator:
    """Return the surface evaluator of a third-order kind, which reads one surface's row."""

    def evaluate(
        opm: OpticalModel,
        surface_index: int,
        field_index: int | None,
        wavelength_index: int | None,
        options: OperandOptions | None,
        image_point: str = "chief_ray",
    ) -> float:
        del field_index, wavelength_index, options, image_point
        return compute_third_order_wavefront_coefficient(opm, kind, surface_index)

    return evaluate


OPERAND_REGISTRY: dict[str, OperandEvaluator] = {
    "rms_spot_size": compute_rms_spot_size,
    "rms_wavefront_error": compute_rms_wavefront_error,
    "opd_difference": compute_opd_difference,
    "opd_difference_tangential": compute_opd_difference_tangential,
    "opd_difference_sagittal": compute_opd_difference_sagittal,
    "focal_length": compute_focal_length,
    "f_number": compute_f_number,
    "ray_fan": compute_ray_fan,
    "ray_fan_tangential": compute_ray_fan_tangential,
    "ray_fan_sagittal": compute_ray_fan_sagittal,
    **{kind: _third_order_system_evaluator(kind) for kind in THIRD_ORDER_WAVEFRONT_COLUMNS},
}
"""Evaluators for system-scoped operand kinds, including the system value of system-or-surface kinds."""

SURFACE_OPERAND_REGISTRY: dict[str, SurfaceOperandEvaluator] = {
    "edge_thickness": compute_edge_thickness,
    **{kind: _third_order_surface_evaluator(kind) for kind in THIRD_ORDER_WAVEFRONT_COLUMNS},
}
"""Evaluators for surface-scoped operand kinds, including the surface value of system-or-surface kinds."""
