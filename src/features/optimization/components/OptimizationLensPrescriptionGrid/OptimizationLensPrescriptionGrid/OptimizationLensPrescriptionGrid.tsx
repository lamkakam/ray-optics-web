"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { RadiusMode, AsphereOptimizationState } from "@/features/optimization/stores/optimizationStore";
import type { RadiusRow } from "@/features/optimization/lib/optimizationViewModels";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import {
  createAsphericalColumn,
  createApertureColumn,
  createDecenterColumn,
  createDiffractionGratingColumn,
  createMediumColumn,
  createRadiusOfCurvatureColumn,
  createSemiDiameterColumn,
  createSurfaceColumn,
  createThicknessColumn,
  LensPrescriptionActionWrapper,
  lensPrescriptionGridDefaultColDef,
  lensPrescriptionGridIndexColumnDef,
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

/** Rows and edit callbacks for the optimization prescription grid. */
export interface OptimizationLensPrescriptionGridProps {
  readonly autoAperture?: boolean;
  readonly rows: ReadonlyArray<RadiusRow>;
  readonly radiusModes: ReadonlyArray<RadiusMode>;
  readonly thicknessModes: ReadonlyArray<RadiusMode>;
  readonly asphereStates: ReadonlyArray<AsphereOptimizationState>;
  readonly onOpenRadiusModal: (surfaceIndex: number) => void;
  readonly onOpenThicknessModal: (surfaceIndex: number) => void;
  readonly onOpenMediumModal: (row: GridRow) => void;
  readonly onOpenAsphericalModal: (row: GridRow) => void;
  readonly onOpenApertureModal: (row: GridRow) => void;
  readonly onOpenAsphereVarModal: (surfaceIndex: number) => void;
  readonly onOpenDecenterModal: (row: GridRow) => void;
  readonly onOpenDiffractionGratingModal: (row: GridRow) => void;
  readonly onCellEditingStarted?: () => void;
  readonly onCellEditingStopped?: () => void;
}

/**
 * Renders the optimization lens prescription grid, including a read-only surface `Index` column, radius/thickness variable buttons, asphere variable/pickup button, and read-only inspection cells that open existing lens-editor dialogs.
 *
 * - Exports `OptimizationLensPrescriptionGridProps` so the component directory barrels can expose the grid's public prop type without widening the `LensPrescriptionGrid` public surface.
 * - Accepts an optional `autoAperture` prop (default `false`) and passes it to the shared semi-diameter column as its read-only mode. Auto mode displays each effective model `semiDiameter`, including rectangular-aperture surfaces; manual mode keeps editable/manual values and the existing blank rectangular-aperture cell behavior.
 * - Uses a horizontal-overflow wrapper for the wide prescription table and relies on parent layout padding instead of adding its own outer `p-4`.
 * - Uses AG Grid's normal layout so the grid owns vertical row scrolling. Below `1440px` the wrapper height is `calc(100vh - 160px)`; at `1440px` and above it fills the drawer panel with a `200px` minimum height.
 * - Keeps AG Grid's native touch handling enabled so resizable header handles respond to touchscreen drags. The shared `ag-grid-touch-scroll` coarse-pointer styles continue to provide native horizontal and vertical panning, iOS momentum scrolling, and scroll chaining on viewport areas; AG Grid owns gestures that begin on resize handles.
 * - Applies the shared `lensPrescriptionGridDefaultColDef` (`{ sortable: false, suppressMovable: true }`) so the prescription columns stay in their prescribed order across the Optimization tabs.
 * - Uses `EditableAgGridReact`, matching the other editable AG Grid surfaces so any future editable prescription cells commit pending edits when editing stops.
 * - Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact`, even though current prescription cells are read-only, so the page-level Optimize gate remains wired if prescription cells become editable later.
 * - Composes common prescription columns from `shared/lib/lens-prescription-grid` with `getGridRow: (data) => data.row`; optimization-only columns remain local.
 * - Passes optimization-specific tooltip copy for the read-only `Medium`, `Asph.`, and `Diffraction Grating` inspection cells so they say `Click to view ...` without changing the editor page grid.
 * - Prepends an `Index` column before `Surface`; it is blank for `Object` and `Image`, shows `1..N` for real surface rows using the existing optimization surface numbering, and uses the shared lens prescription grid `Index` config so it has the shared initial width and is pinned left.
 * - The `Index`, `Surface`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths come from `shared/lib/lens-prescription-grid`.
 * - The radius and thickness `Var.` cells use the same `ActionWrapper` plus Tooltip-wrapped native `<button>` pattern as `Medium`; clicking either the button or the surrounding cell body opens the corresponding optimization modal for the surface. Their Tooltip trigger fills the cell action wrapper so hovering anywhere in the cell action area displays the tooltip. The buttons show the saved optimization mode as `C` for missing or `constant` modes, `V` for `variable`, and `P` for `pickup`.
 * - Adds a `Var.` column after `Asph.` for configuring asphere variable/pickup optimization targets; shown only for real surface rows. The button summarizes all saved asphere term modes as `C` when the asphere state is missing or every term is `constant`, `V` when any term is variable-only, `P` when any term is pickup-only, and `V,P` when variable and pickup terms are both present. Requires `asphereStates` and `onOpenAsphereVarModal` props.
 * - Sets the three optimization `Var.` columns to a narrow `60px` initial width sized for the `Var.` header text, while leaving them otherwise resizable by AG Grid defaults.
 * - Uses shared text action cells for non-optimization-mode inspection cells such as `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating`; those cells show aperture defaults or circular radius labels, `None`, asphere type labels, decenter strategy values, or diffraction grating `lp/mm` labels while preserving the read-only modal callbacks.
 */
export function OptimizationLensPrescriptionGrid({
  autoAperture = false,
  rows,
  radiusModes,
  thicknessModes,
  asphereStates,
  onOpenRadiusModal,
  onOpenThicknessModal,
  onOpenMediumModal,
  onOpenAsphericalModal,
  onOpenApertureModal,
  onOpenAsphereVarModal,
  onOpenDecenterModal,
  onOpenDiffractionGratingModal,
  onCellEditingStarted,
  onCellEditingStopped,
}: OptimizationLensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();

  const lensColumns = useMemo<ColDef<RadiusRow>[]>(() => [
    {
      ...lensPrescriptionGridIndexColumnDef,
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
    createSemiDiameterColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      semiDiameterReadonly: autoAperture,
    }),
    createApertureColumn<RadiusRow>({
      getGridRow: (data) => data.row,
      onOpenApertureModal,
      tooltipText: "Click to view aperture",
    }),
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
    autoAperture,
    asphereStates,
    onOpenAsphericalModal,
    onOpenApertureModal,
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
    <div
      data-testid="optimization-lens-prescription-grid"
      className="ag-grid-touch-scroll h-[calc(100vh-160px)] overflow-x-auto min-[1440px]:h-full min-[1440px]:min-h-[200px]"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<RadiusRow>
          theme={gridTheme}
          rowData={[...rows]}
          columnDefs={lensColumns}
          defaultColDef={lensPrescriptionGridDefaultColDef}
          domLayout="normal"
          onCellEditingStarted={onCellEditingStarted}
          onCellEditingStopped={onCellEditingStopped}
        />
      </AgGridProvider>
    </div>
  );
}
