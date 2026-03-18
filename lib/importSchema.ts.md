# `lib/importSchema.ts`

## Purpose

Compiles an AJV JSON Schema validator for `ImportedLensData` and exports it for use at import-time boundaries (e.g. when a user uploads a lens JSON file).

## Exports

```ts
export { validateImportedLensData };
// type: ValidateFunction<ImportedLensData> (AJV compiled validator)
```

`validateImportedLensData` is an AJV compiled validator function with the signature:

```ts
(data: unknown) => data is ImportedLensData
```

When validation fails, `validateImportedLensData.errors` is set to an array of AJV `ErrorObject`s.

## Behavior

- The validator enforces the full nested structure of `ImportedLensData`.

- **`additionalProperties: false`** is set on every schema object — any unknown key causes validation failure.

## Dependencies

- `ajv` — JSON Schema validator
- `lib/opticalModel.ts` — `ImportedLensData` (type-only, used as AJV generic parameter)

## Edge Cases / Error Handling

- Returns `false` and populates `.errors` for any structural mismatch, unknown property, or type error.
- `additionalProperties: false` means evolved schemas (extra fields added by newer app versions) will fail validation against old validators; schema versioning should be considered if the format changes.
- The AJV instance and compiled validator are module singletons — compilation happens once at import time, not per call.

## Usages

Called when a user imports a lens JSON file (e.g. in a file-upload handler) before passing the data to the Zustand store or Pyodide worker. Callers should check the return value and display `validateImportedLensData.errors` to the user on failure.
