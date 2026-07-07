# `features/import-custom-glass/lib/customGlassImport.ts`

## Purpose
Pure helpers and browser/worker orchestration for custom glass import, export, and save flows.

## Catalog Helpers
- `EMPTY_CUSTOM_GLASSES` is a stable empty object returned before the Custom catalog exists.
- `getUserDefinedCustomGlasses(customCatalog)` returns the same catalog reference when all entries are tabulated user-defined glass, otherwise filters out non-tabulated catalog entries.

## Modal Conversion
- `makeEditablePair(pair)` creates modal grid rows with a generated id and string wavelength/index values.
- Row id generation uses a module-level monotonically increasing counter, returning ids of the form `row-custom-glass-N`.
- `toWorkerInput(label, rows)` trims the label and converts modal row strings to numeric worker pairs.

## JSON Export
- `toCustomGlassPayload(custom)` preserves the import/export JSON contract: `{ version: "1.0", Custom: { LABEL: { type: "tabulated", data } } }`.
- `downloadCustomGlassJson(payload)` writes that payload as `custom-glass.json` with two-space formatting.

## CSV Import
- `parseCustomGlassCsv(file, text)` accepts refractiveindex.info-style CSV files with exactly `wl,n` headers.
- Labels are derived from the filename stem.
- Rows must contain exactly two non-blank finite positive numeric values.
- Duplicate wavelengths are rejected before conversion.
- At least four valid wavelength/index pairs are required.
- Wavelengths are converted from micrometers to nanometers and rounded to avoid binary floating-point artifacts.
- The function returns either an imported material or a rejection record with filename and reason.

## Worker Save Flow
- `saveCustomGlass(options)` handles add/edit worker mutations and store mirroring.
- Edit with an unchanged label updates the existing worker glass and upserts returned data.
- Edit with a changed label adds the new worker glass, deletes the previous worker label, then upserts and deletes in the store.
- Add mode falls back to `getUserDefinedGlasses([label])` when the worker reports that the user-defined label already exists, preserving the existing sync behavior.
