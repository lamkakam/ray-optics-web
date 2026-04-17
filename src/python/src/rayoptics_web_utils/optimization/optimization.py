"""Operand-based optimization helpers for rayoptics optical models."""

from __future__ import annotations

from collections import deque
from copy import deepcopy
import math

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.elem.profiles import EvenPolynomial, RadialPolynomial, XToroid, YToroid
from scipy.optimize import least_squares

from rayoptics_web_utils.analysis import get_opd_fan_data
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.zernike.zernike import _extract_exit_pupil_grid

_PENALTY_RESIDUAL = 1e6
_MERIT_LOG_EPSILON = 1e-300


def _radius_to_curvature(radius: float) -> float:
    if radius == 0.0:
        return 0.0
    return 1.0 / radius


def _curvature_to_radius(curvature: float) -> float:
    if curvature == 0.0:
        return 0.0
    return 1.0 / curvature


def _snapshot_state(opm, variable_configs: list[dict], pickup_configs: list[dict]) -> dict[tuple, float]:
    """Capture the current values for all mutable optimizer targets."""
    state: dict[tuple, float] = {}
    for entry in [*variable_configs, *pickup_configs]:
        key = _target_key(entry)
        if key not in state:
            state[key] = _read_target_value(opm, entry)
    return state


def _restore_state(opm, snapshot: dict[tuple, float]) -> None:
    """Restore a previously captured optimizer state."""
    for key, value in snapshot.items():
        _write_target_value(opm, _entry_from_target_key(key), value)
    opm.update_model()


def _target_key(entry: dict) -> tuple:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    if kind == "asphere_polynomial_coefficient":
        return kind, surface_index, entry["coefficient_index"]
    return kind, surface_index


def _entry_from_target_key(key: tuple) -> dict:
    if key[0] == "asphere_polynomial_coefficient":
        return {"kind": key[0], "surface_index": key[1], "coefficient_index": key[2]}
    return {"kind": key[0], "surface_index": key[1]}


def _asphere_kinds():
    return {
        "Conic": EvenPolynomial,
        "EvenAspherical": EvenPolynomial,
        "RadialPolynomial": RadialPolynomial,
        "XToroid": XToroid,
        "YToroid": YToroid,
    }


def _surface_profile(opm, surface_index: int):
    sm = opm["seq_model"]
    _validate_surface_index(sm.ifcs, surface_index, "surface_index")
    return sm.ifcs[surface_index].profile


def _surface_radius(opm, surface_index: int) -> float:
    return float(_surface_profile(opm, surface_index).r)


def _supports_polynomials(profile) -> bool:
    return hasattr(profile, "coefs")


def _is_toroid(profile) -> bool:
    return hasattr(profile, "cR")


def _ensure_asphere_profile(opm, entry: dict):
    kind = entry["kind"]
    asphere_kind = entry.get("asphere_kind")
    if kind not in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
        return
    if asphere_kind not in _asphere_kinds():
        raise ValueError(f"Unknown asphere kind: {asphere_kind}")

    sm = opm["seq_model"]
    _validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    ifc = sm.ifcs[entry["surface_index"]]
    profile = ifc.profile

    profile_class = _asphere_kinds()[asphere_kind]
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


def _read_target_value(opm, entry: dict) -> float:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        _validate_surface_index(sm.ifcs, surface_index, "surface_index")
        return float(sm.ifcs[surface_index].profile.r)
    if kind == "thickness":
        _validate_surface_index(sm.gaps, surface_index, "surface_index")
        return float(sm.gaps[surface_index].thi)
    _ensure_asphere_profile(opm, entry)
    profile = _surface_profile(opm, surface_index)
    if kind == "asphere_conic_constant":
        return float(profile.cc)
    if kind == "asphere_polynomial_coefficient":
        coefficients = list(getattr(profile, "coefs", []))
        coefficient_index = entry["coefficient_index"]
        return float(coefficients[coefficient_index] if coefficient_index < len(coefficients) else 0.0)
    if kind == "asphere_toric_sweep_radius":
        if not _is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        return float(profile.cR)
    raise ValueError(f"Unknown variable kind: {kind}")


