"""Normalize and validate optimization configuration.

Least-squares supports ``trf`` and ``lm``; differential evolution has its own
methodless option set. Bounded solvers require finite bounds, while ``lm`` permits
fully unbounded variables and requires at least as many nominal residuals as
variables and a ``max_nfev`` of at least 2. A differential-evolution ``max_nfev``
budget must cover at least one full SciPy population. Validation also enforces unique mutable targets, acyclic pickups, and
stable option-driven residual counts after field/wavelength expansion. Tilt and
decenter targets validate their interface and coordinate strategy, materialize
missing target data, and leave missing pickup sources unconfigured. Operand
normalization enforces the kind's target mode and scope (surface-scoped kinds
require a 1-based ``surface_index`` that excludes the object and image surfaces;
system kinds reject it), requires positive bounds for positive-range kinds
such as ``edge_thickness``, validates every supplied field and
wavelength index, preserves sample order, and then removes combinations with an
exactly zero operand, field, or wavelength weight. Kinds in
``UNEXPANDED_OPERAND_KINDS`` (focal length, f-number, and edge thickness) produce
a single sample without field or wavelength indices.
"""

from __future__ import annotations

import math
from collections import deque
from copy import deepcopy
from typing import TYPE_CHECKING, Any, TypeGuard, cast

import numpy as np

from .operands import (
    POSITIVE_RANGE_OPERAND_KINDS,
    UNEXPANDED_OPERAND_KINDS,
    get_nominal_operand_sample_residual_count,
    is_registered_operand_kind,
    operand_goal,
    operand_scope,
)
from .targets import (
    DECENTER_KINDS,
    DECENTER_TYPES,
    ensure_asphere_profile,
    ensure_decenter_data,
    is_toroid,
    supports_polynomials,
    surface_profile,
    target_key,
    validate_surface_index,
)
from ._types import (
    MeritFunctionConfig,
    MeritFunctionConfigInput,
    MutableTarget,
    NormalizedDifferentialEvolutionOptimizerConfig,
    NormalizedLeastSquaresOptimizerConfig,
    NormalizedOptimizationConfig,
    NormalizedOptimizerConfig,
    OperandConfigInput,
    OperandSample,
    OptimizationConfig,
    PickupConfig,
    PickupConfigInput,
    TargetKey,
    VariableConfig,
    VariableConfigInput,
    has_finite_variable_bounds,
)

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel


LEAST_SQUARES_OPTIMIZER_KEYS = {"kind", "method", "ftol", "xtol", "gtol", "max_nfev"}
DIFFERENTIAL_EVOLUTION_OPTIMIZER_KEYS = {
    "kind",
    "strategy",
    "max_nfev",
    "popsize",
    "tol",
    "mutation",
    "recombination",
    "seed",
    "polish",
    "init",
    "atol",
}


def reject_unknown_optimizer_options(optimizer: dict[str, object], kind: object, allowed_keys: set[str]) -> None:
    unknown_keys = set(optimizer) - allowed_keys
    if unknown_keys:
        key = sorted(unknown_keys)[0]
        raise ValueError(f"Unsupported optimizer option for {kind}: {key}")


def normalize_optimizer_config(config: OptimizationConfig) -> NormalizedOptimizerConfig:
    optimizer = dict(cast(dict[str, object], deepcopy(config.get("optimizer") or {})))
    kind = optimizer.get("kind", "least_squares")
    if kind not in {"least_squares", "differential_evolution"}:
        raise ValueError(f"Unknown optimizer kind: {kind}")
    if kind == "least_squares":
        reject_unknown_optimizer_options(optimizer, kind, LEAST_SQUARES_OPTIMIZER_KEYS)
        method = optimizer.get("method", "trf")
        if method not in {"trf", "lm"}:
            raise ValueError(f"Unknown least-squares method: {method}")
        return cast(
            NormalizedLeastSquaresOptimizerConfig,
            {
                **optimizer,
                "kind": kind,
                "method": method,
            },
        )

    reject_unknown_optimizer_options(optimizer, kind, DIFFERENTIAL_EVOLUTION_OPTIMIZER_KEYS)
    return cast(
        NormalizedDifferentialEvolutionOptimizerConfig,
        {
            **optimizer,
            "kind": kind,
        },
    )


