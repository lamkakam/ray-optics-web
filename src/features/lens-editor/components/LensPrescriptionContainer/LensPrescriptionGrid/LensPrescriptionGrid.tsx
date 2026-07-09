"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { GridRowButtons } from "../GridRowButtons";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import {
  createLensPrescriptionCommonColumns,
  lensPrescriptionGridDefaultColDef,
  lensPrescriptionGridIndexColumnDef,
} from "@/shared/lib/lens-prescription-grid";

interface LensPrescriptionGridProps {
  readonly rows: GridRow[];
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  readonly onOpenMediumModal: (rowId: string) => void;
  readonly onOpenAsphericalModal: (rowId: string) => void;
  readonly onOpenDecenterModal: (rowId: string) => void;
  readonly onOpenDiffractionGratingModal: (rowId: string) => void;
  readonly onOpenApertureModal: (rowId: string) => void;
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
  onOpenApertureModal,
  onAddRowAfter,
  onDeleteRow,
  semiDiameterReadonly = false,
}: LensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();

  const surfaceIndexByRowId = useMemo(() => {
    const indexByRowId = new Map<string, number>();
    let surfaceIndex = 1;

    for (const row of rows) {
      if (row.kind === "surface") {
        indexByRowId.set(row.id, surfaceIndex);
        surfaceIndex += 1;
      }
    }

    return indexByRowId;
  }, [rows]);

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
    {
      ...lensPrescriptionGridIndexColumnDef,
      valueGetter: (params) => {
        if (!params.data || params.data.kind !== "surface") {
          return undefined;
        }

        return surfaceIndexByRowId.get(params.data.id);
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
      onOpenApertureModal: (row) => onOpenApertureModal(row.id),
      onOpenAsphericalModal: (row) => onOpenAsphericalModal(row.id),
      onOpenDecenterModal: (row) => onOpenDecenterModal(row.id),
      onOpenDiffractionGratingModal: (row) => onOpenDiffractionGratingModal(row.id),
    }),
  ], [surfaceIndexByRowId, semiDiameterReadonly, onRowChange, onOpenMediumModal, onOpenAsphericalModal, onOpenApertureModal, onOpenDecenterModal, onOpenDiffractionGratingModal, onAddRowAfter, onDeleteRow]);

  return (
    <div
      aria-label="Lens prescription editor"
      className="h-[calc(100vh-160px)] min-[1440px]:min-h-[200px] min-[1440px]:flex-1"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<GridRow>
          theme={gridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={lensPrescriptionGridDefaultColDef}
          domLayout="normal"
          getRowId={(params) => params.data.id}
        />
      </AgGridProvider>
    </div>
  );
}
