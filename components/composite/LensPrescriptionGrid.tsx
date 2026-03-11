"use client";

import React, { useMemo } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import {
  AllCommunityModule,
  themeQuartz,
  colorSchemeLight,
  colorSchemeDark,
} from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/lib/gridTypes";
import { MediumCell } from "@/components/micro/MediumCell";
import { AsphericalCell } from "@/components/micro/AsphericalCell";
import { DecenterCell } from "@/components/micro/DecenterCell";
import { GridRowButtons } from "@/components/micro/GridRowButtons";
import { useTheme } from "@/components/ThemeProvider";

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

const VALID_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

function numberValueParser(params: { newValue: string; oldValue: unknown }) {
  const raw = String(params.newValue ?? "").trim();
  if (raw === "" || !VALID_NUMBER.test(raw)) return params.oldValue;
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : params.oldValue;
}

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onOpenDecenterModal: (rowId: string) => void;
  readonly onAddRowAfter: (rowId: string) => void;
  readonly onDeleteRow: (rowId: string) => void;
}

export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onOpenDecenterModal,
  onAddRowAfter,
  onDeleteRow,
}: LensPrescriptionGridProps) {
  const { theme } = useTheme();
  const gridTheme = useMemo(
    () =>
      theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight),
    [theme],
  );

  const columnDefs: ColDef<GridRow>[] = [
    {
      headerName: "",
      field: "kind",
      width: 100,
      cellRenderer: (params: { data: GridRow }) => {
        const { kind, id } = params.data;
        return (
          <GridRowButtons
            onAdd={kind !== "image" ? () => onAddRowAfter(id) : undefined}
            onDelete={kind === "surface" ? () => onDeleteRow(id) : undefined}
          />
        );
      },
    },
    {
      headerName: "Surface",
      valueGetter: (params) => {
        if (!params.data) return "";
        if (params.data.kind === "object") return "Object";
        if (params.data.kind === "image") return "Image";
        return params.data.label;
      },
      editable: (params) => params.data?.kind === "surface",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: ["Default", "Stop"] },
      valueSetter: (params) => {
        if (!params.data) return false;
        onRowChange(params.data.id, { label: params.newValue as "Default" | "Stop" });
        return true;
      },
    },
    {
      headerName: "Radius of Curvature",
      valueGetter: (params) => {
        if (!params.data) return undefined;
        if (params.data.kind === "object") return undefined;
        return params.data.curvatureRadius;
      },
      editable: (params) => params.data?.kind !== "object",
      valueParser: numberValueParser,
      valueSetter: (params) => {
        if (!params.data) return false;
        onRowChange(params.data.id, { curvatureRadius: params.newValue as number });
        return true;
      },
    },
    {
      headerName: "Thickness",
      valueGetter: (params) => {
        if (!params.data) return undefined;
        if (params.data.kind === "object") return params.data.objectDistance;
        if (params.data.kind === "image") return undefined;
        return params.data.thickness;
      },
      editable: (params) => params.data?.kind !== "image",
      valueParser: numberValueParser,
      valueSetter: (params) => {
        if (!params.data) return false;
        if (params.data.kind === "object") {
          onRowChange(params.data.id, { objectDistance: params.newValue as number });
        } else {
          onRowChange(params.data.id, { thickness: params.newValue as number });
        }
        return true;
      },
    },
    {
      headerName: "Medium",
      valueGetter: (params) => {
        if (!params.data || params.data.kind !== "surface") return undefined;
        return params.data.medium;
      },
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => onOpenMediumModal(params.data.id)}>
            <MediumCell
              medium={params.data.medium}
              onOpenModal={() => onOpenMediumModal(params.data.id)}
            />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Semi-diam.",
      valueGetter: (params) => {
        if (!params.data || params.data.kind !== "surface") return undefined;
        return params.data.semiDiameter;
      },
      editable: (params) => params.data?.kind === "surface",
      valueParser: numberValueParser,
      valueSetter: (params) => {
        if (!params.data) return false;
        onRowChange(params.data.id, { semiDiameter: params.newValue as number });
        return true;
      },
    },
    {
      headerName: "Asph.",
      valueGetter: (params) => {
        if (!params.data || params.data.kind !== "surface") return undefined;
        return params.data.aspherical;
      },
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
    {
      headerName: "Decenter",
      valueGetter: (params) => {
        if (!params.data || params.data.kind !== "surface") return undefined;
        return params.data.decenter;
      },
      cellRenderer: (params: { data: GridRow }) => {
        if (params.data.kind !== "surface") return null;
        return (
          <ActionWrapper onAction={() => onOpenDecenterModal(params.data.id)}>
            <DecenterCell
              isDecenterSet={params.data.decenter !== undefined}
              onOpenModal={() => onOpenDecenterModal(params.data.id)}
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
          theme={gridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: false, suppressMovable: true }}
          rowSelection="single"
          domLayout="autoHeight"
          getRowId={(params) => params.data.id}
        />
      </AgGridProvider>
    </div>
  );
}
