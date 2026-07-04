# `features/import-custom-glass/ImportCustomGlassPage.tsx`

## Purpose
Client page for managing user-defined tabulated glass stored in the Pyodide worker.

## Data Flow
- Reads displayed rows from `glassMapStore.catalogsData.Custom`.
- The Zustand selector subscribes to the raw `Custom` catalog reference only; `getUserDefinedCustomGlasses` derives the user-defined map outside the selector to avoid allocating a new snapshot on every render.
- Mutates worker state through existing `addUserDefinedGlasses`, `updateUserDefinedGlasses`, and `deleteUserDefinedGlasses`.
- Mirrors successful worker mutations into the Glass Map store through `upsertCustomGlasses` and `deleteCustomGlasses`.
- Does not call `getAllGlassCatalogsData()`.
- If `addUserDefinedGlasses` reports that the label already exists in the worker, the page calls `getUserDefinedGlasses([label])` to sync that worker material into `catalogsData.Custom` instead of surfacing a runtime error overlay.
- Edit mode with an unchanged label calls `updateUserDefinedGlasses` and then `upsertCustomGlasses`.
- Edit mode with a changed label adds the new worker material, deletes the previous worker material, then calls `upsertCustomGlasses(newData)` and `deleteCustomGlasses([previousLabel])` so the Glass Map store slice reflects the rename.

## Import / Export
- Exports JSON as `{ version: "1.0", Custom: { LABEL: { type: "tabulated", data } } }`.
- Imports are validated by `validateImportedCustomGlassData`.
- Label conflicts are checked only against `catalogsData.Custom`; confirmation uses the browser confirm dialog before overwrite.

## UI
- Top command bar: Import, Add Glass, Edit Glass, Download, Delete Glass, and a filter input.
- The main custom glass table is an AG Grid instance with checkbox, `Label`, `nd`, and `vd` columns; filtering removes checked rows hidden by the filter.
- The Add/Edit modal uses an AG Grid instance for tabulated pairs with delete action, `Fraunhofer`, `Wavelength (nm)`, and `Refractive Index` columns.
- Add/Edit modal validates label uniqueness, minimum four positive finite tabulated pairs, and distinct wavelengths.

## Helper Exports
- `EMPTY_CUSTOM_GLASSES` — stable empty object used when the store has no Custom catalog yet.
- `getUserDefinedCustomGlasses(customCatalog)` — returns the same Custom catalog reference when all entries are user-defined tabulated glass, otherwise filters to tabulated entries.
- `isUserDefinedGlassAlreadyExistsError(error)` — detects the worker duplicate-label error raised by `addUserDefinedGlasses`.
- `saveCustomGlass(options)` — orchestrates add/edit worker CRUD and mirrors successful changes into the Glass Map store actions.
