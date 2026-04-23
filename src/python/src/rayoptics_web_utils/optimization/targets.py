"""Mutable optimization target helpers for optical models."""

from __future__ import annotations

from rayoptics.environment import OpticalModel
from rayoptics.elem.profiles import EvenPolynomial, RadialPolynomial, XToroid, YToroid

from ._types import MutableTarget, PickupConfig, SnapshotEntry, TargetConfig, TargetKey, VariableConfig


def radius_to_curvature(radius: float) -> float:
    if radius == 0.0:
        return 0.0
    return 1.0 / radius


def curvature_to_radius(curvature: float) -> float:
    if curvature == 0.0:
        return 0.0
    return 1.0 / curvature


def snapshot_state(
    opm: OpticalModel,
    variable_configs: list[VariableConfig],
    pickup_configs: list[PickupConfig],
) -> dict[TargetKey, SnapshotEntry]:
    """Capture the current values for all mutable optimizer targets."""
    state: dict[TargetKey, SnapshotEntry] = {}
    for entry in [*variable_configs, *pickup_configs]:
        key = target_key(entry)
        if key not in state:
            state[key] = {"entry": entry, "value": read_target_value(opm, entry)}
    return state


def restore_state(opm: OpticalModel, snapshot: dict[TargetKey, SnapshotEntry]) -> None:
    """Restore a previously captured optimizer state."""
    for snapshot_entry in snapshot.values():
        write_target_value(opm, snapshot_entry["entry"], snapshot_entry["value"])
    opm.update_model()


def target_key(entry: MutableTarget) -> TargetKey:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    if kind == "asphere_polynomial_coefficient":
        return kind, surface_index, entry["coefficient_index"]
    return kind, surface_index


def entry_from_target_key(key: TargetKey) -> TargetConfig:
    if key[0] == "asphere_polynomial_coefficient":
        return {"kind": key[0], "surface_index": key[1], "coefficient_index": key[2]}
    return {"kind": key[0], "surface_index": key[1]}


def asphere_kinds():
    return {
        "Conic": EvenPolynomial,
        "EvenAspherical": EvenPolynomial,
        "RadialPolynomial": RadialPolynomial,
        "XToroid": XToroid,
        "YToroid": YToroid,
    }


def validate_surface_index(seq, index: int, label: str) -> None:
    if not isinstance(index, int) or index < 0 or index >= len(seq):
        raise IndexError(f"{label} {index} is out of range")


def surface_profile(opm: OpticalModel, surface_index: int):
    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, surface_index, "surface_index")
    return sm.ifcs[surface_index].profile


def supports_polynomials(profile) -> bool:
    return hasattr(profile, "coefs")


def is_toroid(profile) -> bool:
    return hasattr(profile, "cR")


def ensure_asphere_profile(opm: OpticalModel, entry: MutableTarget) -> None:
    kind = entry["kind"]
    asphere_kind = entry.get("asphere_kind")
    if kind not in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
        return
    if asphere_kind not in asphere_kinds():
        raise ValueError(f"Unknown asphere kind: {asphere_kind}")

    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    ifc = sm.ifcs[entry["surface_index"]]
    profile = ifc.profile

    profile_class = asphere_kinds()[asphere_kind]
    if isinstance(profile, profile_class):
        return

    if isinstance(profile, (EvenPolynomial, RadialPolynomial, XToroid, YToroid)):
        raise ValueError(f"Surface {entry['surface_index']} is already aspheric with a different type")

    radius = float(profile.r)
    if asphere_kind == "Conic":
        ifc.profile = EvenPolynomial(r=radius, cc=0.0)
    elif asphere_kind == "EvenAspherical":
        ifc.profile = EvenPolynomial(r=radius, cc=0.0, coefs=[])
    elif asphere_kind == "RadialPolynomial":
        ifc.profile = RadialPolynomial(r=radius, cc=0.0, coefs=[])
    elif asphere_kind == "XToroid":
        ifc.profile = XToroid(r=radius, cc=0.0, cR=radius, coefs=[])
    else:
        ifc.profile = YToroid(r=radius, cc=0.0, cR=radius, coefs=[])


def read_target_value(opm: OpticalModel, entry: MutableTarget) -> float:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        validate_surface_index(sm.ifcs, surface_index, "surface_index")
        return float(sm.ifcs[surface_index].profile.r)
    if kind == "thickness":
        validate_surface_index(sm.gaps, surface_index, "surface_index")
        return float(sm.gaps[surface_index].thi)
    ensure_asphere_profile(opm, entry)
    profile = surface_profile(opm, surface_index)
    if kind == "asphere_conic_constant":
        return float(profile.cc)
    if kind == "asphere_polynomial_coefficient":
        coefficients = list(getattr(profile, "coefs", []))
        coefficient_index = entry["coefficient_index"]
        return float(coefficients[coefficient_index] if coefficient_index < len(coefficients) else 0.0)
    if kind == "asphere_toric_sweep_radius":
        if not is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        return float(profile.cR)
    raise ValueError(f"Unknown variable kind: {kind}")


def write_target_value(opm: OpticalModel, entry: MutableTarget, value: float) -> None:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        validate_surface_index(sm.ifcs, surface_index, "surface_index")
        sm.ifcs[surface_index].profile.r = float(value)
        return
    if kind == "thickness":
        validate_surface_index(sm.gaps, surface_index, "surface_index")
        sm.gaps[surface_index].thi = float(value)
        return
    ensure_asphere_profile(opm, entry)
    profile = surface_profile(opm, surface_index)
    if kind == "asphere_conic_constant":
        profile.cc = float(value)
        return
    if kind == "asphere_polynomial_coefficient":
        coefficient_index = entry["coefficient_index"]
        coefficients = list(getattr(profile, "coefs", []))
        while len(coefficients) <= coefficient_index:
            coefficients.append(0.0)
        coefficients[coefficient_index] = float(value)
        profile.coefs = coefficients
        return
    if kind == "asphere_toric_sweep_radius":
        if not is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        profile.cR = float(value)
        return
    raise ValueError(f"Unknown variable kind: {kind}")
