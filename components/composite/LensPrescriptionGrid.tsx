"use client";

import React from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import type { GridRow } from "@/lib/gridTypes";

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onRowSelected: (rowId: string | undefined) => void;
  readonly theme?: "light" | "dark";
}

export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onRowSelected,
  theme = "light",
}: LensPrescriptionGridProps) {
  const columnDefs: ColDef<GridRow>[] = [
    {
      headerName: "",
      field: "kind",
      width: 40,
      checkboxSelection: (params) =>
        params.data?.kind === "surface",
    },
    {
      headerName: "Surface",
      field: "label",
      valueGetter: (params) => {
        if (params.data?.kind === "object") return "Object";
        if (params.data?.kind === "image") return "Image";
        return params.data?.label ?? "Default";
      },
    },
    {
      headerName: "Radius",
      field: "curvatureRadius",
      editable: (params) => params.data?.kind !== "object",
    },
    {
      headerName: "Thickness",
      field: "thickness",
      editable: (params) => params.data?.kind === "surface",
    },
    {
      headerName: "Medium",
      field: "medium",
    },
    {
      headerName: "Semi-diam.",
      field: "semiDiameter",
      editable: (params) => params.data?.kind === "surface",
    },
    {
      headerName: "Asph.",
      field: "aspherical",
      valueGetter: (params) =>
        params.data?.aspherical !== undefined,
    },
  ];

  return (
    <div
      className="ag-theme-quartz"
      data-ag-theme-mode={theme}
      aria-label="Lens prescription editor"
    >
      <AgGridReact
        rowData={rows}
        columnDefs={columnDefs}
        rowSelection="single"
        domLayout="autoHeight"
        getRowId={(params) => params.data.id}
        stopEditingWhenCellsLoseFocus={true}
        enterNavigatesVertically={true}
        enterNavigatesVerticallyAfterEdit={true}
      />
    </div>
  );
}
