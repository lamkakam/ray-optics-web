# `features/optimization/types/`

Type-only modules for the optimization feature.

## Modules

- `optimizationWorkerTypes.ts` — JSON-safe optimization config, worker report, progress, residual, variable, and pickup boundary types shared by the UI and Pyodide worker.
- `optimizationAlgorithmTypes.ts` — optimizer capability and algorithm-selection types used by capability lookup helpers and callers.
- `optimizationUiTypes.ts` — optimizer UI metadata/config types used by `optimizerUiConfig.ts`.
- `optimizationOperandTypes.ts` — operand metadata and operand-options types used by operand metadata helpers and consumers.
- `optimizationModalTypes.ts` — common modal mode and source-surface option types.
- `optimizationVariableFieldTypes.ts` — shared variable-mode field props and renderer types.

## Conventions

- These modules must not export runtime values.
- Runtime constants and helper functions stay under `features/optimization/lib/`.
- Worker-boundary object shapes preserve Python snake_case keys because the Pyodide worker sends and receives JSON directly.
