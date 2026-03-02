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

function FocusWrapper({ children }: { readonly children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const el = e.currentTarget.querySelector<HTMLElement>("input, select, button");
    el?.focus();
  };
  return (
    <div
      data-cell-wrapper
      className="w-full h-full flex items-center"
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

function ActionWrapper({
  children,
  onAction,
}: {
  readonly children: React.ReactNode;
  readonly onAction: () => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    onAction();
  };
  return (
    <div
      data-cell-wrapper
      className="w-full h-full flex items-center cursor-pointer"
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onAddRowAfter: (rowId: string) => void;
  readonly onDeleteRow: (rowId: string) => void;
}

export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onAddRowAfter,
  onDeleteRow,
}: LensPrescriptionGridProps) {
  const columnDefs: ColDef<GridRow>[] = [
    {
      headerName: "",
      field: "kind",
      width: 80,
      cellRenderer: (params: { data: GridRow }) => {
        const { kind, id } = params.data;
        return (
          <span>
            {kind !== "image" && (
              <button
                type="button"
                aria-label="Insert row"
                onClick={() => onAddRowAfter(id)}
              >
                +
              </button>
            )}
            {kind === "surface" && (
              <button
                type="button"
                aria-label="Delete row"
                onClick={() => onDeleteRow(id)}
              >
                −
              </button>
            )}
          </span>
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
          <FocusWrapper>
            <SurfaceLabelCell
              value={params.data.label ?? "Default"}
              onValueChange={(val) => onRowChange(params.data.id, { label: val })}
            />
          </FocusWrapper>
        );
      },
    },
    {
      headerName: "Radius",
      field: "curvatureRadius",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind === "object") return null;
        return (
          <FocusWrapper>
            <NumberCell
              value={params.data.curvatureRadius ?? 0}
              onValueChange={(val) => onRowChange(params.data.id, { curvatureRadius: val })}
            />
          </FocusWrapper>
        );
      },
    },
    {
      headerName: "Thickness",
      field: "thickness",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind === "image") return null;
        if (params.data.kind === "object") {
          return (
            <FocusWrapper>
              <NumberCell
                value={params.data.objectDistance ?? 0}
                onValueChange={(val) => onRowChange(params.data.id, { objectDistance: val })}
              />
            </FocusWrapper>
          );
        }
        return (
          <FocusWrapper>
            <NumberCell
              value={params.data.thickness ?? 0}
              onValueChange={(val) => onRowChange(params.data.id, { thickness: val })}
            />
          </FocusWrapper>
        );
      },
    },
    {
      headerName: "Medium",
      field: "medium",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => onOpenMediumModal(params.data.id)}>
            <MediumCell
              medium={params.data.medium ?? ""}
              onOpenModal={() => onOpenMediumModal(params.data.id)}
            />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Semi-diam.",
      field: "semiDiameter",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <FocusWrapper>
            <NumberCell
              value={params.data.semiDiameter ?? 0}
              onValueChange={(val) => onRowChange(params.data.id, { semiDiameter: val })}
            />
          </FocusWrapper>
        );
      },
    },
    {
      headerName: "Asph.",
      field: "aspherical",
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => onOpenAsphericalModal(params.data.id)}>
            <AsphericalCell
              isAspherical={params.data.aspherical !== undefined}
              onOpenModal={() => onOpenAsphericalModal(params.data.id)}
            />
          </ActionWrapper>
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
