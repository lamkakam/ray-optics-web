"use client";

import React, { useMemo } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import { DecenterCell } from "@/features/lens-editor/components/DecenterCell";
import type { RadiusMode } from "@/features/optimization/stores/optimizationStore";
import type { RadiusRow } from "@/features/optimization/components/optimizationViewModels";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

function ActionWrapper({
  children,
  onAction,
}: {
  readonly children: React.ReactNode;
  readonly onAction: () => void;
}) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    onAction();
  };

  return (
    <div className="flex h-full w-full cursor-pointer items-center" onClick={handleClick}>
      {children}
    </div>
  );
}

function OptimizationMediumCell({
  medium,
  onOpenModal,
}: {
  readonly medium: string;
  readonly onOpenModal: () => void;
}) {
  return (
    <Tooltip text="Click to view medium or glass" position="top" portal noTouch>
      <button
        type="button"
        aria-label="Edit medium"
        className="cursor-pointer"
        onClick={onOpenModal}
      >
        {medium}
      </button>
    </Tooltip>
  );
}

function OptimizationAsphericalCell({
  isAspherical,
  onOpenModal,
}: {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
}) {
  return (
    <Tooltip text="Click to view aspherical parameters" position="top" portal noTouch>
      <SetButton isSet={isAspherical} aria-label="Edit aspherical parameters" onClick={onOpenModal} />
    </Tooltip>
  );
}

function OptimizationDiffractionGratingCell({
  isDiffractionGratingSet,
  onOpenModal,
}: {
  readonly isDiffractionGratingSet: boolean;
  readonly onOpenModal: () => void;
}) {
  return (
    <Tooltip text="Click to view diffraction grating" position="top" portal noTouch>
      <SetButton
        isSet={isDiffractionGratingSet}
        aria-label="Edit diffraction grating"
        onClick={onOpenModal}
      />
    </Tooltip>
  );
}

interface OptimizationLensPrescriptionGridProps {
  readonly rows: ReadonlyArray<RadiusRow>;
  readonly radiusModes: ReadonlyArray<RadiusMode>;
  readonly thicknessModes: ReadonlyArray<RadiusMode>;
  readonly onOpenRadiusModal: (surfaceIndex: number) => void;
  readonly onOpenThicknessModal: (surfaceIndex: number) => void;
  readonly onOpenMediumModal: (row: GridRow) => void;
  readonly onOpenAsphericalModal: (row: GridRow) => void;
  readonly onOpenDecenterModal: (row: GridRow) => void;
  readonly onOpenDiffractionGratingModal: (row: GridRow) => void;
}

export function OptimizationLensPrescriptionGrid({
  rows,
  radiusModes,
  thicknessModes,
  onOpenRadiusModal,
  onOpenThicknessModal,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onOpenDecenterModal,
  onOpenDiffractionGratingModal,
}: OptimizationLensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();

  const lensColumns = useMemo<ColDef<RadiusRow>[]>(() => [
    {
      headerName: "Index",
      valueGetter: (params) => {
        if (params.data?.row.kind !== "surface") {
          return undefined;
        }

        return params.data.radiusSurfaceIndex;
      },
    },
    {
      headerName: "Surface",
      valueGetter: (params) => {
        if (params.data === undefined) {
          return "";
        }
        if (params.data.row.kind === "object") {
          return "Object";
        }
        if (params.data.row.kind === "image") {
          return "Image";
        }
        return params.data.row.label;
      },
    },
    {
      headerName: "Radius of Curvature",
      valueGetter: (params) => {
        if (params.data?.row.kind === "object") {
          return undefined;
        }
        return params.data?.row.curvatureRadius;
      },
    },
    {
      headerName: "Var.",
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.radiusSurfaceIndex === undefined) {
          return undefined;
        }

        const mode = radiusModes.find((entry) => entry.surfaceIndex === params.data.radiusSurfaceIndex);
        return (
          <SetButton
            isSet={mode?.mode !== "constant"}
            onClick={() => onOpenRadiusModal(params.data.radiusSurfaceIndex!)}
            aria-label={`Radius mode for surface ${params.data.radiusSurfaceIndex}`}
            setLabel="Edit"
            unsetLabel="Set"
          />
        );
      },
    },
    {
      headerName: "Thickness",
      valueGetter: (params) => {
        if (params.data?.row.kind === "object") {
          return params.data.row.objectDistance;
        }
        if (params.data?.row.kind === "image") {
          return undefined;
        }
        return params.data?.row.thickness;
      },
    },
    {
      headerName: "Var.",
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.thicknessSurfaceIndex === undefined) {
          return undefined;
        }

        const mode = thicknessModes.find((entry) => entry.surfaceIndex === params.data.thicknessSurfaceIndex);
        return (
          <SetButton
            isSet={mode?.mode !== "constant"}
            onClick={() => onOpenThicknessModal(params.data.thicknessSurfaceIndex!)}
            aria-label={`Thickness mode for surface ${params.data.thicknessSurfaceIndex}`}
            setLabel="Edit"
            unsetLabel="Set"
          />
        );
      },
    },
    {
      headerName: "Medium",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind === "image") {
          return undefined;
        }

        return params.data.row.medium;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind === "image") {
          return undefined;
        }

        return (
          <ActionWrapper onAction={() => onOpenMediumModal(params.data.row)}>
            <OptimizationMediumCell
              medium={params.data.row.medium}
              onOpenModal={() => onOpenMediumModal(params.data.row)}
            />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Semi-diam.",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") {
          return undefined;
        }

        return params.data.row.semiDiameter;
      },
    },
    {
      headerName: "Asph.",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") {
          return undefined;
        }

        return params.data.row.aspherical;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind !== "surface") {
          return undefined;
        }

        return (
          <ActionWrapper onAction={() => onOpenAsphericalModal(params.data.row)}>
            <OptimizationAsphericalCell
              isAspherical={params.data.row.aspherical !== undefined}
              onOpenModal={() => onOpenAsphericalModal(params.data.row)}
            />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Tilt & Decenter",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind === "object") {
          return undefined;
        }

        return params.data.row.decenter;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind === "object") {
          return undefined;
        }

        return (
          <ActionWrapper onAction={() => onOpenDecenterModal(params.data.row)}>
            <DecenterCell isDecenterSet={params.data.row.decenter !== undefined} onOpenModal={() => onOpenDecenterModal(params.data.row)} />
          </ActionWrapper>
        );
      },
    },
    {
      headerName: "Diffraction Grating",
      valueGetter: (params) => {
        if (!params.data || params.data.row.kind !== "surface") {
          return undefined;
        }

        return params.data.row.diffractionGrating;
      },
      cellRenderer: (params: { data: RadiusRow }) => {
        if (params.data.row.kind !== "surface") {
          return undefined;
        }

        return (
          <ActionWrapper onAction={() => onOpenDiffractionGratingModal(params.data.row)}>
            <OptimizationDiffractionGratingCell
              isDiffractionGratingSet={params.data.row.diffractionGrating !== undefined}
              onOpenModal={() => onOpenDiffractionGratingModal(params.data.row)}
            />
          </ActionWrapper>
        );
      },
    },
  ], [
    onOpenAsphericalModal,
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
        <AgGridReact theme={gridTheme} rowData={[...rows]} columnDefs={lensColumns} domLayout="autoHeight" />
      </AgGridProvider>
    </div>
  );
}
