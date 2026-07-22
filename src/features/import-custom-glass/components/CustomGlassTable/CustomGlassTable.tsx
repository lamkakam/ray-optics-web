/**
 * Describes the Custom Glass Table module.
 *
 * @remarks
 * ## Accessibility
 * - Each row checkbox exposes `aria-label="Select {label}"`.
 * - The header checkbox exposes `aria-label="Select all custom glasses"` in tests through the AG Grid mock.
 */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef, FilterChangedEvent, GridApi, GridReadyEvent, RowSelectionOptions, SelectionChangedEvent, SelectionColumnDef, SortChangedEvent } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { useStore } from "zustand";
import { useImportCustomGlassStore } from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import type { CustomGlassRow } from "@/features/import-custom-glass/types/customGlassImport";

const TEXT_FILTER_OPTIONS = ["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"] as const;
const NUMBER_FILTER_OPTIONS = [
  "equals",
  "notEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "inRange",
] as const;

function formatReadonlyNumber(value: unknown): string {
  return Number(value).toFixed(6);
}

function areSetsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

interface CustomGlassTableProps {
  /** Sorted page-derived `CustomGlassRow` records. */
  readonly rows: readonly CustomGlassRow[];
  /** Identifies selected glass labels. */
  readonly checked: ReadonlySet<string>;
  /** Receives the next selected label set when a checkbox changes. */
  readonly onCheckedChange: (checked: ReadonlySet<string>) => void;
}

/**
 * Readonly AG Grid table for all user-defined custom glasses.
 *
 * @remarks
 * ## Behavior
 * - Uses AG Grid multi-row selection with a dedicated selection column, row checkboxes, a header checkbox, and `selectAll: "all"`.
 * - Preserves the data columns `Label`, `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d`.
 * - Keeps the AG Grid selection column fixed at `81px`, `Label` at `125px`, and each numeric optical property column at `137px`.
 * - Selection is neither sortable nor filterable; data columns are sortable/filterable with `unSortIcon: true`.
 * - `Label` uses `agTextColumnFilter`; numeric columns use `agNumberColumnFilter`.
 * - Filter options intentionally omit AG Grid `blank` and `notBlank` choices.
 * - Numeric optical values are formatted with `Number(value).toFixed(6)`.
 * - `getRowId` uses the custom glass label so AG Grid can preserve row selection across row-data refreshes.
 * - `onSelectionChanged` maps AG Grid selected row nodes back into the page-level `ReadonlySet<string>` checked state.
 * - When `checked` changes externally after add, edit, delete, or import flows, the grid row selection is synchronized from that set.
 * - Reads saved sort/filter state from `ImportCustomGlassStore` on grid ready and restores it with `api.applyColumnState` and `api.setFilterModel`.
 * - Persists AG Grid `onSortChanged` and `onFilterChanged` output back into `ImportCustomGlassStore`.
 * - Persisted sort/filter state is sanitized by the store so only readonly data columns are kept; the AG Grid selection column is ignored.
 * - Wraps the grid with `import-custom-glass-touch-scroll` and component-local coarse-pointer CSS that restores horizontal and vertical touch panning plus scroll chaining for AG Grid viewports in this component only.
 * - Keeps AG Grid touch handling enabled so every resizable data-column header responds to touchscreen drags; the intentionally fixed selection column remains non-resizable.
 */
