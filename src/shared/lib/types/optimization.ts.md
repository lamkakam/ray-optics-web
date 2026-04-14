# `shared/lib/types/optimization.ts`

## Purpose

Shared TypeScript types for the optimization UI and the Pyodide worker boundary.

## Exports

- `OptimizerKind` — currently `"least_squares"`
- `LeastSquaresMethod` — currently `"trf"`
- `OptimizationOperandKind` — `"focal_length" | "f_number" | "opd" | "rms_spot_size" | "rms_wavefront_error"`
- `OptimizationConfig` — JSON-safe config sent to Python `optimize_opm`
- `OptimizationValueEntry` — one variable entry from `initial_values` / `final_values`
- `OptimizationPickupEntry` — one pickup entry from the worker report
- `OptimizationResidualEntry` — one residual entry from the worker report
- `OptimizationReport` — full worker response from `optimize_opm`
- `OptimizationRunResult` — convenience shape pairing `model` + `report`

## Key Conventions

- `OptimizationConfig` mirrors the config shape documented in `src/python/src/rayoptics_web_utils/optimization/optimization.py.md`.
- The current frontend emits radius variables and radius pickups only.
- `OptimizationReport` preserves the Python snake_case keys unchanged so the worker can parse the JSON directly.
