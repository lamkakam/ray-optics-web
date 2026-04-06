# `shared/lib/schemas/importSchema.ts`

## Purpose

Compiles an AJV JSON Schema validator for `OpticalModel` and exports it for use at import-time boundaries (e.g. when a user uploads a lens JSON file).

## Exports

```ts
export { validateImportedLensData };
// type: ValidateFunction<OpticalModel> (AJV compiled validator)
```

`validateImportedLensData` is an AJV compiled validator function with the signature:

```ts
(data: unknown) => data is OpticalModel
```

When validation fails, `validateImportedLensData.errors` is set to an array of AJV `ErrorObject`s.

## Behavior

- The validator enforces the full nested structure of `OpticalModel`.
- `specs.field.isWideAngle` is accepted as an optional boolean to support wide-angle ray-aiming mode while preserving compatibility with older imported files.
- Surface `aspherical` data must use the discriminated union shape with `kind`.

- **`additionalProperties: false`** is set on every schema object — any unknown key causes validation failure.

## Dependencies

- `ajv` — JSON Schema validator
- `shared/lib/types/opticalModel.ts` — `OpticalModel` (type-only, used as AJV generic parameter)

## Edge Cases / Error Handling

- Returns `false` and populates `.errors` for any structural mismatch, unknown property, or type error.
- `specs.field.isWideAngle` may be omitted, but if present it must be a boolean.
- Legacy aspherical payloads without `kind` are rejected.
- `additionalProperties: false` means evolved schemas (extra fields added by newer app versions) will fail validation against old validators; schema versioning should be considered if the format changes.
- The AJV instance and compiled validator are module singletons — compilation happens once at import time, not per call.

## Usages

```tsx
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";

function handleFileUpload(jsonData: unknown) {
  // Validate before using
  if (!validateImportedLensData(jsonData)) {
    // Show validation errors to user
    const errors = validateImportedLensData.errors;
    console.error("Invalid model:", errors);
    alert(`Import failed: ${errors?.map(e => e.message).join(", ")}`);
    return;
  }

  // jsonData is now type-checked as OpticalModel
  lensEditorStore.getState().setRows(surfacesToGridRows(jsonData));
  specsStore.getState().loadFromSpecs(jsonData.specs);
}

// Example: File input handler
async function handleImport(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  handleFileUpload(data);
}
```

Called when a user imports a lens JSON file before passing to Zustand store or Pyodide worker. Check return value and display `.errors` on failure.
