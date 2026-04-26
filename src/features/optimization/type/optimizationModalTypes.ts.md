# `features/optimization/type/optimizationModalTypes.ts`

## Purpose

Shared type definitions for optimization variable/pickup modal helpers and fields.

## Exports

- `ModalModeChoice` — allowed modal mode values: `constant`, `variable`, and `pickup`
- `SourceSurfaceSelectOption` — value/label option shape for pickup source-surface selects

## Key Conventions

- Runtime option arrays and source-surface option builders stay in `features/optimization/lib/modalHelpers.ts`.
- `ModalModeChoice` matches the values in `MODAL_MODE_OPTIONS`.