export function CustomGlassTable({ rows, checked, onCheckedChange }: CustomGlassTableProps) {
  const gridTheme = useAgGridTheme();
  const importCustomGlassStore = useImportCustomGlassStore();
  const sortState = useStore(importCustomGlassStore, (state) => state.sortState);
  const filterModel = useStore(importCustomGlassStore, (state) => state.filterModel);
  const setSortState = useStore(importCustomGlassStore, (state) => state.setSortState);
  const setFilterModel = useStore(importCustomGlassStore, (state) => state.setFilterModel);
  const gridApiRef = useRef<GridApi<CustomGlassRow> | undefined>(undefined);

  const rowSelection = useMemo<RowSelectionOptions<CustomGlassRow>>(() => ({
    mode: "multiRow",
    checkboxes: true,
    headerCheckbox: true,
    selectAll: "all",
  }), []);

  const selectionColumnDef = useMemo<SelectionColumnDef>(() => ({
    width: 81,
    maxWidth: 81,
    sortable: false,
    filter: false,
    resizable: false,
    suppressMovable: true,
  }), []);

  const mainColumnDefs = useMemo<ColDef<CustomGlassRow>[]>(() => [
    {
      headerName: "Label",
      field: "label",
      sortable: true,
      filter: "agTextColumnFilter",
      filterParams: { filterOptions: TEXT_FILTER_OPTIONS },
      unSortIcon: true,
      width: 125,
    },
    {
      headerName: "nd",
      field: "nd",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "vd",
      field: "vd",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "ne",
      field: "ne",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "ve",
      field: "ve",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "Pg,F",
      field: "pgF",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "PF,e",
      field: "pFe",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
    {
      headerName: "PF,d",
      field: "pFd",
      sortable: true,
      filter: "agNumberColumnFilter",
      filterParams: { filterOptions: NUMBER_FILTER_OPTIONS },
      unSortIcon: true,
      width: 137,
      valueFormatter: (params) => formatReadonlyNumber(params.value),
    },
  ], []);

  useEffect(() => {
    const api = gridApiRef.current;
    if (api === undefined) {
      return;
    }

    api.forEachNode((node) => {
      const label = node.data?.label;
      const shouldBeSelected = label !== undefined && checked.has(label);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
  }, [checked, rows]);

  const handleGridReady = (event: GridReadyEvent<CustomGlassRow>) => {
    gridApiRef.current = event.api;
    if (sortState.length > 0) {
      event.api.applyColumnState({
        state: [...sortState],
        defaultState: { sort: undefined },
      });
    }
    if (Object.keys(filterModel).length > 0) {
      event.api.setFilterModel(filterModel);
    }
    event.api.forEachNode((node) => {
      const label = node.data?.label;
      const shouldBeSelected = label !== undefined && checked.has(label);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
  };

  const handleSortChanged = (event: SortChangedEvent<CustomGlassRow>) => {
    setSortState(event.api.getColumnState());
  };

  const handleFilterChanged = (event: FilterChangedEvent<CustomGlassRow>) => {
    setFilterModel(event.api.getFilterModel());
  };

  const handleSelectionChanged = (event: SelectionChangedEvent<CustomGlassRow>) => {
    const selectedLabels = event.selectedNodes
      ?.map((node) => node.data?.label)
      .filter((label): label is string => label !== undefined) ?? [];
    const next = new Set(selectedLabels);
    if (!areSetsEqual(checked, next)) {
      onCheckedChange(next);
    }
  };

  return (
    <div className="import-custom-glass-touch-scroll min-h-0 flex-1">
      <style>{`
        @media (pointer: coarse) {
          .import-custom-glass-touch-scroll .ag-header-viewport,
          .import-custom-glass-touch-scroll .ag-body-viewport,
          .import-custom-glass-touch-scroll .ag-center-cols-viewport {
            overscroll-behavior-y: auto;
            touch-action: pan-x pan-y;
          }
        }
      `}</style>
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<CustomGlassRow>
          theme={gridTheme}
          rowData={[...rows]}
          columnDefs={mainColumnDefs}
          defaultColDef={{ sortable: true, filter: true, suppressMovable: true }}
          getRowId={(params) => params.data.label}
          rowSelection={rowSelection}
          selectionColumnDef={selectionColumnDef}
          onGridReady={handleGridReady}
          onSortChanged={handleSortChanged}
          onFilterChanged={handleFilterChanged}
          onSelectionChanged={handleSelectionChanged}
        />
      </AgGridProvider>
    </div>
  );
}
