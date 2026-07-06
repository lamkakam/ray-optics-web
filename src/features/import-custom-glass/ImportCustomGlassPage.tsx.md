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
- The command bar has separate `Import from JSON`, `Import from CSV Files`, and `Download JSON` actions.
- JSON imports are validated by `validateImportedCustomGlassData`.
- Invalid import files open the shared `Modal` primitive with an `Invalid Custom Glass JSON` message instead of using a native alert.
- CSV import accepts multiple refractiveindex.info-style files in one selection.
- Each CSV file must have a `wl,n` header with exactly those two comma-separated columns, at least four data rows, finite positive numeric values, and no duplicate wavelengths. Files with missing headers, extra columns, empty data, malformed rows, non-numeric values, non-positive values, duplicate wavelengths, or blank filename-derived labels are rejected.
- CSV labels come from each filename stem, so `LF7.csv` imports as `LF7`.
- CSV wavelengths are read in micrometers and converted to nanometers only after the whole file validates.
- CSV batches allow partial success: valid files are imported, rejected files are not sent to the worker, and `Rejected Custom Glass CSV Files` lists every rejected filename with its reason. If every selected CSV file is rejected, no worker import APIs are called.
- Label conflicts are checked only against `catalogsData.Custom`; overwrite confirmation uses the shared `Modal` primitive with `Cancel` and `Overwrite` actions before calling worker update/add APIs.
- CSV rejection reporting is preserved when valid CSV files also need overwrite confirmation; rejected-file details are shown after the overwrite flow completes.

## UI
- Top command bar: Import from JSON, Import from CSV Files, Add Glass, Edit Glass, Download JSON, and Delete Glass. The readonly custom glass table intentionally has no page-level filter input.
- The main custom glass table is an AG Grid instance with checkbox, `Label`, `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d` columns. Rows show all user-defined custom glasses sorted by label.
- The readonly grid sizes the checkbox/select column as a fixed `81px` column wide enough to avoid checkbox-cell ellipsis, sets `Label` to a fixed `125px`, and uses fixed `137px` numeric columns for `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d`.
- The readonly grid keeps the checkbox/select column neither sortable nor filterable while `Label`, `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d` remain sortable and filterable through their column definitions and the grid default column definition.
- The readonly grid uses `agTextColumnFilter` for `Label` and `agNumberColumnFilter` for numeric optical columns. Each filter explicitly sets `filterParams.filterOptions` so AG Grid's default `blank` and `notBlank` options are not offered.
- The sortable readonly data columns set `unSortIcon: true` so AG Grid displays an unsorted sort indicator before the first sort interaction.
- The readonly optical property cells display `Number(value).toFixed(6)`.
- Delete confirmation uses the shared `Modal` primitive with `Cancel` and `Delete` actions, and does not call the worker until `Delete` is clicked.
- The Add/Edit modal uses an AG Grid instance for tabulated pairs with delete action, `Fraunhofer`, `Wavelength (nm)`, and `Refractive Index` columns.
- Add/Edit modal validates label uniqueness, minimum four positive finite tabulated pairs, and distinct wavelengths.

## Helper Exports
- `EMPTY_CUSTOM_GLASSES` — stable empty object used when the store has no Custom catalog yet.
- `getUserDefinedCustomGlasses(customCatalog)` — returns the same Custom catalog reference when all entries are user-defined tabulated glass, otherwise filters to tabulated entries.
- `isUserDefinedGlassAlreadyExistsError(error)` — detects the worker duplicate-label error raised by `addUserDefinedGlasses`.
- `saveCustomGlass(options)` — orchestrates add/edit worker CRUD and mirrors successful changes into the Glass Map store actions.
