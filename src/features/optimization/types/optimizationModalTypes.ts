/**
# `features/optimization/types/optimizationModalTypes.ts`

## Purpose

Shared type definitions for optimization variable/pickup modal helpers and fields.

## Key Conventions

- Runtime option arrays and source-surface option builders stay in `features/optimization/lib/modalHelpers.ts`.
- `ModalModeChoice` matches the values in `MODAL_MODE_OPTIONS`.*/
export type ModalModeChoice = "constant" | "variable" | "pickup";

export type SourceSurfaceSelectOption = {
  readonly value: number;
  readonly label: string;
};
