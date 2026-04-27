"use client";

import { useMemo } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { RadiusMode, AsphereOptimizationState } from "@/features/optimization/stores/optimizationStore";
import type { RadiusRow } from "@/features/optimization/components/optimizationViewModels";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import {
  createAsphericalColumn,
  createDecenterColumn,
  createDiffractionGratingColumn,
  createMediumColumn,
  createRadiusOfCurvatureColumn,
  createSemiDiameterColumn,
  createSurfaceColumn,
  createThicknessColumn,
  LENS_PRESCRIPTION_GRID_DOM_LAYOUT,
  LensPrescriptionActionWrapper,
  lensPrescriptionGridDefaultColDef,
} from "@/shared/lib/lens-prescription-grid";

const OPTIMIZATION_VAR_COLUMN_WIDTH = 60;

function getSurfaceModeLabel(mode: RadiusMode["mode"] | undefined): string {
  if (mode === "variable") {
    return "V";
  }
  if (mode === "pickup") {
    return "P";
  }
  return "C";
}

function getAsphereModeLabel(asphereState: AsphereOptimizationState | undefined): string {
  if (asphereState === undefined) {
    return "C";
  }

  const modes = [
    asphereState.conic,
    asphereState.toricSweep,
    ...asphereState.coefficients,
  ];
  const labels: string[] = [];

  if (modes.some((mode) => mode.mode === "variable")) {
    labels.push("V");
  }
  if (modes.some((mode) => mode.mode === "pickup")) {
    labels.push("P");
  }

  return labels.length > 0 ? labels.join(",") : "C";
}

function OptimizationVariableModeCell({
  label,
  ariaLabel,
  onOpenModal,
}: {
  readonly label: string;
  readonly ariaLabel: string;
  readonly onOpenModal: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="cursor-pointer"
      onClick={onOpenModal}
    >
      {label}
    </button>
  );
}

interface OptimizationLensPrescriptionGridProps {
  readonly rows: ReadonlyArray<RadiusRow>;
  readonly radiusModes: ReadonlyArray<RadiusMode>;
  readonly thicknessModes: ReadonlyArray<RadiusMode>;
  readonly asphereStates: ReadonlyArray<AsphereOptimizationState>;
  readonly onOpenRadiusModal: (surfaceIndex: number) => void;
  readonly onOpenThicknessModal: (surfaceIndex: number) => void;
  readonly onOpenMediumModal: (row: GridRow) => void;
  readonly onOpenAsphericalModal: (row: GridRow) => void;
  readonly onOpenAsphereVarModal: (surfaceIndex: number) => void;
  readonly onOpenDecenterModal: (row: GridRow) => void;
  readonly onOpenDiffractionGratingModal: (row: GridRow) => void;
}

