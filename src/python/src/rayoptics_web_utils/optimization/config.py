"""Normalization and validation helpers for optimization configs."""

from __future__ import annotations

from collections import deque
from copy import deepcopy

from rayoptics.environment import OpticalModel

from .operands import OPERAND_REGISTRY
from .targets import (
    ensure_asphere_profile,
    is_toroid,
    supports_polynomials,
    surface_profile,
    target_key,
    validate_surface_index,
)
from ._types import (
    MeritFunctionConfig,
    MeritFunctionConfigInput,
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
)


def normalize_optimizer_config(config: OptimizationConfig) -> NormalizedOptimizerConfig:
    optimizer = deepcopy(config.get("optimizer") or {})
    kind = optimizer.get("kind", "least_squares")
    if kind != "least_squares":
        raise ValueError(f"Unknown optimizer kind: {kind}")
    optimizer.setdefault("method", "trf")
    return optimizer


def normalize_variables(opm: OpticalModel, variables: list[VariableConfigInput]) -> list[VariableConfig]:
    normalized: list[VariableConfig] = []
    seen_targets: set[TargetKey] = set()
    for entry in variables:
        kind = entry.get("kind")
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            raise ValueError(f"Unknown variable kind: {kind}")
        normalized_entry: VariableConfig = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
        validate_target_for_kind(opm, normalized_entry)
        key = target_key(normalized_entry)
        if key in seen_targets:
            raise ValueError(f"Duplicate variable target: {key}")
        if "min" not in entry or "max" not in entry:
            raise ValueError("Variables must provide both min and max bounds")
        normalized_entry["min"] = float(entry["min"])
        normalized_entry["max"] = float(entry["max"])
        normalized.append(normalized_entry)
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
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            raise ValueError(f"Unknown pickup kind: {kind}")
        normalized_entry: PickupConfig = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
            "source_surface_index": entry.get("source_surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
            normalized_entry["source_coefficient_index"] = entry.get("source_coefficient_index")
        validate_target_for_kind(opm, normalized_entry)
        validate_target_for_kind(
            opm,
            {
                **normalized_entry,
                "surface_index": normalized_entry["source_surface_index"],
                **(
                    {"coefficient_index": normalized_entry["source_coefficient_index"]}
                    if kind == "asphere_polynomial_coefficient"
                    else {}
                ),
            },
            "source_surface_index",
        )
        key = target_key(normalized_entry)
        if key in variable_targets:
            raise ValueError(f"Target {key} cannot be both variable and pickup target")
        if key in seen_targets:
            raise ValueError(f"Duplicate pickup target: {key}")
        normalized_entry["scale"] = float(entry.get("scale", 1.0))
        normalized_entry["offset"] = float(entry.get("offset", 0.0))
        normalized.append(normalized_entry)
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
        source = target_key(
            {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            }
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
    """Return pickups in dependency order after cycle validation."""
    by_target = {target_key(pickup): pickup for pickup in pickups}
    graph: dict[TargetKey, set[TargetKey]] = {}
    indegree: dict[TargetKey, int] = {}
    for target, pickup in by_target.items():
        source = target_key(
            {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            }
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
    kind = operand.get("kind")
    if kind not in OPERAND_REGISTRY:
        raise ValueError(f"Unknown operand kind: {kind}")

    base = {
        "kind": kind,
        "target": float(operand.get("target", 0.0)),
        "weight": float(operand.get("weight", 1.0)),
        "options": deepcopy(operand.get("options") or {}),
    }

    if kind in {"focal_length", "f_number"}:
        return [{**base, "field_index": None, "field_weight": 1.0, "wavelength_index": None, "wavelength_weight": 1.0}]

    fields = operand.get("fields") or [{"index": idx, "weight": 1.0} for idx in range(len(opm["optical_spec"]["fov"].fields))]
    wavelengths = operand.get("wavelengths") or [
        {"index": idx, "weight": 1.0} for idx in range(len(opm["optical_spec"]["wvls"].wavelengths))
    ]

    normalized: list[OperandSample] = []
    for field in fields:
        field_index = field.get("index")
        validate_surface_index(opm["optical_spec"]["fov"].fields, field_index, "field index")
        field_weight = float(field.get("weight", 1.0))
        for wavelength in wavelengths:
            wavelength_index = wavelength.get("index")
            validate_surface_index(opm["optical_spec"]["wvls"].wavelengths, wavelength_index, "wavelength index")
            wavelength_weight = float(wavelength.get("weight", 1.0))
            normalized.append(
                {
                    **base,
                    "field_index": field_index,
                    "field_weight": field_weight,
                    "wavelength_index": wavelength_index,
                    "wavelength_weight": wavelength_weight,
                }
            )
    return normalized


def normalize_merit_function(opm: OpticalModel, merit_function: MeritFunctionConfigInput) -> MeritFunctionConfig:
    operands = merit_function.get("operands") or []
    if len(operands) == 0:
        raise ValueError("merit_function.operands must not be empty")
    normalized_operands: list[OperandSample] = []
    for operand in operands:
        normalized_operands.extend(normalize_operand_samples(opm, operand))
    return {"operands": normalized_operands}


def normalize_config(opm: OpticalModel, config: OptimizationConfig) -> NormalizedOptimizationConfig:
    optimizer = normalize_optimizer_config(config)
    variables = normalize_variables(opm, deepcopy(config.get("variables") or []))
    variable_targets = {target_key(variable) for variable in variables}
    pickups = normalize_pickups(opm, deepcopy(config.get("pickups") or []), variable_targets)
    merit_function = normalize_merit_function(opm, deepcopy(config.get("merit_function") or {}))
    return {
        "optimizer": optimizer,
        "variables": variables,
        "pickups": pickups,
        "merit_function": merit_function,
    }
