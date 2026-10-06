"""Define the optimization package's shared static contracts.

Input and normalized configs remain distinct. Solver options are discriminated by
kind, mutable targets by target kind, and result mappings allow solver-specific
metadata. Glass-expert inputs keep categorical candidates ordered separately from
continuous targets. Returned statuses distinguish successful evaluation/stop states,
numeric solver statuses, and ordinary Python ``"error"`` reports. Operand configs,
normalized samples, and residual entries are discriminated by kind into
adjustable-target, fixed-target, and range modes, each in a system scope and a
surface scope; surface-scoped operands additionally carry a 1-based
``surface_index`` that excludes the object and image surfaces. Operand evaluators may return scalars or residual
vectors and receive the image-point convention explicitly; surface evaluators also
receive the surface index. Snapshot entries retain the complete target descriptor so rollback
preserves asphere kinds and tilt/decenter coordinate strategies.
"""

from __future__ import annotations

import math
from contextlib import AbstractContextManager
from typing import Callable, Literal, Never, NotRequired, Protocol, Required, TypedDict

import numpy as np
from numpy.typing import NDArray
from rayoptics.environment import OpticalModel


type FloatArray = NDArray[np.float64]
type TargetKind = Literal[
    "radius",
    "thickness",
    "asphere_conic_constant",
    "asphere_polynomial_coefficient",
    "asphere_toric_sweep_radius",
    "decenter_alpha",
    "decenter_beta",
    "decenter_gamma",
    "decenter_x",
    "decenter_y",
]
type OptimizerKind = Literal["least_squares", "differential_evolution", "glass_expert"]
type LeastSquaresMethod = Literal["trf", "lm"]
type GlassOptimizationPhase = Literal["global", "local", "polish"]
type AsphereKind = Literal["Conic", "EvenAspherical", "RadialPolynomial", "XToroid", "YToroid"]
type BaseTargetKey = tuple[TargetKind, int]
type PolynomialTargetKey = tuple[Literal["asphere_polynomial_coefficient"], int, int]
type TargetKey = BaseTargetKey | PolynomialTargetKey
type OptimizationStatus = int | Literal["evaluated", "optimized", "no_variables", "stopped", "error"]


type AdjustableTargetOperandKind = Literal[
    "focal_length",
    "f_number",
    "opd_difference",
    "opd_difference_tangential",
    "opd_difference_sagittal",
    "rms_spot_size",
    "rms_wavefront_error",
]
"""Operand kinds driven toward one user-supplied scalar ``target``."""
type FixedTargetOperandKind = Literal["ray_fan", "ray_fan_tangential", "ray_fan_sagittal"]
"""Operand kinds with an implicit, non-configurable zero target; their (possibly vector) values are driven toward zero and configs carry no ``target``."""
type RangeOperandKind = Never
"""Operand kinds bounded by ``min``/``max``; reserved, no kind uses range mode yet."""
type SurfaceAdjustableTargetOperandKind = Never
"""Surface-scoped kinds driven toward a user-supplied ``target`` at one ``surface_index``; reserved, no kind uses it yet."""
type SurfaceFixedTargetOperandKind = Never
"""Surface-scoped kinds driven toward an implicit zero target at one ``surface_index``; reserved, no kind uses it yet."""
type SurfaceRangeOperandKind = Never
"""Surface-scoped kinds bounded by ``min``/``max`` at one ``surface_index``; reserved, no kind uses it yet."""
type SurfaceOperandKind = SurfaceAdjustableTargetOperandKind | SurfaceFixedTargetOperandKind | SurfaceRangeOperandKind
"""Operand kinds whose target or range applies to one optical surface."""
type OperandKind = AdjustableTargetOperandKind | FixedTargetOperandKind | RangeOperandKind | SurfaceOperandKind
type OperandGoal = Literal["adjustable_target", "fixed_target", "range"]
"""Target mode shared by every operand of one kind group."""
type OperandScope = Literal["system", "surface"]
"""Whether an operand kind evaluates the whole system or one 1-based ``surface_index``.

Surface indices match the GUI and ``seq_model.ifcs``: ``1`` is the first real
surface, and the object (``0``) and image (last) surfaces are excluded.
"""


class OperandOptions(TypedDict, total=False):
    num_rays: int


