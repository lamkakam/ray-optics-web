import { createStore } from "zustand/vanilla";
import {
  createImportCustomGlassSlice,
  type ImportCustomGlassStore,
} from "@/features/import-custom-glass/stores/importCustomGlassStore";

function makeStore() {
  return createStore<ImportCustomGlassStore>(createImportCustomGlassSlice);
}

describe("importCustomGlassStore", () => {
  it("initializes with empty sort and filter state", () => {
    const store = makeStore();

    expect(store.getState().sortState).toEqual([]);
    expect(store.getState().filterModel).toEqual({});
  });

  it("accepts sort state only for custom glass data columns", () => {
    const store = makeStore();

    store.getState().setSortState([
      { colId: "label", sort: "asc" },
      { colId: "ag-Grid-SelectionColumn", sort: "desc" },
      { colId: "nd", sort: "desc", sortIndex: 1 },
      { colId: "unknown", sort: "asc" },
      { colId: "vd" },
    ]);

    expect(store.getState().sortState).toEqual([
      { colId: "label", sort: "asc" },
      { colId: "nd", sort: "desc", sortIndex: 1 },
    ]);
  });

  it("accepts filter state only for custom glass data columns", () => {
    const store = makeStore();

    store.getState().setFilterModel({
      label: { filterType: "text", type: "contains", filter: "N-" },
      "ag-Grid-SelectionColumn": { filterType: "text", type: "equals", filter: "x" },
      nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
      unknown: { filterType: "number", type: "lessThan", filter: 2 },
    });

    expect(store.getState().filterModel).toEqual({
      label: { filterType: "text", type: "contains", filter: "N-" },
      nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
    });
  });

  it("resetTableState clears sort and filter state", () => {
    const store = makeStore();

    store.getState().setSortState([{ colId: "ne", sort: "asc" }]);
    store.getState().setFilterModel({ ve: { filterType: "number", type: "lessThan", filter: 70 } });

    store.getState().resetTableState();

    expect(store.getState().sortState).toEqual([]);
    expect(store.getState().filterModel).toEqual({});
  });
});
