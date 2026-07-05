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
- Invalid import files open the shared `Modal` primitive with an `Invalid Custom Glass JSON` message instead of using a native alert.
- Label conflicts are checked only against `catalogsData.Custom`; overwrite confirmation uses the shared `Modal` primitive with `Cancel` and `Overwrite` actions before calling worker update/add APIs.

## UI
- Top command bar: Import, Add Glass, Edit Glass, Download, and Delete Glass. The readonly custom glass table intentionally has no page-level filter input.
- The main custom glass table is an AG Grid instance with checkbox, `Label`, `nd`, and `vd` columns. Rows show all user-defined custom glasses sorted by label.
- The readonly grid sizes the checkbox/select column as a narrow fixed column wide enough to avoid checkbox-cell ellipsis, sets `Label` to a fixed `100px`, and uses compact fixed-width numeric columns for `nd` and `vd`.
- The readonly `nd` and `vd` cells display `Number(value).toFixed(6)`.
- Delete confirmation uses the shared `Modal` primitive with `Cancel` and `Delete` actions, and does not call the worker until `Delete` is clicked.
- The Add/Edit modal uses an AG Grid instance for tabulated pairs with delete action, `Fraunhofer`, `Wavelength (nm)`, and `Refractive Index` columns.
- Add/Edit modal validates label uniqueness, minimum four positive finite tabulated pairs, and distinct wavelengths.

## Helper Exports
- `EMPTY_CUSTOM_GLASSES` — stable empty object used when the store has no Custom catalog yet.
- `getUserDefinedCustomGlasses(customCatalog)` — returns the same Custom catalog reference when all entries are user-defined tabulated glass, otherwise filters to tabulated entries.
- `isUserDefinedGlassAlreadyExistsError(error)` — detects the worker duplicate-label error raised by `addUserDefinedGlasses`.
- `saveCustomGlass(options)` — orchestrates add/edit worker CRUD and mirrors successful changes into the Glass Map store actions.
