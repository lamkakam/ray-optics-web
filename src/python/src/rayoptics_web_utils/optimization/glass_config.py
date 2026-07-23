"""Normalize glass-expert configuration and resolve catalog materials.

The categorical contract accepts only the six bundled manufacturer catalogs.
Resolved candidates retain canonical identity, the reusable optical medium, and
raw Fraunhofer ``(nd, Vd)`` coordinates so both search phases avoid repeated
catalog access.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache
import math
from typing import NotRequired, TypedDict, cast

from opticalglass.glassfactory import create_glass
from opticalglass.modelglass import ModelGlass
from rayoptics.environment import OpticalModel

from .config import normalize_merit_function, normalize_pickups, normalize_variables
from ._types import (
    GlassOptimizationConfig,
    MeritFunctionConfig,
    NormalizedGlassOptimizerConfig,
    NormalizedLeastSquaresOptimizerConfig,
    NormalizedOptimizationConfig,
    PickupConfig,
    VariableConfig,
)
from .targets import target_key, validate_surface_index


SUPPORTED_GLASS_CATALOGS = frozenset(
    {"CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita"}
)
GLASS_OPTIMIZER_KEYS = frozenset({"num_neighbours", "maxiter", "tol"})
GLASS_CONFIG_KEYS = frozenset(
    {"glass_optimizer", "glass_variables", "variables", "pickups", "merit_function"}
)
GLASS_VARIABLE_KEYS = frozenset({"surface_index", "candidates"})
GLASS_CANDIDATE_KEYS = frozenset({"name", "catalog"})


@dataclass(frozen=True)
class ResolvedGlassCandidate:
    """Canonical candidate identity, catalog medium, and raw glass-map point."""

    name: str
    catalog: str
    medium: object
    nd: float
    vd: float

    @property
    def identity(self) -> tuple[str, str]:
        """Return the catalog-qualified canonical identity."""
        return self.name, self.catalog

    def report_identity(self) -> dict[str, str]:
        """Return the JSON-safe identity used in progress context."""
        return {"name": self.name, "catalog": self.catalog}


class NormalizedGlassVariable(TypedDict):
    """One validated surface and its ordered resolved candidate pool."""

    surface_index: int
    candidates: list[ResolvedGlassCandidate]
    model_replacement: NotRequired[ResolvedGlassCandidate]


class NormalizedGlassOptimizationConfig(TypedDict):
    """Validated glass settings plus an OptimizationProblem-ready config."""

    glass_optimizer: NormalizedGlassOptimizerConfig
    glass_variables: list[NormalizedGlassVariable]
    variables: list[VariableConfig]
    pickups: list[PickupConfig]
    merit_function: MeritFunctionConfig
    problem_config: NormalizedOptimizationConfig


def _material_identity(medium: object) -> tuple[str, str]:
    """Read a RayOptics-compatible medium's name and catalog as strings."""
    try:
        name = str(medium.name())  # type: ignore[attr-defined]
        catalog = str(medium.catalog_name())  # type: ignore[attr-defined]
    except (AttributeError, TypeError) as error:
        raise ValueError("Unsupported current material for glass optimization") from error
    return name, catalog


def material_report_entry(surface_index: int, medium: object) -> dict[str, str | int]:
    """Return one JSON-safe material identity with its surface index."""
    name, catalog = _material_identity(medium)
    return {"surface_index": surface_index, "name": name, "catalog": catalog}


def _raw_nd_vd(medium: object) -> tuple[float, float]:
    """Calculate unscaled Fraunhofer d-index and V-number coordinates."""
    if isinstance(medium, ModelGlass):
        nd = float(medium.n)
        vd = float(medium.v)
    else:
        try:
            nd = float(medium.rindex("d"))  # type: ignore[attr-defined]
            n_f = float(medium.rindex("F"))  # type: ignore[attr-defined]
            n_c = float(medium.rindex("C"))  # type: ignore[attr-defined]
        except (AttributeError, KeyError, TypeError, ValueError) as error:
            raise ValueError("Unable to calculate glass nd/Vd coordinates") from error
        denominator = n_f - n_c
        if denominator == 0.0:
            raise ValueError("Unable to calculate glass nd/Vd coordinates")
        vd = (nd - 1.0) / denominator

    if not math.isfinite(nd) or not math.isfinite(vd):
        raise ValueError("Unable to calculate glass nd/Vd coordinates")
    return nd, vd


