# `features/import-custom-glass/types/customGlassImport.ts`

## Purpose
Feature-local TypeScript contracts for custom glass import, export, editing, and page state.

## Exports
- `CustomGlassPayload` describes the persisted JSON format `{ version: "1.0", Custom: { LABEL: { type: "tabulated", data } } }`.
- `EditablePair` is the modal grid row shape for tabulated wavelength/index editing.
- `CustomGlassRow` is the readonly table row shape derived from `UserDefinedGlassData`.
- `ModalMode` and `ConfirmationMode` enumerate page-level modal states, including the IndexedDB persistence warning modal.
- `UserDefinedCustomCatalog`, `ImportedCustomGlassMaterial`, and `RejectedCsvFile` model custom catalog maps and import results.
- `CustomGlassStoreActions` and `SaveCustomGlassOptions` keep worker orchestration loosely coupled from the Glass Map Zustand store and optional IndexedDB persistence callbacks.