class LeastSquaresOptimizerOptions(TypedDict, total=False):
    ftol: float
    xtol: float
    gtol: float
    max_nfev: int


class DifferentialEvolutionOptimizerOptions(TypedDict, total=False):
    strategy: str
    max_nfev: int
    popsize: int
    tol: float
    mutation: float | tuple[float, float]
    recombination: float
    seed: int | np.random.RandomState | np.random.Generator | None
    polish: bool
    init: str | FloatArray
    atol: float


class LeastSquaresOptimizerConfigInput(LeastSquaresOptimizerOptions, total=False):
    kind: Literal["least_squares"]
    method: str


class DifferentialEvolutionOptimizerConfigInput(DifferentialEvolutionOptimizerOptions, total=False):
    kind: Literal["differential_evolution"]


type OptimizerConfigInput = LeastSquaresOptimizerConfigInput | DifferentialEvolutionOptimizerConfigInput


class NormalizedLeastSquaresOptimizerConfig(LeastSquaresOptimizerOptions):
    kind: Literal["least_squares"]
    method: LeastSquaresMethod


class NormalizedDifferentialEvolutionOptimizerConfig(DifferentialEvolutionOptimizerOptions):
    kind: Literal["differential_evolution"]


type NormalizedOptimizerConfig = NormalizedLeastSquaresOptimizerConfig | NormalizedDifferentialEvolutionOptimizerConfig


class BaseVariableConfigInput(TypedDict, total=False):
    kind: str
    surface_index: int
    min: float
    max: float
    decenter_type: str


class AsphereVariableConfigInput(BaseVariableConfigInput, total=False):
    asphere_kind: AsphereKind


class PolynomialVariableConfigInput(AsphereVariableConfigInput, total=False):
    coefficient_index: int


type VariableConfigInput = BaseVariableConfigInput | AsphereVariableConfigInput | PolynomialVariableConfigInput


class VariableBounds(TypedDict, total=False):
    min: float
    max: float


class RadiusVariable(VariableBounds):
    kind: Literal["radius"]
    surface_index: int


class ThicknessVariable(VariableBounds):
    kind: Literal["thickness"]
    surface_index: int


class AsphereConicVariable(VariableBounds):
    kind: Literal["asphere_conic_constant"]
    surface_index: int
    asphere_kind: AsphereKind


class AsphereToricSweepVariable(VariableBounds):
    kind: Literal["asphere_toric_sweep_radius"]
    surface_index: int
    asphere_kind: AsphereKind


class AspherePolynomialVariable(VariableBounds):
    kind: Literal["asphere_polynomial_coefficient"]
    surface_index: int
    asphere_kind: AsphereKind
    coefficient_index: int


class DecenterVariable(VariableBounds):
    kind: Literal["decenter_alpha", "decenter_beta", "decenter_gamma", "decenter_x", "decenter_y"]
    surface_index: int
    decenter_type: Literal["bend", "dec and return", "decenter", "reverse"]


type VariableConfig = (
    RadiusVariable
    | ThicknessVariable
    | AsphereConicVariable
    | AsphereToricSweepVariable
    | AspherePolynomialVariable
    | DecenterVariable
)


class RadiusTarget(TypedDict):
    kind: Literal["radius"]
    surface_index: int


class ThicknessTarget(TypedDict):
    kind: Literal["thickness"]
    surface_index: int


class AsphereConicTarget(TypedDict):
    kind: Literal["asphere_conic_constant"]
    surface_index: int
    asphere_kind: AsphereKind


class AsphereToricSweepTarget(TypedDict):
    kind: Literal["asphere_toric_sweep_radius"]
    surface_index: int
    asphere_kind: AsphereKind


class AspherePolynomialTarget(TypedDict):
    kind: Literal["asphere_polynomial_coefficient"]
    surface_index: int
    asphere_kind: AsphereKind
    coefficient_index: int


class DecenterTarget(TypedDict):
    kind: Literal["decenter_alpha", "decenter_beta", "decenter_gamma", "decenter_x", "decenter_y"]
    surface_index: int
    decenter_type: Literal["bend", "dec and return", "decenter", "reverse"]


type TargetConfig = (
    RadiusTarget
    | ThicknessTarget
    | AsphereConicTarget
    | AsphereToricSweepTarget
    | AspherePolynomialTarget
    | DecenterTarget
)


