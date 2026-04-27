# `features/optimization/lib/`

Shared helper utilities and reusable non-page renderers across optimization feature modules.

## Modules

- [BoundedVariableModeFields.tsx](./BoundedVariableModeFields/BoundedVariableModeFields.tsx.md) — shared Min/Max field group for optimization variable editors
- [UnboundedVariableModeFields.tsx](./UnboundedVariableModeFields/UnboundedVariableModeFields.tsx.md) — unbounded variable-mode body for methods without bounds
- [methodCapabilities.ts](./methodCapabilities.ts) — optimizer capability lookup derived from optimizer UI metadata
- [modalHelpers.ts](./modalHelpers.ts) — shared draft builders, mode options, keyed-remount serialization, and curvature-radius zero-crossing validation for optimization modals
- [operandMetadata.ts](./operandMetadata.ts) — runtime operand metadata and lookup helpers
- [optimizationViewModels.ts](./optimizationViewModels.ts.md) — shared row/view helpers for optimization components
- [optimizerUiConfig.ts](./optimizerUiConfig.ts) — runtime optimizer UI metadata, labels, defaults, and formatting helpers
- [variableModeFields.tsx](./variableModeFields.tsx) — variable-mode renderer selection helper

## Conventions

- Runtime constants and helper functions live here.
- Optimization-only type definitions live in `features/optimization/types/`.
