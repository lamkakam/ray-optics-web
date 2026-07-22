/**
 * Describes the Import Custom Glass Store module.
 *
 * @remarks
 * ## State
 * | Field | Type | Default | Description |
 * |-------|------|---------|-------------|
 * | `sortState` | `readonly ImportCustomGlassSortState[]` | `[]` | Sanitized AG Grid sort state for readonly custom-glass data columns. |
 * | `filterModel` | `Partial<Record<ImportCustomGlassDataColumnId, unknown>>` | `{}` | Sanitized AG Grid filter model for readonly custom-glass data columns. |
 *
 * ## Data Columns
 * `IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS` is the allowlist for persisted table state:
 *
 * - `label`
 * - `nd`
 * - `vd`
 * - `ne`
 * - `ve`
 * - `pgF`
 * - `pFe`
 * - `pFd`
 *
 * The AG Grid selection column and unknown future columns are intentionally ignored until they are explicitly added to this tuple.
 *
 * ## Actions
 * | Action | Description |
 * |--------|-------------|
 * | `setSortState(state)` | Stores only entries whose `colId` is an allowed data column and whose `sort` is defined. |
 * | `setFilterModel(model)` | Stores only filter entries whose key is an allowed data column. |
 * | `resetTableState()` | Clears both sort and filter state. |
 */
import type { ColumnState } from "ag-grid-community";
import { type StateCreator } from "zustand";

export const IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS = [
  "label",
  "nd",
  "vd",
  "ne",
  "ve",
  "pgF",
  "pFe",
  "pFd",
] as const;

export type ImportCustomGlassDataColumnId = typeof IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS[number];
export type ImportCustomGlassFilterModel = Record<ImportCustomGlassDataColumnId, unknown>;
export type ImportCustomGlassSortState = Pick<ColumnState, "colId" | "sort" | "sortIndex">;

export interface ImportCustomGlassState {
  sortState: readonly ImportCustomGlassSortState[];
  filterModel: Partial<ImportCustomGlassFilterModel>;
}

export interface ImportCustomGlassActions {
  setSortState(state: readonly ColumnState[]): void;
  setFilterModel(model: Record<string, unknown>): void;
  resetTableState(): void;
}

/** Zustand store slice for Import Custom Glass table UI state that should survive route/component remounts while the app root providers remain mounted. */
export type ImportCustomGlassStore = ImportCustomGlassState & ImportCustomGlassActions;

const IMPORT_CUSTOM_GLASS_DATA_COLUMN_ID_SET = new Set<string>(IMPORT_CUSTOM_GLASS_DATA_COLUMN_IDS);

function isImportCustomGlassDataColumnId(value: string): value is ImportCustomGlassDataColumnId {
  return IMPORT_CUSTOM_GLASS_DATA_COLUMN_ID_SET.has(value);
}

function sanitizeSortState(state: readonly ColumnState[]): readonly ImportCustomGlassSortState[] {
  return state
    .filter((columnState) => (
      columnState.colId !== undefined
      && isImportCustomGlassDataColumnId(columnState.colId)
      && columnState.sort !== undefined
    ))
    .map((columnState) => ({
      colId: columnState.colId,
      sort: columnState.sort,
      sortIndex: columnState.sortIndex,
    }));
}

function sanitizeFilterModel(model: Record<string, unknown>): Partial<ImportCustomGlassFilterModel> {
  const sanitized: Partial<ImportCustomGlassFilterModel> = {};

  for (const [columnId, value] of Object.entries(model)) {
    if (isImportCustomGlassDataColumnId(columnId)) {
      sanitized[columnId] = value;
    }
  }

  return sanitized;
}

export const createImportCustomGlassSlice: StateCreator<ImportCustomGlassStore> = (set) => ({
  sortState: [],
  filterModel: {},
  setSortState: (state) => set({ sortState: sanitizeSortState(state) }),
  setFilterModel: (model) => set({ filterModel: sanitizeFilterModel(model) }),
  resetTableState: () => set({ sortState: [], filterModel: {} }),
});
