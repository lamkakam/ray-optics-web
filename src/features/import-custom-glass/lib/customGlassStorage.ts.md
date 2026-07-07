# `features/import-custom-glass/lib/customGlassStorage.ts`

## Purpose
IndexedDB persistence for user-defined custom glass rows.

## Database Contract
- Database name: `ray-optics-web-custom-glass`.
- Version: `1`.
- Object stores:
  - `customGlasses`, keyed by `label`.
  - `quarantinedCustomGlasses`, keyed by `label`.
- Persisted rows use `{ label, type: "tabulated", pairs }`.

## Behavior
- `toPersistedCustomGlassRow(input)` converts worker input rows to the persisted row shape.
- `isPersistedCustomGlassRow(value)` accepts only non-blank labels, `type: "tabulated"`, and finite numeric wavelength/index pairs.
- `readStoredCustomGlassRows()` returns raw rows for startup hydration and quarantine decisions.
- `readPersistedCustomGlasses()` returns only valid rows from `customGlasses`.
- `upsertPersistedCustomGlass()` and `upsertPersistedCustomGlasses()` write rows after a successful worker mutation.
- `deletePersistedCustomGlasses()` removes rows after a successful worker delete.
- `quarantinePersistedCustomGlass()` and `quarantineStoredCustomGlassRow()` write the row into `quarantinedCustomGlasses` and remove it from `customGlasses`.
- `_setIndexedDbForTest()` exists only to inject a controlled IndexedDB factory in unit tests.
