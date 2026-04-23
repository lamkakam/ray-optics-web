# `features/optimization/stores/optimizationStore.ts`

## Purpose

Provider-backed Zustand slice for the optimization route. Owns all page state, including the page-local optical-model snapshot, algorithm inputs, field and wavelength weights, radius variable/pickup selections, operands, loading state, and modal state.

## Exports

- `RadiusMode` — persisted variable/pickup mode per optimization target row
- `RadiusModeDraft` — input payload used by `setRadiusMode` and `setThicknessMode`
- `AsphereTermKey`, `AsphereMode`, `AsphereTermModeDraft`, `AsphereOptimizationState` — optimization-only asphere type + per-term mode state for each real surface
- `OptimizationOperandRow` — editable operand row shape
- `OptimizationState` — full slice interface
- `hasNonZeroOptimizationContribution(config)` — pure helper that checks whether any built merit-function operand contributes a non-zero effective weight
- `createOptimizationSlice` — `StateCreator<OptimizationState>`

## Key State

- `optimizationModel` — page-local `OpticalModel` snapshot seeded from the editor
- `optimizer` — least-squares algorithm inputs stored as strings for direct form binding; default tolerances are `1e-5`
- `fieldWeights` / `wavelengthWeights` — numeric optimization weights
- `radiusModes` — one entry per non-object radius target, including the image surface
- `thicknessModes` — one entry per surface-row thickness target
- `asphereStates` — one entry per real surface, carrying the optimization asphere type plus independent constant/variable/pickup settings for conic constant, 10 coefficient slots, and toroid sweep radius
- `operands` — add/delete operand rows for `focal_length`, `f_number`, `opd_difference`, `rms_spot_size`, `rms_wavefront_error`, and `ray_fan`; targeted operands keep editable string `target` values while target-less operands store `target: undefined`
- `isOptimizing` — loading flag for the page-blocking overlay
- `warningModal`, `applyConfirmOpen`, `radiusModal`, `thicknessModal`, `asphereModal` — modal state
- `lastOptimizationReport` — last successful worker report

## Actions

- `initializeFromOpticalModel(model)` — seeds the page from the editor snapshot
- `syncFromOpticalModel(model)` — refreshes the page-local optical model from the live editor state while preserving compatible optimization-only state such as weights and variable/pickup selections
- `setFieldWeight(index, value)` / `setWavelengthWeight(index, value)` — update one weight
- `setRadiusMode(surfaceIndex, mode)` — switch a radius row between `constant`, `variable`, and `pickup`
- `setThicknessMode(surfaceIndex, mode)` — switch a thickness row between `constant`, `variable`, and `pickup`
- `setAsphereType(surfaceIndex, type)` — set the optimization-only asphere type for a spherical editor surface; existing editor asphere kinds stay locked
- `replaceAsphereState(surfaceIndex, state)` — replace one surface’s full optimization asphere state after the modal commits
- `setAsphereTermMode(surfaceIndex, term, mode)` — mutate one asphere target directly
- `openThicknessModal(surfaceIndex)` / `closeThicknessModal()` — control the thickness modal
- `openAsphereModal(surfaceIndex)` / `closeAsphereModal()` — control the asphere variable/pickup modal
- `addOperand()` / `deleteOperand(id)` / `updateOperand(id, patch)` / `replaceOperands(rows)` — manage operand rows
- `buildOptimizationConfig()` — validates current UI state and emits the Python `OptimizationConfig`, including method-aware bounded or unbounded variable entries
- `applyOptimizationResult(report)` — applies optimized radius/thickness values and pickups back into the page-local optical-model snapshot

## Internal Structure

- `buildOptimizationConfig()` is a thin coordinator that delegates optimizer parsing, surface variable/pickup extraction, asphere variable/pickup extraction, and merit-function operand assembly to file-local pure helpers in `optimizationStore.ts`.
- Shared validation for bounded variable ranges stays centralized so radius, thickness, and asphere variable entries continue to use the same `min < max` rule and error text when the active method requires bounds.
- Surface pickup source-index validation stays centralized so radius and thickness pickups continue to share the same same-surface and out-of-range checks.

## Validation Rules

- `max_nfev` must be a positive integer.
- `ftol`, `xtol`, and `gtol` must be positive non-zero numbers.
- Operand `weight` must be a positive non-zero number.
- For bounded least-squares methods such as `trf`, variable `min` and `max` must be numeric, and `min < max`.
- For least-squares `lm`, the built config must provide at least as many residual samples as optimization variables; otherwise `buildOptimizationConfig()` throws before the page tries to evaluate or optimize.
- Pickup `source_surface_index` must be in range and must not equal the target surface index.
- Asphere coefficient pickups require a coefficient `sourceTermKey`.
- Asphere coefficient pickup `source_coefficient_index` must be a non-negative integer so zero-based coefficient slot `0` is allowed.
- At least one operand is required before `buildOptimizationConfig()` succeeds.
- `hasNonZeroOptimizationContribution(...)` treats missing `fields` or `wavelengths` as a neutral factor of `1`, and otherwise checks all operand/field/wavelength weight combinations for any product greater than `0`.

## Key Conventions

- `surfaceIndex` matches the sequential-model indexing used by Python: first lens surface is `1`; radius modes include the image surface (`surfaces.length + 1`), while thickness modes stop at the last surface row.
- `initializeFromOpticalModel()` seeds field weights as `1` for field index `0` and `0` for every remaining field.
- `initializeFromOpticalModel()` seeds wavelength weights from `model.specs.wavelengths.weights[*][1]`, matching the editor-page wavelength weights.
- The store starts with no operand rows. `addOperand()` appends the default `focal_length` row with target `"100"` and weight `"1"`; switching that row to `opd_difference`, `rms_spot_size`, or `rms_wavefront_error` resets the target to `"0"` without changing the weight.
- `syncFromOpticalModel()` reconciles field weights, wavelength weights, radius modes, thickness modes, and `asphereStates` by index so editor changes propagate into optimization without resetting all optimization settings when the model shape still matches.
- `buildOptimizationConfig()` appends asphere variables and pickups alongside radius/thickness entries, using `asphere_kind` plus zero-based `coefficient_index` / `source_coefficient_index` metadata for the Python optimizer.
- `buildOptimizationConfig()` emits `min` / `max` for bounded `trf`, and omits `min` / `max` for unbounded `lm` while preserving hidden bound strings in local Zustand state so switching methods does not discard prior inputs.
- Operand metadata is shared through `features/optimization/lib/operandMetadata.ts`, which defines the user label, default target behavior, field/wavelength expansion, and nominal least-squares residual multiplicity for each operand kind.
- `buildOptimizationConfig()` omits `target` for target-less operands such as `ray_fan`.
- `buildOptimizationConfig()` also enforces the SciPy `lm` dimension rule using the nominal expanded merit-function sample count. `ray_fan` contributes `42` residuals per selected field/wavelength pair because the current ray-fan analysis helper traces `21` tangential plus `21` sagittal samples.
- `applyOptimizationResult()` can create or update `surface.aspherical` on the optimization-local optical model when optimized asphere results come back from Python.
- The non-zero contribution helper is intentionally shape-based and does not branch on specific operand kind names, so future operands inherit the check automatically if they use the same config contract.