class BasePickupConfigInput(TypedDict, total=False):
    kind: str
    surface_index: int
    source_surface_index: int
    scale: float
    offset: float
    decenter_type: str


class AspherePickupConfigInput(BasePickupConfigInput, total=False):
    asphere_kind: AsphereKind


class PolynomialPickupConfigInput(AspherePickupConfigInput, total=False):
    coefficient_index: int
    source_coefficient_index: int


type PickupConfigInput = BasePickupConfigInput | AspherePickupConfigInput | PolynomialPickupConfigInput


class RadiusPickup(TypedDict):
    kind: Literal["radius"]
    surface_index: int
    source_surface_index: int
    scale: float
    offset: float


class ThicknessPickup(TypedDict):
    kind: Literal["thickness"]
    surface_index: int
    source_surface_index: int
    scale: float
    offset: float


class AsphereConicPickup(TypedDict):
    kind: Literal["asphere_conic_constant"]
    surface_index: int
    source_surface_index: int
    asphere_kind: AsphereKind
    scale: float
    offset: float


class AsphereToricSweepPickup(TypedDict):
    kind: Literal["asphere_toric_sweep_radius"]
    surface_index: int
    source_surface_index: int
    asphere_kind: AsphereKind
    scale: float
    offset: float


class AspherePolynomialPickup(TypedDict):
    kind: Literal["asphere_polynomial_coefficient"]
    surface_index: int
    source_surface_index: int
    asphere_kind: AsphereKind
    coefficient_index: int
    source_coefficient_index: int
    scale: float
    offset: float


class DecenterPickup(TypedDict):
    kind: Literal["decenter_alpha", "decenter_beta", "decenter_gamma", "decenter_x", "decenter_y"]
    surface_index: int
    source_surface_index: int
    decenter_type: Literal["bend", "dec and return", "decenter", "reverse"]
    scale: float
    offset: float


type PickupConfig = (
    RadiusPickup
    | ThicknessPickup
    | AsphereConicPickup
    | AsphereToricSweepPickup
    | AspherePolynomialPickup
    | DecenterPickup
)


class FieldSampleConfigInput(TypedDict, total=False):
    index: int
    weight: float


class WavelengthSampleConfigInput(TypedDict, total=False):
    index: int
    weight: float


class _OperandConfigInputBase(TypedDict, total=False):
    weight: float
    fields: list[FieldSampleConfigInput]
    wavelengths: list[WavelengthSampleConfigInput]
    options: OperandOptions


class AdjustableTargetOperandConfigInput(_OperandConfigInputBase, total=False):
    kind: Required[AdjustableTargetOperandKind]
    target: Required[float]


class FixedTargetOperandConfigInput(_OperandConfigInputBase, total=False):
    kind: Required[FixedTargetOperandKind]


class RangeOperandConfigInput(_OperandConfigInputBase, total=False):
    """Range operand input; normalization requires at least one finite bound and ``min <= max``."""

    kind: Required[RangeOperandKind]
    min: float
    max: float


class SurfaceAdjustableTargetOperandConfigInput(_OperandConfigInputBase, total=False):
    kind: Required[SurfaceAdjustableTargetOperandKind]
    target: Required[float]
    surface_index: Required[int]


class SurfaceFixedTargetOperandConfigInput(_OperandConfigInputBase, total=False):
    kind: Required[SurfaceFixedTargetOperandKind]
    surface_index: Required[int]


class SurfaceRangeOperandConfigInput(_OperandConfigInputBase, total=False):
    """Surface range operand input; bounds follow ``RangeOperandConfigInput``."""

    kind: Required[SurfaceRangeOperandKind]
    surface_index: Required[int]
    min: float
    max: float


type OperandConfigInput = (
    AdjustableTargetOperandConfigInput
    | FixedTargetOperandConfigInput
    | RangeOperandConfigInput
    | SurfaceAdjustableTargetOperandConfigInput
    | SurfaceFixedTargetOperandConfigInput
    | SurfaceRangeOperandConfigInput
)


class _OperandSampleBase(TypedDict):
    weight: float
    field_index: int | None
    field_weight: float
    wavelength_index: int | None
    wavelength_weight: float
    options: OperandOptions


class AdjustableTargetOperandSample(_OperandSampleBase):
    kind: AdjustableTargetOperandKind
    target: float