def _write_target_value(opm, entry: dict, value: float) -> None:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        _validate_surface_index(sm.ifcs, surface_index, "surface_index")
        sm.ifcs[surface_index].profile.r = float(value)
        return
    if kind == "thickness":
        _validate_surface_index(sm.gaps, surface_index, "surface_index")
        sm.gaps[surface_index].thi = float(value)
        return
    _ensure_asphere_profile(opm, entry)
    profile = _surface_profile(opm, surface_index)
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
        if not _is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        profile.cR = float(value)
        return
    raise ValueError(f"Unknown variable kind: {kind}")


def _validate_surface_index(seq, index: int, label: str) -> None:
    if not isinstance(index, int) or index < 0 or index >= len(seq):
        raise IndexError(f"{label} {index} is out of range")


def _spot_fn(p, wi, ray_pkg, fld, wvl, foc):
    """Transverse aberration function for trace_grid."""
    if ray_pkg is not None:
        image_pt = fld.ref_sphere[0]
        ray = ray_pkg[mc.ray]
        dist = foc / ray[-1][mc.d][2]
        defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
        t_abr = defocused_pt - image_pt
        return np.array([t_abr[0], t_abr[1]])
    return None


def _compute_rms_spot_size(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return RMS spot size for one field/wavelength sample."""
    num_rays = int((options or {}).get("num_rays", 21))
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    _validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    grids, _ = opm["seq_model"].trace_grid(
        _spot_fn,
        field_index,
        wl=wavelengths[wavelength_index],
        num_rays=num_rays,
        form="list",
        append_if_none=False,
    )
    points = grids[0] if grids else []
    if len(points) == 0:
        return _PENALTY_RESIDUAL
    xs = np.array([point[0] for point in points], dtype=float)
    ys = np.array([point[1] for point in points], dtype=float)
    return float(np.sqrt(np.mean(xs ** 2 + ys ** 2)))


def _compute_rms_wavefront_error(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return RMS WFE in waves for one field/wavelength sample."""
    num_rays = int((options or {}).get("num_rays", 21))
    wavelengths = opm["optical_spec"]["wvls"].wavelengths
    _validate_surface_index(wavelengths, wavelength_index, "wavelength index")
    wavelength_nm = wavelengths[wavelength_index]
    ray_grid = make_ray_grid(opm, fi=field_index, wavelength_nm=wavelength_nm, num_rays=num_rays)
    grid = _extract_exit_pupil_grid(ray_grid, opm, wavelength_nm)
    valid = grid[2][~np.isnan(grid[2])]
    if len(valid) == 0:
        return _PENALTY_RESIDUAL
    return float(np.std(valid))


def _compute_opd_difference(opm, field_index: int, wavelength_index: int, options: dict | None) -> float:
    """Return mean absolute OPD deviation in waves for one field/wavelength sample."""
    del options
    fan_data = get_opd_fan_data(opm, fi=field_index)
    _validate_surface_index(fan_data, wavelength_index, "wavelength index")
    wavelength_fan = fan_data[wavelength_index]
    samples = np.array(
        [
            *wavelength_fan["Tangential"]["y"],
            *wavelength_fan["Sagittal"]["y"],
        ],
        dtype=float,
    )
    valid = samples[np.isfinite(samples)]
    if len(valid) == 0:
        return _PENALTY_RESIDUAL

    mean = float(np.mean(valid))
    return float(np.mean(np.abs(valid - mean)))


def _compute_focal_length(opm, field_index: int | None, wavelength_index: int | None, options: dict | None) -> float:
    """Return paraxial effective focal length."""
    del field_index, wavelength_index, options
    return float(opm["analysis_results"]["parax_data"].fod.efl)


def _compute_f_number(opm, field_index: int | None, wavelength_index: int | None, options: dict | None) -> float:
    """Return paraxial f-number."""
    del field_index, wavelength_index, options
    return float(opm["analysis_results"]["parax_data"].fod.fno)


_OPERAND_REGISTRY = {
    "rms_spot_size": _compute_rms_spot_size,
    "rms_wavefront_error": _compute_rms_wavefront_error,
    "opd_difference": _compute_opd_difference,
    "focal_length": _compute_focal_length,
    "f_number": _compute_f_number,
}


def _normalize_optimizer_config(config: dict) -> dict:
    optimizer = deepcopy(config.get("optimizer") or {})
    kind = optimizer.get("kind", "least_squares")
    if kind != "least_squares":
        raise ValueError(f"Unknown optimizer kind: {kind}")
    optimizer.setdefault("method", "trf")
    return optimizer


def _normalize_variables(opm, variables: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    seen_targets: set[tuple] = set()
    for entry in variables:
        kind = entry.get("kind")
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            raise ValueError(f"Unknown variable kind: {kind}")
        normalized_entry = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
        _validate_target_for_kind(opm, normalized_entry)
        key = _target_key(normalized_entry)
        if key in seen_targets:
            raise ValueError(f"Duplicate variable target: {key}")
        if "min" not in entry or "max" not in entry:
            raise ValueError("Variables must provide both min and max bounds")
        normalized_entry["min"] = float(entry["min"])
        normalized_entry["max"] = float(entry["max"])
        normalized.append(normalized_entry)
        seen_targets.add(key)
    return normalized


def _normalize_pickups(opm, pickups: list[dict], variable_targets: set[tuple]) -> list[dict]:
    normalized: list[dict] = []
    seen_targets: set[tuple] = set()
    for entry in pickups:
        kind = entry.get("kind")
        if kind not in {"radius", "thickness", "asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            raise ValueError(f"Unknown pickup kind: {kind}")
        normalized_entry = {
            "kind": kind,
            "surface_index": entry.get("surface_index"),
            "source_surface_index": entry.get("source_surface_index"),
        }
        if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
            normalized_entry["asphere_kind"] = entry.get("asphere_kind")
        if kind == "asphere_polynomial_coefficient":
            normalized_entry["coefficient_index"] = entry.get("coefficient_index")
            normalized_entry["source_coefficient_index"] = entry.get("source_coefficient_index")
        _validate_target_for_kind(opm, normalized_entry)
        _validate_target_for_kind(
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
        key = _target_key(normalized_entry)
        if key in variable_targets:
            raise ValueError(f"Target {key} cannot be both variable and pickup target")
        if key in seen_targets:
            raise ValueError(f"Duplicate pickup target: {key}")
        normalized_entry["scale"] = float(entry.get("scale", 1.0))
        normalized_entry["offset"] = float(entry.get("offset", 0.0))
        normalized.append(normalized_entry)
        seen_targets.add(key)
    _validate_pickup_graph(normalized)
    return normalized


def _validate_target_for_kind(opm, entry: dict, label: str = "surface_index") -> None:
    kind = entry["kind"]
    surface_index = entry["surface_index"]
    sm = opm["seq_model"]
    if kind == "radius":
        _validate_surface_index(sm.ifcs, surface_index, label)
        return
    if kind == "thickness":
        _validate_surface_index(sm.gaps, surface_index, label)
        return
    if kind in {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}:
        _validate_surface_index(sm.ifcs, surface_index, label)
        _ensure_asphere_profile(opm, entry)
        profile = _surface_profile(opm, surface_index)
        if kind == "asphere_polynomial_coefficient":
            coefficient_index = entry.get("coefficient_index")
            if not isinstance(coefficient_index, int) or coefficient_index < 0 or coefficient_index > 9:
                raise IndexError(f"coefficient_index {coefficient_index} is out of range")
            if not _supports_polynomials(profile):
                raise ValueError("Polynomial coefficient target requires a coefficient-bearing asphere")
        if kind == "asphere_toric_sweep_radius" and not _is_toroid(profile):
            raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
        return
    raise ValueError(f"Unknown variable kind: {kind}")


def _validate_pickup_graph(pickups: list[dict]) -> None:
    graph: dict[tuple, set[tuple]] = {}
    indegree: dict[tuple, int] = {}
    for pickup in pickups:
        target = _target_key(pickup)
        source = _target_key(
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


def _pickup_order(pickups: list[dict]) -> list[dict]:
    """Return pickups in dependency order after cycle validation."""
    by_target = {_target_key(p): p for p in pickups}
    graph: dict[tuple, set[tuple]] = {}
    indegree: dict[tuple, int] = {}
    for target, pickup in by_target.items():
        source = _target_key(
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
    ordered_targets: list[tuple[str, int]] = []
    while queue:
        node = queue.popleft()
        if node in by_target:
            ordered_targets.append(node)
        for neighbor in graph.get(node, set()):
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    return [by_target[target] for target in ordered_targets]


def _normalize_operand_samples(opm, operand: dict) -> list[dict]:
    kind = operand.get("kind")
    if kind not in _OPERAND_REGISTRY:
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

    normalized: list[dict] = []
    for field in fields:
        field_index = field.get("index")
        _validate_surface_index(opm["optical_spec"]["fov"].fields, field_index, "field index")
        field_weight = float(field.get("weight", 1.0))
        for wavelength in wavelengths:
            wavelength_index = wavelength.get("index")
            _validate_surface_index(opm["optical_spec"]["wvls"].wavelengths, wavelength_index, "wavelength index")
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


def _normalize_merit_function(opm, merit_function: dict) -> dict:
    operands = merit_function.get("operands") or []
    if len(operands) == 0:
        raise ValueError("merit_function.operands must not be empty")
    normalized_operands: list[dict] = []
    for operand in operands:
        normalized_operands.extend(_normalize_operand_samples(opm, operand))
    return {"operands": normalized_operands}


def _normalize_config(opm, config: dict) -> dict:
    optimizer = _normalize_optimizer_config(config)
    variables = _normalize_variables(opm, deepcopy(config.get("variables") or []))
    variable_targets = {_target_key(variable) for variable in variables}
    pickups = _normalize_pickups(opm, deepcopy(config.get("pickups") or []), variable_targets)
    merit_function = _normalize_merit_function(opm, deepcopy(config.get("merit_function") or {}))
    return {
        "optimizer": optimizer,
        "variables": variables,
        "pickups": pickups,
        "merit_function": merit_function,
    }


class _OptimizationProblem:
    """Validated optimization problem bound to an optical model."""

    def __init__(self, opm, config: dict):
        self.opm = opm
        self.config = _normalize_config(opm, config)
        self.variables = self.config["variables"]
        self.pickups = self.config["pickups"]
        self.ordered_pickups = _pickup_order(self.pickups)
        self.optimizer = self.config["optimizer"]
        self.operands = self.config["merit_function"]["operands"]
        self.optimization_progress: list[dict] = []
        self._last_progress_vector: np.ndarray | None = None
        self._progress_reporter = None

    def current_vector(self) -> np.ndarray:
        return np.array(
            [self._to_internal_value(variable, _read_target_value(self.opm, variable)) for variable in self.variables],
            dtype=float,
        )

    def bounds(self) -> tuple[np.ndarray, np.ndarray]:
        if len(self.variables) == 0:
            return np.array([], dtype=float), np.array([], dtype=float)
        lower = np.array([self._internal_lower_bound(variable) for variable in self.variables], dtype=float)
        upper = np.array([self._internal_upper_bound(variable) for variable in self.variables], dtype=float)
        return lower, upper

    def apply_vector(self, values: np.ndarray | list[float]) -> list[dict]:
        for value, variable in zip(values, self.variables):
            _write_target_value(self.opm, variable, self._from_internal_value(variable, float(value)))
        pickup_reports: list[dict] = []
        for pickup in self.ordered_pickups:
            source_target = {
                "kind": pickup["kind"],
                "surface_index": pickup["source_surface_index"],
                **(
                    {"asphere_kind": pickup["asphere_kind"]}
                    if "asphere_kind" in pickup
                    else {}
                ),
                **(
                    {"coefficient_index": pickup["source_coefficient_index"]}
                    if pickup["kind"] == "asphere_polynomial_coefficient"
                    else {}
                ),
            }
            source_value = _read_target_value(self.opm, source_target)
            value = pickup["scale"] * source_value + pickup["offset"]
            _write_target_value(self.opm, pickup, value)
            pickup_reports.append({**pickup, "value": float(value)})
        self.opm.update_model()
        return pickup_reports

    def evaluate(self, values: np.ndarray | list[float] | None = None) -> dict:
        if values is None:
            values = self.current_vector()
        pickups = self.apply_vector(values)
        residuals: list[dict] = []
        weighted_values: list[float] = []
        for operand in self.operands:
            evaluator = _OPERAND_REGISTRY[operand["kind"]]
            actual = float(
                evaluator(
                    self.opm,
                    operand["field_index"],
                    operand["wavelength_index"],
                    operand["options"],
                )
            )
            total_weight = operand["weight"] * math.sqrt(operand["field_weight"]) * math.sqrt(operand["wavelength_weight"])
            weighted_residual = total_weight * (actual - operand["target"])
            residuals.append(
                {
                    "kind": operand["kind"],
                    "target": operand["target"],
                    "value": actual,
                    "field_index": operand["field_index"],
                    "wavelength_index": operand["wavelength_index"],
                    "operand_weight": operand["weight"],
                    "field_weight": operand["field_weight"],
                    "wavelength_weight": operand["wavelength_weight"],
                    "total_weight": float(total_weight),
                    "weighted_residual": float(weighted_residual),
                }
            )
            weighted_values.append(float(weighted_residual))

        sum_of_squares = float(sum(value ** 2 for value in weighted_values))
        rss = float(math.sqrt(sum_of_squares))
        return {
            "optimizer": {"kind": self.optimizer["kind"], "method": self.optimizer["method"]},
            "initial_values": self._variable_state(),
            "final_values": self._variable_state(),
            "pickups": pickups,
            "residuals": residuals,
            "merit_function": {
                "sum_of_squares": sum_of_squares,
                "rss": rss,
            },
            "optimization_progress": list(self.optimization_progress),
        }

    def penalty_residual_vector(self) -> np.ndarray:
        size = max(len(self.operands), 1)
        return np.full(size, _PENALTY_RESIDUAL, dtype=float)

    def _record_progress(self, vector: np.ndarray, evaluation: dict) -> bool:
        candidate = np.array(vector, dtype=float, copy=True)
        if self._last_progress_vector is not None and np.allclose(candidate, self._last_progress_vector, rtol=0.0, atol=1e-12):
            return False
        if "merit_function" not in evaluation:
            return False

        merit_function_value = float(evaluation["merit_function"]["sum_of_squares"])
        progress_entry = {
            "iteration": len(self.optimization_progress),
            "merit_function_value": merit_function_value,
            "log10_merit_function_value": float(math.log10(max(merit_function_value, _MERIT_LOG_EPSILON))),
        }
        self.optimization_progress.append(progress_entry)
        self._last_progress_vector = candidate
        if self._progress_reporter is not None:
            self._progress_reporter(list(self.optimization_progress))
        return True

    def objective(self, vector: np.ndarray) -> np.ndarray:
        try:
            evaluation = self.evaluate(vector)
        except Exception:
            return self.penalty_residual_vector()
        self._record_progress(vector, evaluation)
        return np.array([entry["weighted_residual"] for entry in evaluation["residuals"]], dtype=float)

    def optimize(self, progress_reporter=None):
        x0 = self.current_vector()
        lower, upper = self.bounds()
        self._progress_reporter = progress_reporter
        try:
            return least_squares(
                self.objective,
                x0,
                bounds=(lower, upper),
                method=self.optimizer["method"],
                ftol=self.optimizer.get("ftol", 1e-8),
                xtol=self.optimizer.get("xtol", 1e-8),
                gtol=self.optimizer.get("gtol", 1e-8),
                max_nfev=self.optimizer.get("max_nfev", 200),
            )
        finally:
            self._progress_reporter = None

    def _variable_state(self) -> list[dict]:
        return [
            {
                "kind": variable["kind"],
                "surface_index": variable["surface_index"],
                **({"asphere_kind": variable["asphere_kind"]} if "asphere_kind" in variable else {}),
                **({"coefficient_index": variable["coefficient_index"]} if "coefficient_index" in variable else {}),
                "value": float(_read_target_value(self.opm, variable)),
                "min": variable["min"],
                "max": variable["max"],
            }
            for variable in self.variables
        ]

    def _to_internal_value(self, variable: dict, value: float) -> float:
        if variable["kind"] == "radius":
            return _radius_to_curvature(value)
        return value

    def _from_internal_value(self, variable: dict, value: float) -> float:
        if variable["kind"] == "radius":
            return _curvature_to_radius(value)
        return value

    def _internal_lower_bound(self, variable: dict) -> float:
        return min(self._internal_bound_candidates(variable))

    def _internal_upper_bound(self, variable: dict) -> float:
        return max(self._internal_bound_candidates(variable))

    def _internal_bound_candidates(self, variable: dict) -> list[float]:
        if variable["kind"] != "radius":
            return [float(variable["min"]), float(variable["max"])]

        candidates = [_radius_to_curvature(float(variable["min"])), _radius_to_curvature(float(variable["max"]))]
        if float(variable["min"]) <= 0.0 <= float(variable["max"]):
            candidates.append(0.0)
        return candidates


def evaluate_optimization_problem(opm, config: dict) -> dict:
    """Evaluate a dict-driven optimization problem without running SciPy."""
    problem = _OptimizationProblem(opm, config)
    snapshot = _snapshot_state(opm, problem.variables, problem.pickups)
    initial_values = problem._variable_state()
    try:
        report = problem.evaluate()
    except Exception:
        _restore_state(opm, snapshot)
        raise
    report["success"] = True
    report["status"] = "evaluated"
    report["message"] = "Optimization problem evaluated"
    report["initial_values"] = initial_values
    report["optimization_progress"] = []
    return report


def optimize_opm(opm, config: dict, progress_reporter=None) -> dict:
    """Optimize a rayoptics optical model using a dict-driven config."""
    problem = _OptimizationProblem(opm, config)
    snapshot = _snapshot_state(opm, problem.variables, problem.pickups)
    initial_values = problem._variable_state()

    if len(problem.variables) == 0:
        report = problem.evaluate()
        problem._record_progress(problem.current_vector(), report)
        report["success"] = True
        report["status"] = "no_variables"
        report["message"] = "No optimization variables supplied"
        report["initial_values"] = initial_values
        report["optimization_progress"] = list(problem.optimization_progress)
        report["optimizer"].update({"nfev": 0, "njev": 0})
        if progress_reporter is not None:
            progress_reporter(list(problem.optimization_progress))
        return report

    try:
        result = problem.optimize(progress_reporter)
        report = problem.evaluate(result.x)
    except Exception:
        _restore_state(opm, snapshot)
        raise

    report["success"] = bool(result.success)
    report["status"] = int(result.status)
    report["message"] = result.message
    report["initial_values"] = initial_values
    report["optimizer"].update(
        {
            "nfev": int(result.nfev),
            "njev": int(result.njev) if result.njev is not None else 0,
            "cost": float(result.cost),
            "optimality": float(result.optimality),
        }
    )
    report["optimization_progress"] = list(problem.optimization_progress)
    return report
