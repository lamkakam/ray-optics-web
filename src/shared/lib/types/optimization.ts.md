# `shared/lib/types/optimization.ts`

## Purpose

Shared TypeScript types for the optimization UI and the Pyodide worker boundary.

## Exports

- `OptimizerKind` — currently `"least_squares"`
- `LeastSquaresMethod` — currently `"trf"`
- `OptimizationOperandKind` — `"focal_length" | "f_number" | "opd_difference" | "rms_spot_size" | "rms_wavefront_error"`
- `OptimizationConfig` — JSON-safe config sent to Python `optimize_opm`
- `OptimizationVariableConfig` — one variable entry in `OptimizationConfig.variables`
- `OptimizationPickupConfig` — one pickup entry in `OptimizationConfig.pickups`
- `OptimizationValueEntry` — one variable entry from `initial_values` / `final_values`
- `OptimizationPickupEntry` — one pickup entry from the worker report
- `OptimizationResidualEntry` — one residual entry from the worker report
- `OptimizationProgressEntry` — one streamed optimization-progress sample
- `OptimizationReport` — full worker response from `optimize_opm`
- `OptimizationRunResult` — convenience shape pairing `model` + `report`

## Key Conventions

- `OptimizationConfig` mirrors the config shape documented in `src/python/src/rayoptics_web_utils/optimization/optimization.py.md`.
- `variables` and `pickups` are discriminated unions. Supported kinds are `radius`, `thickness`, `asphere_conic_constant`, `asphere_polynomial_coefficient`, and `asphere_toric_sweep_radius`.
- Asphere config/report entries carry `asphere_kind`; polynomial coefficient entries additionally carry `coefficient_index`, and coefficient pickups also carry `source_coefficient_index`.
- `OptimizationReport` preserves the Python snake_case keys unchanged so the worker can parse the JSON directly.
- `OptimizationReport.optimizer` may include solver metadata such as `nfev`, `njev`, `cost`, and `optimality` after a full optimization run.
- `OptimizationReport.optimization_progress` is always a chronological list of merit-history samples; each entry exposes the raw `merit_function_value` used by the progress chart plus the precomputed `log10_merit_function_value` for consumers that need a transformed value.
