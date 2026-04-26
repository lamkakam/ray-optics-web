"use client";

import { useMemo } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import { AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import { GridRowButtons } from "@/features/lens-editor/components/GridRowButtons";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import {
  createLensPrescriptionCommonColumns,
  LENS_PRESCRIPTION_GRID_DOM_LAYOUT,
  lensPrescriptionGridDefaultColDef,
} from "@/shared/lib/lens-prescription-grid";

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onOpenDecenterModal: (rowId: string) => void;
  readonly onOpenDiffractionGratingModal: (rowId: string) => void;
  readonly onAddRowAfter: (rowId: string) => void;
  readonly onDeleteRow: (rowId: string) => void;
  readonly semiDiameterReadonly?: boolean;
}

export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onOpenDecenterModal,
  onOpenDiffractionGratingModal,
  onAddRowAfter,
  onDeleteRow,
  semiDiameterReadonly = false,
}: LensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => [
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
    ...createLensPrescriptionCommonColumns<GridRow>({
      getGridRow: (row) => row,
      onSurfaceLabelChange: (row, label) => onRowChange(row.id, { label }),
      onRadiusChange: (row, curvatureRadius) => onRowChange(row.id, { curvatureRadius }),
      onThicknessChange: (row, thickness) => {
        if (row.kind === "object") {
          onRowChange(row.id, { objectDistance: thickness });
        } else {
          onRowChange(row.id, { thickness });
        }
      },
      onOpenMediumModal: (row) => onOpenMediumModal(row.id),
      onSemiDiameterChange: (row, semiDiameter) => onRowChange(row.id, { semiDiameter }),
      semiDiameterReadonly,
      onOpenAsphericalModal: (row) => onOpenAsphericalModal(row.id),
      onOpenDecenterModal: (row) => onOpenDecenterModal(row.id),
      onOpenDiffractionGratingModal: (row) => onOpenDiffractionGratingModal(row.id),
    }),
  ], [semiDiameterReadonly, onRowChange, onOpenMediumModal, onOpenAsphericalModal, onOpenDecenterModal, onOpenDiffractionGratingModal, onAddRowAfter, onDeleteRow]);

  return (
    <div
      aria-label="Lens prescription editor"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <AgGridReact
          theme={gridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={lensPrescriptionGridDefaultColDef}
          domLayout={LENS_PRESCRIPTION_GRID_DOM_LAYOUT}
          getRowId={(params) => params.data.id}
        />
      </AgGridProvider>
    </div>
  );
}