def normalize_variables(
    opm: OpticalModel,
    variables: list[VariableConfigInput],
    optimizer: NormalizedOptimizerConfig,
) -> list[VariableConfig]:
    normalized: list[VariableConfig] = []
    seen_targets: set[TargetKey] = set()
    for entry in variables:
        kind = entry.get("kind")
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius", *DECENTER_KINDS}:
            raise ValueError(f"Unknown variable kind: {kind}")
        # Built from unvalidated input; ``variable`` is its typed view once validated.
        normalized_entry: dict[str, Any] = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind in DECENTER_KINDS:
            normalized_entry["decenter_type"] = entry.get("decenter_type")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
        variable = cast("VariableConfig", normalized_entry)
        validate_target_for_kind(opm, variable)
        key = target_key(variable)
        if key in seen_targets:
            raise ValueError(f"Duplicate variable target: {key}")
        has_min = "min" in entry
        has_max = "max" in entry
        if has_min:
            normalized_entry["min"] = float(entry["min"])
        if has_max:
            normalized_entry["max"] = float(entry["max"])
        if optimizer["kind"] == "least_squares" and optimizer["method"] == "trf":
            if not has_min or not has_max:
                raise ValueError("Variables must provide both min and max bounds")
        elif optimizer["kind"] == "least_squares" and optimizer["method"] == "lm" and has_min != has_max:
            raise ValueError("lm variables must omit both min and max bounds together")
        elif optimizer["kind"] == "differential_evolution":
            if not has_finite_variable_bounds(variable):
                raise ValueError("Differential evolution variables must provide finite min and max bounds")
        normalized.append(variable)
        seen_targets.add(key)
    return normalized


