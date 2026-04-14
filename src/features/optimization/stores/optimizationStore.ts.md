# `features/optimization/stores/optimizationStore.ts`

## Purpose

Provider-backed Zustand slice for the optimization route. Owns all page state, including the page-local optical-model snapshot, algorithm inputs, field and wavelength weights, radius variable/pickup selections, operands, loading state, and modal state.

## Exports

- `RadiusMode` — persisted variable/pickup mode per optimization target row
- `RadiusModeDraft` — input payload used by `setRadiusMode` and `setThicknessMode`
- `OptimizationOperandRow` — editable operand row shape
- `OptimizationState` — full slice interface
- `createOptimizationSlice` — `StateCreator<OptimizationState>`

## Key State

- `optimizationModel` — page-local `OpticalModel` snapshot seeded from the editor
- `optimizer` — least-squares algorithm inputs stored as strings for direct form binding
- `fieldWeights` / `wavelengthWeights` — numeric optimization weights
- `radiusModes` — one entry per non-object radius target, including the image surface
- `thicknessModes` — one entry per surface-row thickness target
- `operands` — add/delete operand rows for `focal_length`, `f_number`, `opd_difference`, `rms_spot_size`, and `rms_wavefront_error`
- `isOptimizing` — loading flag for the page-blocking overlay
- `warningModal`, `applyConfirmOpen`, `radiusModal` — modal state
- `lastOptimizationReport` — last successful worker report

## Actions

- `initializeFromOpticalModel(model)` — seeds the page from the editor snapshot
- `syncFromOpticalModel(model)` — refreshes the page-local optical model from the live editor state while preserving compatible optimization-only state such as weights and variable/pickup selections
- `setFieldWeight(index, value)` / `setWavelengthWeight(index, value)` — update one weight
- `setRadiusMode(surfaceIndex, mode)` — switch a radius row between `constant`, `variable`, and `pickup`
- `setThicknessMode(surfaceIndex, mode)` — switch a thickness row between `constant`, `variable`, and `pickup`
- `openThicknessModal(surfaceIndex)` / `closeThicknessModal()` — control the thickness modal
- `addOperand()` / `deleteOperand(id)` / `updateOperand(id, patch)` / `replaceOperands(rows)` — manage operand rows
- `buildOptimizationConfig()` — validates current UI state and emits the Python `OptimizationConfig`
- `applyOptimizationResult(report)` — applies optimized radius/thickness values and pickups back into the page-local optical-model snapshot

## Validation Rules

- `max_nfev` must be a positive integer.
- `ftol`, `xtol`, and `gtol` must be positive non-zero numbers.
- Variable `min` and `max` must be numeric, and `min < max`.
- Pickup `source_surface_index` must be in range and must not equal the target surface index.
- At least one operand is required before `buildOptimizationConfig()` succeeds.

## Key Conventions

- `surfaceIndex` matches the sequential-model indexing used by Python: first lens surface is `1`; radius modes include the image surface (`surfaces.length + 1`), while thickness modes stop at the last surface row.
- Default operand row is `focal_length` with target `"100"`; switching the row to `opd_difference`, `rms_spot_size`, or `rms_wavefront_error` resets the target to `"0"`.
- `syncFromOpticalModel()` reconciles field weights, wavelength weights, radius modes, and thickness modes by index so editor changes propagate into optimization without resetting all optimization settings when the model shape still matches.