class FixedTargetOperandSample(_OperandSampleBase):
    kind: FixedTargetOperandKind


class RangeOperandSample(_OperandSampleBase):
    """Normalized range sample carrying only the bounds that were supplied."""

    kind: RangeOperandKind
    min: NotRequired[float]
    max: NotRequired[float]


class SurfaceAdjustableTargetOperandSample(_OperandSampleBase):
    kind: SurfaceAdjustableTargetOperandKind
    target: float
    surface_index: int


class SurfaceFixedTargetOperandSample(_OperandSampleBase):
    kind: SurfaceFixedTargetOperandKind
    surface_index: int


class SurfaceRangeOperandSample(_OperandSampleBase):
    """Normalized surface range sample carrying only the bounds that were supplied."""

    kind: SurfaceRangeOperandKind
    surface_index: int
    min: NotRequired[float]
    max: NotRequired[float]


type OperandSample = (
    AdjustableTargetOperandSample
    | FixedTargetOperandSample
    | RangeOperandSample
    | SurfaceAdjustableTargetOperandSample
    | SurfaceFixedTargetOperandSample
    | SurfaceRangeOperandSample
)


class MeritFunctionConfigInput(TypedDict, total=False):
    operands: list[OperandConfigInput]


class MeritFunctionConfig(TypedDict):
    operands: list[OperandSample]


class OptimizationConfig(TypedDict, total=False):
    optimizer: OptimizerConfigInput
    variables: list[VariableConfigInput]
    pickups: list[PickupConfigInput]
    merit_function: MeritFunctionConfigInput


class GlassOptimizerConfigInput(TypedDict, total=False):
    num_neighbours: int
    maxiter: int
    tol: float


class NormalizedGlassOptimizerConfig(TypedDict):
    num_neighbours: int
    maxiter: int
    tol: float


class GlassCandidateInput(TypedDict, total=False):
    name: str
    catalog: str


class GlassVariableConfigInput(TypedDict, total=False):
    surface_index: int
    candidates: list[GlassCandidateInput]


class GlassOptimizationConfig(TypedDict, total=False):
    glass_optimizer: GlassOptimizerConfigInput
    glass_variables: list[GlassVariableConfigInput]
    variables: list[VariableConfigInput]
    pickups: list[PickupConfigInput]
    merit_function: MeritFunctionConfigInput


class NormalizedOptimizationConfig(TypedDict):
    optimizer: NormalizedOptimizerConfig
    variables: list[VariableConfig]
    pickups: list[PickupConfig]
    merit_function: MeritFunctionConfig


type MutableTarget = TargetConfig | VariableConfig | PickupConfig


class VariableStateEntry(TypedDict):
    kind: TargetKind
    surface_index: int
    value: float
    min: NotRequired[float]
    max: NotRequired[float]
    asphere_kind: NotRequired[AsphereKind]
    coefficient_index: NotRequired[int]
    decenter_type: NotRequired[Literal["bend", "dec and return", "decenter", "reverse"]]


class PickupReportEntry(TypedDict):
    kind: TargetKind
    surface_index: int
    source_surface_index: int
    scale: float
    offset: float
    value: float
    asphere_kind: NotRequired[AsphereKind]
    coefficient_index: NotRequired[int]
    source_coefficient_index: NotRequired[int]


class SnapshotEntry(TypedDict):
    entry: MutableTarget
    value: float


class _ResidualEntryBase(TypedDict):
    value: float
    field_index: int | None
    wavelength_index: int | None
    operand_weight: float
    field_weight: float
    wavelength_weight: float
    total_weight: float
    weighted_residual: float


class AdjustableTargetResidualEntry(_ResidualEntryBase):
    kind: AdjustableTargetOperandKind
    target: float


class FixedTargetResidualEntry(_ResidualEntryBase):
    kind: FixedTargetOperandKind


class RangeResidualEntry(_ResidualEntryBase):
    kind: RangeOperandKind
    min: NotRequired[float]
    max: NotRequired[float]


class SurfaceAdjustableTargetResidualEntry(_ResidualEntryBase):
    kind: SurfaceAdjustableTargetOperandKind
    target: float
    surface_index: int


class SurfaceFixedTargetResidualEntry(_ResidualEntryBase):
    kind: SurfaceFixedTargetOperandKind
    surface_index: int


