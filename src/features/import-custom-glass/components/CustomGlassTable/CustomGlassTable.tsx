"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
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

interface CustomGlassTableProps {
  readonly rows: readonly CustomGlassRow[];
  readonly checked: ReadonlySet<string>;
  readonly onCheckedChange: (checked: ReadonlySet<string>) => void;
}

export function CustomGlassTable({ rows, checked, onCheckedChange }: CustomGlassTableProps) {
  const gridTheme = useAgGridTheme();
  const mainColumnDefs = useMemo<ColDef<CustomGlassRow>[]>(() => [
    {
      headerName: "",
      width: 81,
      maxWidth: 81,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: { data: CustomGlassRow | undefined }) => {
        if (params.data === undefined) {
          return undefined;
        }

        return (
          <input
            type="checkbox"
            aria-label={`Select ${params.data.label}`}
            checked={checked.has(params.data.label)}
            onChange={(event) => {
              const next = new Set(checked);
              if (event.target.checked) {
                next.add(params.data!.label);
              } else {
                next.delete(params.data!.label);
              }
              onCheckedChange(next);
            }}
          />
        );
      },
    },
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
  ], [checked, onCheckedChange]);

  return (
    <div className="min-h-0 flex-1">
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<CustomGlassRow>
          theme={gridTheme}
          rowData={[...rows]}
          columnDefs={mainColumnDefs}
          defaultColDef={{ sortable: true, filter: true, suppressMovable: true }}
          getRowId={(params) => params.data.label}
        />
      </AgGridProvider>
    </div>
  );
}
