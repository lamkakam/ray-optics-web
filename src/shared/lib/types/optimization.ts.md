# `shared/lib/types/optimization.ts`

## Purpose

Shared TypeScript types for the optimization UI and the Pyodide worker boundary.

## Exports

- `OptimizerKind` — `"least_squares" | "differential_evolution"`
- `LeastSquaresMethod` — `"trf" | "lm"`
- `OptimizationOperandKind` — `"focal_length" | "f_number" | "opd_difference" | "rms_spot_size" | "rms_wavefront_error" | "ray_fan"`
- `OptimizationOperandConfig` — one merit-function operand config, supporting both targeted scalar operands and target-less operands such as `ray_fan`
- `OptimizationConfig` — JSON-safe config sent to Python `optimize_opm`, with optimizer-specific config keys
- `OptimizationVariableConfig` — one variable entry in `OptimizationConfig.variables`, with optional `min` / `max` so least-squares configs can represent both bounded and unbounded variables
- `OptimizationPickupConfig` — one pickup entry in `OptimizationConfig.pickups`
- `OptimizationValueEntry` — one variable entry from `initial_values` / `final_values`
- `OptimizationPickupEntry` — one pickup entry from the worker report
- `OptimizationResidualEntry` — one residual entry from the worker report
- `OptimizationProgressEntry` — one streamed optimization-progress sample
- `OptimizationReport` — full worker response from `optimize_opm`
- `OptimizationRunResult` — convenience shape pairing `model` + `report`

## Key Conventions

- `OptimizationConfig` mirrors the config shape documented in `src/python/src/rayoptics_web_utils/optimization/optimization.py.md`.
- `OptimizationConfig.optimizer` is a discriminated union:
  least-squares configs include `kind: "least_squares"`, `method`, `max_nfev`, `ftol`, `xtol`, and `gtol`;
  differential-evolution configs include `kind: "differential_evolution"`, `max_nfev`, `tol`, and `atol`.
- `variables` and `pickups` are discriminated unions. Supported kinds are `radius`, `thickness`, `asphere_conic_constant`, `asphere_polynomial_coefficient`, and `asphere_toric_sweep_radius`.
- `OptimizationConfig.variables[*].min` / `max` are present for bounded optimizer runs (`trf` and `differential_evolution`) and may be omitted for unbounded least-squares runs (`lm`).
- Asphere config/report entries carry `asphere_kind`; polynomial coefficient entries additionally carry `coefficient_index`, and coefficient pickups also carry `source_coefficient_index`.
- Merit operands and residual entries may omit `target` for target-less operands. Existing scalar operands still include numeric targets.
- `OptimizationReport` preserves the Python snake_case keys unchanged so the worker can parse the JSON directly.
- `OptimizationReport.optimizer` may include solver metadata such as `nfev`, `nit`, `njev`, `cost`, and `optimality` after a full optimization run.
- `OptimizationReport.optimization_progress` is always a chronological list of merit-history samples; each entry exposes the raw `merit_function_value` used by the progress chart plus the precomputed `log10_merit_function_value` for consumers that need a transformed value.