class SurfaceRangeResidualEntry(_ResidualEntryBase):
    kind: SurfaceRangeOperandKind
    surface_index: int
    min: NotRequired[float]
    max: NotRequired[float]


type ResidualEntry = (
    AdjustableTargetResidualEntry
    | FixedTargetResidualEntry
    | RangeResidualEntry
    | SurfaceAdjustableTargetResidualEntry
    | SurfaceFixedTargetResidualEntry
    | SurfaceRangeResidualEntry
)


class MeritFunctionSummary(TypedDict):
    sum_of_squares: float
    rss: float


class OptimizationProgressEntry(TypedDict):
    iteration: int
    merit_function_value: float
    log10_merit_function_value: float
    phase: NotRequired[GlassOptimizationPhase]
    surface_index: NotRequired[int]
    candidate: NotRequired[GlassCandidateInput]


type ProgressReporter = Callable[[list[OptimizationProgressEntry]], None]

# Factory for the context in which user interrupts may raise ``KeyboardInterrupt``.
# Entering it may raise immediately when a stop was requested before arming.
type InterruptScope = Callable[[], AbstractContextManager[None]]


class OptimizerSummary(TypedDict):
    kind: OptimizerKind
    method: NotRequired[LeastSquaresMethod | Literal["L-BFGS-B"]]
    nfev: NotRequired[int]
    njev: NotRequired[int]
    nit: NotRequired[int]
    cost: NotRequired[float]
    optimality: NotRequired[float]
    runs: NotRequired[int]
    num_neighbours: NotRequired[int]
    maxiter: NotRequired[int]
    tol: NotRequired[float]


class ProblemEvaluation(TypedDict):
    optimizer: OptimizerSummary
    initial_values: list[VariableStateEntry]
    final_values: list[VariableStateEntry]
    pickups: list[PickupReportEntry]
    residuals: list[ResidualEntry]
    merit_function: MeritFunctionSummary
    optimization_progress: list[OptimizationProgressEntry]


class FailureDiagnostic(TypedDict):
    """Optional failure details for worker logging; never returned to UI consumers."""

    exception_type: str
    message: str
    traceback: str


class OptimizationReport(ProblemEvaluation):
    """Numerical report with optional console-only Python failure diagnostics."""

    diagnostic: NotRequired[FailureDiagnostic]
    success: bool
    status: OptimizationStatus
    message: str


class GlassStateEntry(TypedDict):
    surface_index: int
    name: str
    catalog: str


class GlassOptimizationReport(OptimizationReport):
    initial_glasses: list[GlassStateEntry]
    final_glasses: list[GlassStateEntry]


class SolverResult(TypedDict):
    x: FloatArray
    success: bool
    status: int
    message: str
    nfev: NotRequired[int]
    njev: NotRequired[int]
    nit: NotRequired[int]
    cost: NotRequired[float]
    optimality: NotRequired[float]
    fun: NotRequired[float]


type OperandValue = float | list[float]
type OperandEvaluator = Callable[[OpticalModel, int | None, int | None, OperandOptions | None, str], OperandValue]
type SurfaceOperandEvaluator = Callable[
    [OpticalModel, int, int | None, int | None, OperandOptions | None, str], OperandValue
]
"""Surface-scoped evaluator receiving ``(opm, surface_index, field_index, wavelength_index, options, image_point)``."""


class OptimizationProblemProtocol(Protocol):
    optimizer: NormalizedOptimizerConfig
    variables: list[VariableConfig]
    _progress_reporter: ProgressReporter | None

    def current_vector(self) -> FloatArray: ...

    def bounds(self) -> tuple[FloatArray, FloatArray]: ...

    def residual_objective(self, vector: FloatArray) -> FloatArray: ...

    def residual_jacobian(
        self,
        vector: FloatArray,
        bounds: tuple[FloatArray | float, FloatArray | float],
    ) -> FloatArray: ...

    def scalar_objective(self, vector: FloatArray) -> float: ...


def has_finite_variable_bounds(variable: VariableConfig) -> bool:
    """Return whether a normalized variable provides finite min/max bounds.

    Args:
        variable: Normalized optimization variable.

    Returns:
        Whether a normalized variable provides finite min/max bounds.
    """
    if "min" not in variable or "max" not in variable:
        return False
    return math.isfinite(variable["min"]) and math.isfinite(variable["max"])
