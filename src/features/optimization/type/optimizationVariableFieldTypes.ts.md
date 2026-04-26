# `features/optimization/type/optimizationVariableFieldTypes.ts`

## Purpose

Shared variable-mode field prop and renderer types used by the variable field renderer helper.

## Exports

- `VariableModeFieldsProps` — props accepted by bounded variable field renderers
- `VariableModeFieldsRenderer` — renderer wrapper returned by `getVariableModeFieldsRenderer(canUseBounds)`

## Key Conventions

- The renderer component returns `React.JSX.Element`.
- Runtime renderer selection stays in `features/optimization/lib/variableModeFields.tsx`.
