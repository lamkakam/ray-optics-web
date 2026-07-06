"use client";

import { useEffect, useMemo, useRef } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent, RowSelectionOptions, SelectionChangedEvent, SelectionColumnDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
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
  readonly rows: readonly CustomGlassRow[];
  readonly checked: ReadonlySet<string>;
  readonly onCheckedChange: (checked: ReadonlySet<string>) => void;
}

export function CustomGlassTable({ rows, checked, onCheckedChange }: CustomGlassTableProps) {
  const gridTheme = useAgGridTheme();
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
    event.api.forEachNode((node) => {
      const label = node.data?.label;
      const shouldBeSelected = label !== undefined && checked.has(label);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
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
    <div className="min-h-0 flex-1">
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
          onSelectionChanged={handleSelectionChanged}
        />
      </AgGridProvider>
    </div>
  );
}