@lru_cache(maxsize=None)
def resolve_glass_candidate(name: str, catalog: str) -> ResolvedGlassCandidate:
    """Resolve and cache one catalog-qualified candidate and its coordinates."""
    if catalog not in SUPPORTED_GLASS_CATALOGS:
        raise ValueError(f"Unsupported glass catalog: {catalog}")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Glass candidate name must be a non-empty string")

    try:
        medium = create_glass(name, catalog)
    except Exception as error:
        raise ValueError(f"Unable to resolve glass {name!r} in catalog {catalog!r}") from error

    canonical_name, canonical_catalog = _material_identity(medium)
    if canonical_catalog not in SUPPORTED_GLASS_CATALOGS:
        raise ValueError(f"Unsupported glass catalog: {canonical_catalog}")
    nd, vd = _raw_nd_vd(medium)
    return ResolvedGlassCandidate(
        name=canonical_name,
        catalog=canonical_catalog,
        medium=medium,
        nd=nd,
        vd=vd,
    )


def _positive_integer(value: object, label: str) -> int:
    """Normalize a strictly positive non-boolean integer option."""
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{label} must be a positive integer")
    return value


def _normalize_glass_optimizer(config: GlassOptimizationConfig) -> NormalizedGlassOptimizerConfig:
    """Apply glass-expert defaults and reject unsupported options."""
    source = dict(config.get("glass_optimizer") or {})
    unknown = set(source) - GLASS_OPTIMIZER_KEYS
    if unknown:
        raise ValueError(f"Unsupported glass optimizer option: {sorted(unknown)[0]}")

    num_neighbours = _positive_integer(source.get("num_neighbours", 7), "num_neighbours")
    maxiter = _positive_integer(source.get("maxiter", 1000), "maxiter")
    if isinstance(source.get("tol", 1e-3), bool):
        raise ValueError("tol must be a positive finite number")
    try:
        tol = float(source.get("tol", 1e-3))
    except (TypeError, ValueError) as error:
        raise ValueError("tol must be a positive finite number") from error
    if not math.isfinite(tol) or tol <= 0.0:
        raise ValueError("tol must be a positive finite number")
    return {"num_neighbours": num_neighbours, "maxiter": maxiter, "tol": tol}


def _validate_numeric_bounds(entries: list[dict[str, object]]) -> None:
    """Require each numeric variable to be wholly bounded or wholly unbounded."""
    for entry in entries:
        has_min = "min" in entry
        has_max = "max" in entry
        if has_min != has_max:
            raise ValueError("Glass optimization variables must omit both min and max or provide both")
        if not has_min:
            continue
        try:
            minimum = float(entry["min"])
            maximum = float(entry["max"])
        except (TypeError, ValueError) as error:
            raise ValueError("Glass optimization variable bounds must satisfy finite min < max") from error
        if not math.isfinite(minimum) or not math.isfinite(maximum) or minimum >= maximum:
            raise ValueError("Glass optimization variable bounds must satisfy finite min < max")


