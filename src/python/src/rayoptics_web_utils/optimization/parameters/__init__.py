"""Read, write, snapshot, and key optimizable constructional parameters.

``PARAMETER_ACCESSORS`` maps every ``ConstructionalParameterKind`` to the accessor
of the surface property that owns it (one module per property: ``radius``,
``thickness``, ``aspherical``, ``decenter``), mirroring the TypeScript parameter
shapes; a parity test checks both against the shared manifest fixture. Public
radius values are preserved while optimizer vectors use curvature. Snapshot
entries retain full asphere and decenter descriptors so restoration can recover
materialized parameters safely.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from .._types import (
    ConstructionalParameterKind,
    MutableParameter,
    ParameterIdentity,
    ParameterKey,
    PickupConfig,
    PolynomialParameterKey,
    SnapshotEntry,
    VariableConfig,
)
from ._accessor import (
    ParameterAccessor,
    curvature_to_radius,
    radius_to_curvature,
    surface_profile,
    validate_surface_index,
)
from .aspherical import (
    ASPHERICAL_ACCESSOR,
    asphere_kinds,
    ensure_asphere_profile,
    is_toroid,
    supports_polynomials,
)
from .decenter import DECENTER_ACCESSOR, DECENTER_KINDS, DECENTER_TYPES, ensure_decenter_data
from .radius import RADIUS_ACCESSOR
from .thickness import THICKNESS_ACCESSOR

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

__all__ = [
    "DECENTER_KINDS",
    "DECENTER_TYPES",
    "PARAMETER_ACCESSORS",
    "ParameterAccessor",
    "asphere_kinds",
    "curvature_to_radius",
    "ensure_asphere_profile",
    "ensure_decenter_data",
    "entry_from_parameter_key",
    "is_toroid",
    "parameter_key",
    "radius_to_curvature",
    "read_parameter_value",
    "restore_state",
    "snapshot_state",
    "supports_polynomials",
    "surface_profile",
    "validate_surface_index",
    "write_parameter_value",
]

PARAMETER_ACCESSORS: dict[ConstructionalParameterKind, ParameterAccessor] = {
    kind: accessor
    for accessor in (RADIUS_ACCESSOR, THICKNESS_ACCESSOR, ASPHERICAL_ACCESSOR, DECENTER_ACCESSOR)
    for kind in accessor.kinds
}
"""Accessor owning each constructional-parameter kind."""


def _accessor_for(entry: MutableParameter) -> ParameterAccessor:
    accessor = PARAMETER_ACCESSORS.get(entry["kind"])
    if accessor is None:
        raise ValueError(f"Unknown variable kind: {entry['kind']}")
    return accessor


def read_parameter_value(opm: OpticalModel, entry: MutableParameter) -> float:
    """Reads the referenced parameter's public value (radius, not curvature).

    Raises:
        ValueError: For an unknown kind or an incompatible asphere/decenter reference.
    """
    return _accessor_for(entry).read(opm, entry)


def write_parameter_value(opm: OpticalModel, entry: MutableParameter, value: float) -> None:
    """Writes the referenced parameter, materializing asphere or decenter data when absent.

    Raises:
        ValueError: For an unknown kind or an incompatible asphere/decenter reference.
    """
    _accessor_for(entry).write(opm, entry, value)


def snapshot_state(
    opm: OpticalModel,
    variable_configs: list[VariableConfig],
    pickup_configs: list[PickupConfig],
) -> dict[ParameterKey, SnapshotEntry]:
    """Capture the current values for all mutable optimizer parameters.

    Args:
        opm: RayOptics optical model.
        variable_configs: Normalized variable configurations.
        pickup_configs: Normalized pickup configurations.

    Returns:
        Snapshot entries keyed by mutable optimizer parameter.
    """
    state: dict[ParameterKey, SnapshotEntry] = {}
    for entry in [*variable_configs, *pickup_configs]:
        key = parameter_key(entry)
        if key not in state:
            state[key] = {"entry": entry, "value": read_parameter_value(opm, entry)}
    return state


def restore_state(opm: OpticalModel, snapshot: dict[ParameterKey, SnapshotEntry]) -> None:
    """Restore a previously captured optimizer state.

    Args:
        opm: RayOptics optical model.
        snapshot: Previously captured optimizer state.

    Returns:
        None.
    """
    for snapshot_entry in snapshot.values():
        write_parameter_value(opm, snapshot_entry["entry"], snapshot_entry["value"])
    opm.update_model()


def parameter_key(entry: MutableParameter) -> ParameterKey:
    """Identity of a parameter: kind and surface, plus the coefficient index of polynomial coefficients."""
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    if entry["kind"] == "asphere_polynomial_coefficient":
        return entry["kind"], surface_index, entry["coefficient_index"]
    return kind, surface_index


def entry_from_parameter_key(key: ParameterKey) -> ParameterIdentity:
    """Inverse of ``parameter_key`` for the fields a key encodes."""
    if key[0] == "asphere_polynomial_coefficient":
        return {"kind": key[0], "surface_index": key[1], "coefficient_index": cast("PolynomialParameterKey", key)[2]}
    return {"kind": key[0], "surface_index": key[1]}
