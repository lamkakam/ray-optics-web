# `features/import-custom-glass/stores/importCustomGlassStore.ts`

## Purpose
Zustand store slice for Import Custom Glass table UI state that should survive route/component remounts while the app root providers remain mounted.

## State
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sortState` | `readonly ImportCustomGlassSortState[]` | `[]` | Sanitized AG Grid sort state for readonly custom-glass data columns. |
| `filterModel` | `Partial<Record<ImportCustomGlassDataColumnId, unknown>>` | `{}` | Sanitized AG Grid filter model for readonly custom-glass data columns. |

## Data Columns
`IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS` is the allowlist for persisted table state:

- `label`
- `nd`
- `vd`
- `ne`
- `ve`
- `pgF`
- `pFe`
- `pFd`

The AG Grid selection column and unknown future columns are intentionally ignored until they are explicitly added to this tuple.

## Actions
| Action | Description |
|--------|-------------|
| `setSortState(state)` | Stores only entries whose `colId` is an allowed data column and whose `sort` is defined. |
| `setFilterModel(model)` | Stores only filter entries whose key is an allowed data column. |
| `resetTableState()` | Clears both sort and filter state. |

## Export
- `createImportCustomGlassSlice` - `StateCreator<ImportCustomGlassStore>` for creating the feature store.
- `IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS` - readonly tuple of AG Grid data-column IDs.
- `ImportCustomGlassDataColumnId` - narrowed union of supported data-column IDs.
- `ImportCustomGlassStore` - combined state and actions type.
