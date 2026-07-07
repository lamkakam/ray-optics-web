# `features/import-custom-glass/ImportCustomGlassPage.tsx`

## Purpose
Route-level coordinator for managing user-defined tabulated glass in the client-only app.

## Responsibilities
- Reads the Pyodide worker proxy from `useAppShell`.
- Reads `catalogsData.Custom` from the Glass Map Zustand store and derives user-defined tabulated glasses with `getUserDefinedCustomGlasses`.
- Owns page-level selection, add/edit modal state, delete/overwrite/invalid/rejected/persistence-warning confirmation state, and queued import state.
- Leaves readonly table sort/filter state to `ImportCustomGlassStore`, provided from the app root.
- Derives sorted `CustomGlassRow` records for the readonly table.
- Composes `CustomGlassToolbar`, `CustomGlassTable`, `CustomGlassModal`, and shared confirmation `Modal` instances.

## Worker And Store Flow
- Add/edit modal submissions are converted with `toWorkerInput` and persisted through `saveCustomGlass`.
- Add/edit persistence writes to IndexedDB only after the corresponding worker mutation succeeds.
- Delete confirmation calls `deleteUserDefinedGlasses`, deletes matching IndexedDB rows, mirrors the deletion into the Glass Map store, clears selection, and closes the modal.
- JSON and CSV imports are split into update/add worker calls based on labels already present in `catalogsData.Custom`.
- JSON and CSV import update/add batches are written to IndexedDB only after their worker calls succeed.
- Successful imports call `upsertCustomGlasses({ ...updated, ...added })`.
- IndexedDB failures after successful worker mutations open `Custom Glass Persistence Warning`; they do not roll back the Pyodide runtime or Glass Map store.
- The page does not call `getAllGlassCatalogsData()`.

## Import Behavior
- JSON imports are parsed and validated by `validateImportedCustomGlassData`.
- Invalid JSON opens `Invalid Custom Glass JSON`.
- CSV imports parse every selected file with `parseCustomGlassCsv`.
- Valid CSV files are imported; rejected CSV files are reported in `Rejected Custom Glass CSV Files`.
- If all CSV files are rejected, no worker import APIs are called.
- Existing-label imports open `Overwrite Custom Glass` and wait for the `Overwrite` action before worker update/add calls.
- CSV rejection details survive overwrite confirmation and are shown after the overwrite import completes.

## UI Composition
- The toolbar keeps the visible commands `Import from JSON`, `Import from CSV Files`, `Add Glass`, `Edit Glass`, `Download JSON`, and `Delete Glass`.
- The readonly table intentionally has no page-level custom-glass filter input.
- The Add/Edit modal is rendered only while `modalMode` is set.
- Confirmation modals preserve the visible labels and titles used by the previous implementation.
- `Custom Glass Persistence Warning` is shown when the session state changed successfully but IndexedDB could not save/delete the persisted rows for future visits.

## Compatibility Exports
- Re-exports `EMPTY_CUSTOM_GLASSES`, `getUserDefinedCustomGlasses`, `isUserDefinedGlassAlreadyExistsError`, `parseCustomGlassCsv`, and `saveCustomGlass` from `lib/customGlassImport` so existing external imports keep working during the refactor.