def normalize_pickups(
    opm: OpticalModel,
    pickups: list[PickupConfigInput],
    variable_targets: set[TargetKey],
) -> list[PickupConfig]:
    normalized: list[PickupConfig] = []
    seen_targets: set[TargetKey] = set()
    for entry in pickups:
        kind = entry.get("kind")
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius", *DECENTER_KINDS}:
            raise ValueError(f"Unknown pickup kind: {kind}")
        # Built from unvalidated input; ``pickup`` is its typed view once validated.
        normalized_entry: dict[str, Any] = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
            "source_surface_index": entry.get("source_surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind in DECENTER_KINDS:
            normalized_entry["decenter_type"] = entry.get("decenter_type")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
            normalized_entry["source_coefficient_index"] = entry.get("source_coefficient_index")
        pickup = cast("PickupConfig", normalized_entry)
        validate_target_for_kind(opm, pickup)
        validate_target_for_kind(
            opm,
            cast("PickupConfig", {
                **normalized_entry,
                "surface_index": normalized_entry["source_surface_index"],
                **(
                    {"coefficient_index": normalized_entry["source_coefficient_index"]}
                    if kind == "asphere_polynomial_coefficient"
                    else {}
                ),
            }),
            "source_surface_index",
        )
        key = target_key(pickup)
        if key in variable_targets:
            raise ValueError(f"Target {key} cannot be both variable and pickup target")
        if key in seen_targets:
            raise ValueError(f"Duplicate pickup target: {key}")
        normalized_entry["scale"] = float(entry.get("scale", 1.0))
        normalized_entry["offset"] = float(entry.get("offset", 0.0))
        normalized.append(pickup)
        seen_targets.add(key)
    validate_pickup_graph(normalized)
    return normalized


def validate_target_for_kind(opm: OpticalModel, entry: VariableConfig | PickupConfig, label: str = "surface_index") -> None:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        validate_surface_index(sm.ifcs, surface_index, label)
        return
    if kind == "thickness":
        validate_surface_index(sm.gaps, surface_index, label)
        return
    if kind in DECENTER_KINDS:
        validate_surface_index(sm.ifcs, surface_index, label)
        if entry.get("decenter_type") not in DECENTER_TYPES:
            raise ValueError(f"Unknown decenter type: {entry.get('decenter_type')}")
        ensure_decenter_data(opm, entry, materialize=label == "surface_index")
        return
    if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
        validate_surface_index(sm.ifcs, surface_index, label)
        ensure_asphere_profile(opm, entry)
        profile = surface_profile(opm, surface_index)
        if kind == "asphere_polynomial_coefficient":
            coefficient_index = entry.get("coefficient_index")
            if not isinstance(coefficient_index, int) or coefficient_index < 0 or coefficient_index > 9:
                raise IndexError(f"coefficient_index {coefficient_index} is out of range")
            if not supports_polynomials(profile):
                raise ValueError("Polynomial coefficient target requires a coefficient-bearing asphere")
        if kind == "asphere_toric_sweep_radius" and not is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        return
    raise ValueError(f"Unknown variable kind: {kind}")


def validate_pickup_graph(pickups: list[PickupConfig]) -> None:
    graph: dict[TargetKey, set[TargetKey]] = {}
    indegree: dict[TargetKey, int] = {}
    for pickup in pickups:
        target = target_key(pickup)
        # target_key reads only the identity fields of the pickup source.
        source = target_key(
            cast("MutableTarget", {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            })
        )
        graph.setdefault(source, set()).add(target)
        graph.setdefault(target, set())
        indegree.setdefault(source, 0)
        indegree[target] = indegree.get(target, 0) + 1

    queue = deque([node for node, degree in indegree.items() if degree == 0])
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in graph.get(node, set()):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    if visited != len(indegree):
        raise ValueError("Pickup cycle detected")


def pickup_order(pickups: list[PickupConfig]) -> list[PickupConfig]:
    """Return pickups in dependency order after cycle validation.

    Args:
        pickups: Normalized pickup configurations.

    Returns:
        Pickups in dependency order after cycle validation.
    """
    by_target = {target_key(pickup): pickup for pickup in pickups}
    graph: dict[TargetKey, set[TargetKey]] = {}
    indegree: dict[TargetKey, int] = {}
    for target, pickup in by_target.items():
        # target_key reads only the identity fields of the pickup source.
        source = target_key(
            cast("MutableTarget", {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            })
        )
        graph.setdefault(source, set()).add(target)
        graph.setdefault(target, set())
        indegree.setdefault(source, 0)
        indegree[target] = indegree.get(target, 0) + 1
    queue = deque([node for node, degree in indegree.items() if degree == 0])
    ordered_targets: list[TargetKey] = []
    while queue:
        node = queue.popleft()
        if node in by_target:
            ordered_targets.append(node)
        for neighbor in graph.get(node, set()):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    return [by_target[target] for target in ordered_targets]


def normalize_operand_samples(opm: OpticalModel, operand: OperandConfigInput) -> list[OperandSample]:
    """Expand one operand into ordered non-zero-weight field/wavelength samples.

    All supplied indices, target-mode fields, and surface-scope fields are
    validated before exact-zero weights are filtered, so disabled UI rows cannot
    conceal an invalid field, wavelength, or surface reference or a malformed
    target. Adjustable-target kinds require a finite ``target``; fixed-target kinds
    accept neither ``target`` nor range bounds; range kinds require at least one
    finite bound with ``min <= max`` and keep only the supplied bounds.
    Surface-scoped kinds of each mode additionally keep their ``surface_index``.

    Args:
        opm: RayOptics optical model.
        operand: Unnormalized operand configuration.

    Returns:
        Normalized samples in the input field-major, wavelength-minor order.
    """
    kind = operand.get("kind")
    if not is_registered_operand_kind(kind):
        raise ValueError(f"Unknown operand kind: {kind}")

    base = {
        "kind": kind,
        "weight": float(operand.get("weight", 1.0)),
        "options": deepcopy(operand.get("options") or {}),
        **normalize_operand_goal_fields(kind, operand),
        **normalize_operand_scope_fields(opm, kind, operand),
    }

    if kind in UNEXPANDED_OPERAND_KINDS:
        if base["weight"] == 0.0:
            return []
        return [cast("OperandSample", {**base, "field_index": None, "field_weight": 1.0, "wavelength_index": None, "wavelength_weight": 1.0})]

    fields = operand.get("fields") or [{"index": idx, "weight": 1.0} for idx in range(len(opm["optical_spec"]["fov"].fields))]
    wavelengths = operand.get("wavelengths") or [
        {"index": idx, "weight": 1.0} for idx in range(len(opm["optical_spec"]["wvls"].wavelengths))
    ]

    normalized_fields: list[tuple[int, float]] = []
    for field in fields:
        field_index = field.get("index")
        validate_surface_index(opm["optical_spec"]["fov"].fields, field_index, "field index")
        field_index = cast(int, field_index)  # validated above
        normalized_fields.append((field_index, float(field.get("weight", 1.0))))

    normalized_wavelengths: list[tuple[int, float]] = []
    for wavelength in wavelengths:
        wavelength_index = wavelength.get("index")
        validate_surface_index(opm["optical_spec"]["wvls"].wavelengths, wavelength_index, "wavelength index")
        wavelength_index = cast(int, wavelength_index)  # validated above
        normalized_wavelengths.append((wavelength_index, float(wavelength.get("weight", 1.0))))

    normalized: list[OperandSample] = []
    for field_index, field_weight in normalized_fields:
        for wavelength_index, wavelength_weight in normalized_wavelengths:
            if base["weight"] == 0.0 or field_weight == 0.0 or wavelength_weight == 0.0:
                continue
            normalized.append(
                cast("OperandSample", {
                    **base,
                    "field_index": field_index,
                    "field_weight": field_weight,
                    "wavelength_index": wavelength_index,
                    "wavelength_weight": wavelength_weight,
                })
            )
    return normalized


def normalize_operand_goal_fields(kind: str, operand: OperandConfigInput) -> dict[str, float]:
    """Validate and return the target-mode fields carried by one operand.

    Args:
        kind: Registered operand kind.
        operand: Unnormalized operand configuration.

    Returns:
        ``{"target": ...}`` for adjustable-target kinds, the supplied
        ``min``/``max`` for range kinds (strictly positive for kinds in
        ``POSITIVE_RANGE_OPERAND_KINDS``), or an empty mapping for fixed-target
        kinds, whose zero target is implicit.

    Raises:
        ValueError: If the operand's fields do not match its kind's target mode.
    """
    goal = operand_goal(kind)
    has_bounds = "min" in operand or "max" in operand
    if goal != "range" and has_bounds:
        raise ValueError(f"Operand {kind} does not accept range bounds")
    if goal != "adjustable_target" and "target" in operand:
        raise ValueError(f"Operand {kind} does not accept a target")
    if goal == "fixed_target":
        return {}
    if goal == "adjustable_target":
        target = operand.get("target")
        if not _is_finite_number(target):
            raise ValueError(f"Operand {kind} requires a finite target")
        return {"target": float(target)}

    if not has_bounds:
        raise ValueError(f"Operand {kind} range requires at least one bound")
    bounds = {key: operand[key] for key in ("min", "max") if key in operand}  # pyright: ignore[reportTypedDictNotRequiredAccess, reportGeneralTypeIssues]  # guarded by "key in operand"
    if not all(_is_finite_number(value) for value in bounds.values()):
        raise ValueError(f"Operand {kind} range bounds must be finite")
    normalized = {key: float(value) for key, value in bounds.items()}
    if kind in POSITIVE_RANGE_OPERAND_KINDS and any(value <= 0.0 for value in normalized.values()):
        raise ValueError(f"Operand {kind} range bounds must be positive")
    if "min" in normalized and "max" in normalized and normalized["min"] > normalized["max"]:
        raise ValueError(f"Operand {kind} range min must not exceed max")
    return normalized


def normalize_operand_scope_fields(opm: OpticalModel, kind: str, operand: OperandConfigInput) -> dict[str, int]:
    """Validate and return the surface-scope fields carried by one operand.

    Surface indices are 1-based and match ``seq_model.ifcs``: the object surface
    (``0``) and the image surface (the last interface) are not valid targets.

    Args:
        opm: RayOptics optical model.
        kind: Registered operand kind.
        operand: Unnormalized operand configuration.

    Returns:
        ``{"surface_index": ...}`` for surface-scoped kinds, or an empty mapping
        for system kinds.

    Raises:
        ValueError: If a system kind supplies ``surface_index`` or a surface kind
            omits it or supplies a non-integer.
        IndexError: If a surface kind's ``surface_index`` is not a real surface.
    """
    if operand_scope(kind) == "system":
        if "surface_index" in operand:
            raise ValueError(f"Operand {kind} does not accept a surface_index")
        return {}
    surface_index = operand.get("surface_index")
    if not isinstance(surface_index, int) or isinstance(surface_index, bool):
        raise ValueError(f"Operand {kind} requires an integer surface_index")
    if surface_index < 1 or surface_index > len(opm["seq_model"].ifcs) - 2:
        raise IndexError(f"Operand {kind} surface_index {surface_index} is out of range")
    return {"surface_index": surface_index}


def _is_finite_number(value: object) -> TypeGuard[int | float]:
    """Return whether a config value is a finite real number (booleans excluded)."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def normalize_merit_function(opm: OpticalModel, merit_function: MeritFunctionConfigInput) -> MeritFunctionConfig:
    """Return normalized non-zero-weight merit samples.

    Raises:
        ValueError: If no operand is supplied or every expanded sample has an
            exactly zero effective weight.
    """
    operands = merit_function.get("operands") or []
    if len(operands) == 0:
        raise ValueError("merit_function.operands must not be empty")
    normalized_operands: list[OperandSample] = []
    for operand in operands:
        normalized_operands.extend(normalize_operand_samples(opm, operand))
    if len(normalized_operands) == 0:
        raise ValueError("merit_function.operands must include at least one non-zero weighted sample")
    return {"operands": normalized_operands}


DIFFERENTIAL_EVOLUTION_DEFAULT_POPSIZE = 15
DIFFERENTIAL_EVOLUTION_MIN_POPULATION = 5
LEVENBERG_MARQUARDT_MIN_NFEV = 2
"""MINPACK ``lmder`` always evaluates a trial step after the initial point."""


def differential_evolution_population_size(
    optimizer: NormalizedOptimizerConfig,
    variables: list[VariableConfig],
) -> int:
    """Return the population size SciPy differential evolution will evaluate.

    Mirrors SciPy: an array ``init`` fixes the population to its row count;
    otherwise the population is ``max(5, popsize * max(1, N - E))`` where ``E``
    counts variables whose ``min`` equals ``max``, rounded up to the next power
    of two for ``init="sobol"``. Equality is unit-independent, so external radius
    bounds count the same as SciPy's curvature bounds.

    Args:
        optimizer: Normalized differential-evolution optimizer config.
        variables: Normalized variables with finite bounds.

    Returns:
        Number of objective evaluations in one generation.
    """
    init = optimizer.get("init", "latinhypercube")
    if not isinstance(init, str):
        return int(np.shape(init)[0])
    popsize = int(optimizer.get("popsize", DIFFERENTIAL_EVOLUTION_DEFAULT_POPSIZE))
    equal_bound_count = sum(
        1 for variable in variables if "min" in variable and "max" in variable and variable["min"] == variable["max"]
    )
    population_size = max(
        DIFFERENTIAL_EVOLUTION_MIN_POPULATION,
        popsize * max(1, len(variables) - equal_bound_count),
    )
    if init == "sobol":
        return 1 << (population_size - 1).bit_length()
    return population_size


def validate_optimizer_dimensions(
    optimizer: NormalizedOptimizerConfig,
    variables: list[VariableConfig],
    merit_function: MeritFunctionConfig,
) -> None:
    """Validate optimizer-specific limits that depend on problem dimensions.

    - ``lm`` requires at least as many nominal residuals as variables and, whenever
      variables are present, an explicit ``max_nfev`` of at least
      ``LEVENBERG_MARQUARDT_MIN_NFEV`` because MINPACK always evaluates one trial
      step after the initial point.
    - Differential evolution always evaluates its whole first population, so an
      explicit ``max_nfev`` must be at least ``differential_evolution_population_size``
      whenever variables are present.

    Args:
        optimizer: Normalized optimizer config.
        variables: Normalized variables.
        merit_function: Normalized merit function.

    Raises:
        ValueError: If the optimizer cannot run within these dimensions.
    """
    if optimizer["kind"] == "differential_evolution":
        max_nfev = optimizer.get("max_nfev")
        if (
            max_nfev is not None
            and len(variables) > 0
            and max_nfev < differential_evolution_population_size(optimizer, variables)
        ):
            raise ValueError("Differential evolution max_nfev must cover at least one full population")
        return
    if optimizer["method"] != "lm":
        return
    max_nfev = optimizer.get("max_nfev")
    if max_nfev is not None and len(variables) > 0 and max_nfev < LEVENBERG_MARQUARDT_MIN_NFEV:
        raise ValueError("Levenberg-Marquardt max_nfev must be at least 2")
    nominal_residual_count = sum(
        get_nominal_operand_sample_residual_count(operand)
        for operand in merit_function["operands"]
    )
    if nominal_residual_count < len(variables):
        raise ValueError("Levenberg-Marquardt requires at least as many residuals as variables")


def normalize_config(opm: OpticalModel, config: OptimizationConfig) -> NormalizedOptimizationConfig:
    optimizer = normalize_optimizer_config(config)
    variables = normalize_variables(opm, deepcopy(config.get("variables") or []), optimizer)
    variable_targets = {target_key(variable) for variable in variables}
    pickups = normalize_pickups(opm, deepcopy(config.get("pickups") or []), variable_targets)
    merit_function = normalize_merit_function(opm, deepcopy(config.get("merit_function") or {}))
    validate_optimizer_dimensions(optimizer, variables, merit_function)
    return {
        "optimizer": optimizer,
        "variables": variables,
        "pickups": pickups,
        "merit_function": merit_function,
    }