export function OptimizationLensPrescriptionGrid({
  rows,
  radiusModes,
  thicknessModes,
  asphereStates,
  onOpenRadiusModal,
  onOpenThicknessModal,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onOpenAsphereVarModal,
  onOpenDecenterModal,
  onOpenDiffractionGratingModal,
}: OptimizationLensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();

  const lensColumns = useMemo<ColDef<RadiusRow>[]>(() => [
    {
      headerName: "Index",
      width: 95,
      valueGetter: (params) => {
        if (params.data?.row.kind !== "surface") {
          return undefined;
        }

        return params.data.radiusSurfaceIndex;
      },
    },
    createSurfaceColumn<RadiusRow>({ getGridRow: (data) => data.row }),
    createRadiusOfCurvatureColumn<RadiusRow>({ getGridRow: (data) => data.row }),
    {
      headerName: "Var.",
      width: OPTIMIZATION_VAR_COLUMN_WIDTH,
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.radiusSurfaceIndex === undefined) {
          return undefined;
        }

        const mode = radiusModes.find((entry) => entry.surfaceIndex === params.data.radiusSurfaceIndex);
        const surfaceIndex = params.data.radiusSurfaceIndex;
        return (
          <LensPrescriptionActionWrapper onAction={() => onOpenRadiusModal(surfaceIndex)}>
            <Tooltip
              text="Click to configure radius variable or pickup"
              position="top"
              portal
              noTouch
              triggerClassName="flex h-full w-full"
            >
              <OptimizationVariableModeCell
                label={getSurfaceModeLabel(mode?.mode)}
                ariaLabel={`Radius mode for surface ${surfaceIndex}`}
                onOpenModal={() => onOpenRadiusModal(surfaceIndex)}
              />
            </Tooltip>
          </LensPrescriptionActionWrapper>
        );
      },
    },
    createThicknessColumn<RadiusRow>({ getGridRow: (data) => data.row }),
    {
      headerName: "Var.",
      width: OPTIMIZATION_VAR_COLUMN_WIDTH,
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.thicknessSurfaceIndex === undefined) {
          return undefined;
        }

        const mode = thicknessModes.find((entry) => entry.surfaceIndex === params.data.thicknessSurfaceIndex);
        const surfaceIndex = params.data.thicknessSurfaceIndex;
        return (
          <LensPrescriptionActionWrapper onAction={() => onOpenThicknessModal(surfaceIndex)}>
            <Tooltip
              text="Click to configure thickness variable or pickup"
              position="top"
              portal
              noTouch
              triggerClassName="flex h-full w-full"
            >
              <OptimizationVariableModeCell
                label={getSurfaceModeLabel(mode?.mode)}
                ariaLabel={`Thickness mode for surface ${surfaceIndex}`}
                onOpenModal={() => onOpenThicknessModal(surfaceIndex)}
              />
            </Tooltip>
          </LensPrescriptionActionWrapper>
        );
      },
    },
    createMediumColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      onOpenMediumModal,
      tooltipText: "Click to view medium or glass",
    }),
    createSemiDiameterColumn<RadiusRow>({ getGridRow: (data) => data.row }),
    createAsphericalColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      onOpenAsphericalModal,
      tooltipText: "Click to view aspherical parameters",
    }),
    {
      headerName: "Var.",
      width: OPTIMIZATION_VAR_COLUMN_WIDTH,
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind !== "surface" || params.data.radiusSurfaceIndex === undefined) {
          return undefined;
        }

        const asphereState = asphereStates.find((entry) => entry.surfaceIndex === params.data.radiusSurfaceIndex);
        const surfaceIndex = params.data.radiusSurfaceIndex;

        return (
          <LensPrescriptionActionWrapper onAction={() => onOpenAsphereVarModal(surfaceIndex)}>
            <Tooltip
              text="Click to configure asphere variable or pickup"
              position="top"
              portal
              noTouch
              triggerClassName="flex h-full w-full"
            >
              <OptimizationVariableModeCell
                label={getAsphereModeLabel(asphereState)}
                ariaLabel={`Asphere mode for surface ${surfaceIndex}`}
                onOpenModal={() => onOpenAsphereVarModal(surfaceIndex)}
              />
            </Tooltip>
          </LensPrescriptionActionWrapper>
        );
      },
    },
    createDecenterColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      onOpenDecenterModal,
    }),
    createDiffractionGratingColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      onOpenDiffractionGratingModal,
      tooltipText: "Click to view diffraction grating",
    }),
  ], [
    asphereStates,
    onOpenAsphericalModal,
    onOpenAsphereVarModal,
    onOpenDecenterModal,
    onOpenDiffractionGratingModal,
    onOpenMediumModal,
    onOpenRadiusModal,
    onOpenThicknessModal,
    radiusModes,
    thicknessModes,
  ]);

  return (
    <div data-testid="optimization-lens-prescription-grid" className="overflow-x-auto">
      <AgGridProvider modules={[AllCommunityModule]}>
        <AgGridReact
          theme={gridTheme}
          rowData={[...rows]}
          columnDefs={lensColumns}
          defaultColDef={lensPrescriptionGridDefaultColDef}
          domLayout={LENS_PRESCRIPTION_GRID_DOM_LAYOUT}
        />
      </AgGridProvider>
    </div>
  );
}
