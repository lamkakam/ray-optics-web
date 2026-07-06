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