def _resolve_glass_variables(
    opm: OpticalModel,
    entries: list[dict[str, object]],
) -> list[NormalizedGlassVariable]:
    """Validate ordered surface entries and resolve their candidate pools."""
    normalized: list[NormalizedGlassVariable] = []
    seen_surfaces: set[int] = set()
    gaps = opm["seq_model"].gaps

    for entry in entries:
        unknown_entry_keys = set(entry) - GLASS_VARIABLE_KEYS
        if unknown_entry_keys:
            raise ValueError(f"Unsupported glass variable key: {sorted(unknown_entry_keys)[0]}")
        surface_index = entry.get("surface_index")
        if isinstance(surface_index, bool):
            raise IndexError(f"surface_index {surface_index} is out of range")
        validate_surface_index(gaps, surface_index, "surface_index")
        if surface_index in seen_surfaces:
            raise ValueError(f"Duplicate glass variable surface: {surface_index}")
        seen_surfaces.add(surface_index)

        candidate_inputs = entry.get("candidates")
        if not isinstance(candidate_inputs, list) or not candidate_inputs:
            raise ValueError(f"Glass variable surface {surface_index} must provide candidates")

        candidates: list[ResolvedGlassCandidate] = []
        seen_candidates: set[tuple[str, str]] = set()
        for candidate_input in candidate_inputs:
            if not isinstance(candidate_input, dict):
                raise ValueError("Glass candidates must provide name and catalog")
            unknown_candidate_keys = set(candidate_input) - GLASS_CANDIDATE_KEYS
            if unknown_candidate_keys:
                raise ValueError(
                    f"Unsupported glass candidate key: {sorted(unknown_candidate_keys)[0]}"
                )
            name = candidate_input.get("name")
            catalog = candidate_input.get("catalog")
            if not isinstance(name, str) or not isinstance(catalog, str):
                raise ValueError("Glass candidates must provide name and catalog")
            candidate = resolve_glass_candidate(name, catalog)
            if candidate.identity in seen_candidates:
                raise ValueError(
                    f"Duplicate glass candidate: {candidate.name}, {candidate.catalog}"
                )
            seen_candidates.add(candidate.identity)
            candidates.append(candidate)

        current_medium = gaps[surface_index].medium
        current_name, current_catalog = _material_identity(current_medium)
        normalized_entry: NormalizedGlassVariable = {
            "surface_index": surface_index,
            "candidates": candidates,
        }
        if isinstance(current_medium, ModelGlass):
            nd, vd = _raw_nd_vd(current_medium)
            normalized_entry["model_replacement"] = min(
                candidates,
                key=lambda candidate: (candidate.nd - nd) ** 2 + (candidate.vd - vd) ** 2,
            )
        else:
            if current_catalog not in SUPPORTED_GLASS_CATALOGS:
                raise ValueError(
                    f"Unsupported current material at surface {surface_index}: "
                    f"{current_name}, {current_catalog}"
                )
            if (current_name, current_catalog) not in seen_candidates:
                raise ValueError(
                    f"Current glass must be included in candidates for surface {surface_index}"
                )
        normalized.append(normalized_entry)

    return normalized


def normalize_glass_optimization_config(
    opm: OpticalModel,
    config: GlassOptimizationConfig,
) -> NormalizedGlassOptimizationConfig:
    """Validate a flat mixed glass/continuous optimization configuration.

    Numeric variables may omit bounds or provide a finite strict interval. Glass
    surfaces and candidates are unique, ordered, catalog-resolved, and compatible
    with the incumbent medium. A ModelGlass incumbent records its nearest allowed
    replacement without mutating the optical model during validation.

    Args:
        opm: RayOptics optical model to validate against.
        config: Flat glass-expert configuration.

    Returns:
        Normalized settings, candidates, and problem configuration.
    """
    unknown = set(config) - GLASS_CONFIG_KEYS
    if unknown:
        raise ValueError(f"Unsupported glass optimization config key: {sorted(unknown)[0]}")

    glass_optimizer = _normalize_glass_optimizer(config)
    raw_variables = cast(list[dict[str, object]], deepcopy(config.get("variables") or []))
    _validate_numeric_bounds(raw_variables)

    internal_optimizer = cast(
        NormalizedLeastSquaresOptimizerConfig,
        {"kind": "least_squares", "method": "lm"},
    )
    variables = normalize_variables(opm, cast(list, raw_variables), internal_optimizer)
    variable_targets = {target_key(variable) for variable in variables}
    pickups = normalize_pickups(
        opm,
        cast(list, deepcopy(config.get("pickups") or [])),
        variable_targets,
    )
    merit_function = normalize_merit_function(
        opm,
        cast(dict, deepcopy(config.get("merit_function") or {})),
    )
    glass_variables = _resolve_glass_variables(
        opm,
        cast(list[dict[str, object]], deepcopy(config.get("glass_variables") or [])),
    )
    problem_config = cast(
        NormalizedOptimizationConfig,
        {
            "optimizer": internal_optimizer,
            "variables": variables,
            "pickups": pickups,
            "merit_function": merit_function,
        },
    )
    return {
        "glass_optimizer": glass_optimizer,
        "glass_variables": glass_variables,
        "variables": variables,
        "pickups": pickups,
        "merit_function": merit_function,
        "problem_config": problem_config,
    }
