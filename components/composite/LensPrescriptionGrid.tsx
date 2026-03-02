"use client";

import React from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import { AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/lib/gridTypes";
import { SurfaceLabelCell } from "@/components/micro/SurfaceLabelCell";
import { NumberCell } from "@/components/micro/NumberCell";
import { MediumCell } from "@/components/micro/MediumCell";
import { AsphericalCell } from "@/components/micro/AsphericalCell";

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onRowSelected: (rowId: string | undefined) => void;
}

export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onRowSelected,
}: LensPrescriptionGridProps) {
  const columnDefs: ColDef<GridRow>[] = [
    {
      headerName: "",
      field: "kind",
      width: 40,
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <input
            type="radio"
            name="row-selection"
            onClick={() => onRowSelected(params.data.id)}
          />
        );
      },
    },
    {
      headerName: "Surface",
      field: "label",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind === "object") return "Object";
        if (params.data.kind === "image") return "Image";
        return (
          <SurfaceLabelCell
            value={params.data.label ?? "Default"}
            onValueChange={(val) => onRowChange(params.data.id, { label: val })}
          />
        );
      },
    },
    {
      headerName: "Radius",
      field: "curvatureRadius",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind === "object") return null;
        return (
          <NumberCell
            value={params.data.curvatureRadius ?? 0}
            onValueChange={(val) => onRowChange(params.data.id, { curvatureRadius: val })}
          />
        );
      },
    },
    {
      headerName: "Thickness",
      field: "thickness",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <NumberCell
            value={params.data.thickness ?? 0}
            onValueChange={(val) => onRowChange(params.data.id, { thickness: val })}
          />
        );
      },
    },
    {
      headerName: "Medium",
      field: "medium",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <MediumCell
            medium={params.data.medium ?? ""}
            onOpenModal={() => onOpenMediumModal(params.data.id)}
          />
        );
      },
    },
    {
      headerName: "Semi-diam.",
      field: "semiDiameter",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <NumberCell
            value={params.data.semiDiameter ?? 0}
            onValueChange={(val) => onRowChange(params.data.id, { semiDiameter: val })}
          />
        );
      },
    },
    {
      headerName: "Asph.",
      field: "aspherical",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <AsphericalCell
            isAspherical={params.data.aspherical !== undefined}
            onOpenModal={() => onOpenAsphericalModal(params.data.id)}
          />
        );
      },
    },
  ];

  return (
    <div
      aria-label="Lens prescription editor"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          rowSelection="single"
          domLayout="autoHeight"
          getRowId={(params) => params.data.id}
        />
      </AgGridProvider>
    </div>
  );
}
