# `features/optimization/lib/`

Pure helper utilities shared across optimization feature modules.

## Modules

- [methodCapabilities.ts](./methodCapabilities.ts) — optimizer capability lookup derived from optimizer UI metadata
- [modalHelpers.ts](./modalHelpers.ts) — shared draft builders, mode options, keyed-remount serialization, and curvature-radius zero-crossing validation for optimization modals
- [operandMetadata.ts](./operandMetadata.ts) — runtime operand metadata and lookup helpers
- [optimizerUiConfig.ts](./optimizerUiConfig.ts) — runtime optimizer UI metadata, labels, defaults, and formatting helpers
- [variableModeFields.tsx](./variableModeFields.tsx) — variable-mode renderer selection helper

## Conventions

- Runtime constants and helper functions live here.
- Optimization-only type definitions live in `features/optimization/type/`.
