"""# `python/src/rayoptics_web_utils/optimization/_types.py`

## Purpose

Provides the shared type aliases, `TypedDict` definitions, and small protocols used to make the optimization package's config, target, progress, solver, and report mappings explicit without changing runtime behavior.

## Public Surface

```python
type FloatArray = NDArray[np.float64]
type TargetKind = Literal[...]
type TargetKey = ...
type OptimizationStatus = int | Literal["evaluated", "no_variables", "stopped"]

class OptimizationConfig(TypedDict): ...
class NormalizedOptimizationConfig(TypedDict): ...
class VariableConfig(TypedDict): ...
class PickupConfig(TypedDict): ...
class OperandSample(TypedDict): ...
class SnapshotEntry(TypedDict): ...
class ProblemEvaluation(TypedDict): ...
class OptimizationReport(TypedDict): ...
class SolverResult(TypedDict): ...
class OptimizationProblemProtocol(Protocol): ...
```

## Key Behaviors

- Separates user-facing config inputs from normalized internal config shapes, including optional operand targets for target-less operands.
- Models optimizer config as solver-specific `TypedDict` unions. Least-squares config owns `method`, tolerances, and `max_nfev`; differential-evolution config owns DE options, uses `max_nfev` as its iteration-limit key, and has no `method` or `maxiter`.
- Uses discriminated target and pickup unions so per-kind keys such as `coefficient_index` are explicit.
- Variable typed dicts allow optional `min` / `max` so normalized configs can represent bounded `trf` / `differential_evolution` variables and unbounded `lm` variables with one shared union.
- Captures the existing JSON-serialisable result payload shape in concrete report/progress typed dicts; residual entries may omit `target`, and `OptimizationReport.status` includes `"stopped"` for user-requested partial-result stops.
- Optimizer and solver typed dicts allow solver-specific optional fields such as `method`, `njev`, `cost`, `optimality`, and `nit` instead of forcing every solver through the least-squares shape.
- Operand evaluators may return either one scalar residual or a list of residual samples.
- Operand evaluators receive `image_point` as their final argument so OPD-related operands can share the app-wide reference convention.
- Snapshot entries preserve both the original mutable target descriptor and its value so rollback can restore asphere targets without losing `asphere_kind`.
- Keeps solver adapters decoupled from the concrete `OptimizationProblem` class via a small protocol that exposes both residual-vector and scalar-merit objectives.

Shared type definitions for optimization helpers."""

from __future__ import annotations

import math
from typing import Callable, Literal, NotRequired, Protocol, TypedDict

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
]
type OptimizerKind = Literal["least_squares", "differential_evolution"]
type LeastSquaresMethod = Literal["trf", "lm"]
type AsphereKind = Literal["Conic", "EvenAspherical", "RadialPolynomial", "XToroid", "YToroid"]
type BaseTargetKey = tuple[TargetKind, int]
type PolynomialTargetKey = tuple[Literal["asphere_polynomial_coefficient"], int, int]
type TargetKey = BaseTargetKey | PolynomialTargetKey
type OptimizationStatus = int | Literal["evaluated", "no_variables", "stopped"]


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


type VariableConfig = (
    RadiusVariable
    | ThicknessVariable
    | AsphereConicVariable
    | AsphereToricSweepVariable
    | AspherePolynomialVariable
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


type TargetConfig = (
    RadiusTarget
    | ThicknessTarget
    | AsphereConicTarget
    | AsphereToricSweepTarget
    | AspherePolynomialTarget
)


class BasePickupConfigInput(TypedDict, total=False):
    kind: str
    surface_index: int
    source_surface_index: int
    scale: float
    offset: float


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


type PickupConfig = (
    RadiusPickup
    | ThicknessPickup
    | AsphereConicPickup
    | AsphereToricSweepPickup
    | AspherePolynomialPickup
)


class FieldSampleConfigInput(TypedDict, total=False):
    index: int
    weight: float


class WavelengthSampleConfigInput(TypedDict, total=False):
    index: int
    weight: float


class OperandConfigInput(TypedDict, total=False):
    kind: str
    target: NotRequired[float]
    weight: float
    fields: list[FieldSampleConfigInput]
    wavelengths: list[WavelengthSampleConfigInput]
    options: OperandOptions


class OperandSample(TypedDict):
    kind: str
    weight: float
    field_index: int | None
    field_weight: float
    wavelength_index: int | None
    wavelength_weight: float
    options: OperandOptions
    target: NotRequired[float]


class MeritFunctionConfigInput(TypedDict, total=False):
    operands: list[OperandConfigInput]


class MeritFunctionConfig(TypedDict):
    operands: list[OperandSample]


class OptimizationConfig(TypedDict, total=False):
    optimizer: OptimizerConfigInput
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


class ResidualEntry(TypedDict):
    kind: str
    value: float
    field_index: int | None
    wavelength_index: int | None
    operand_weight: float
    field_weight: float
    wavelength_weight: float
    total_weight: float
    weighted_residual: float
    target: NotRequired[float]


class MeritFunctionSummary(TypedDict):
    sum_of_squares: float
    rss: float


class OptimizationProgressEntry(TypedDict):
    iteration: int
    merit_function_value: float
    log10_merit_function_value: float


type ProgressReporter = Callable[[list[OptimizationProgressEntry]], None]


class OptimizerSummary(TypedDict):
    kind: OptimizerKind
    method: NotRequired[LeastSquaresMethod]
    nfev: NotRequired[int]
    njev: NotRequired[int]
    nit: NotRequired[int]
    cost: NotRequired[float]
    optimality: NotRequired[float]


class ProblemEvaluation(TypedDict):
    optimizer: OptimizerSummary
    initial_values: list[VariableStateEntry]
    final_values: list[VariableStateEntry]
    pickups: list[PickupReportEntry]
    residuals: list[ResidualEntry]
    merit_function: MeritFunctionSummary
    optimization_progress: list[OptimizationProgressEntry]


class OptimizationReport(ProblemEvaluation):
    success: bool
    status: OptimizationStatus
    message: str


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


type OperandValue = float | list[float]
type OperandEvaluator = Callable[[OpticalModel, int | None, int | None, OperandOptions | None, str], OperandValue]


class OptimizationProblemProtocol(Protocol):
    optimizer: NormalizedOptimizerConfig
    _progress_reporter: ProgressReporter | None

    def current_vector(self) -> FloatArray: ...

    def bounds(self) -> tuple[FloatArray, FloatArray]: ...

    def residual_objective(self, vector: FloatArray) -> FloatArray: ...

    def scalar_objective(self, vector: FloatArray) -> float: ...


def has_finite_variable_bounds(variable: VariableConfig) -> bool:
    """Return whether a normalized variable provides finite min/max bounds."""
    if "min" not in variable or "max" not in variable:
        return False
    return math.isfinite(variable["min"]) and math.isfinite(variable["max"])
