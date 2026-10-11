"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { GlassMode } from "@/features/optimization/stores/optimizationStore";
import {
  summarizeParameterState,
  type ParameterGroupState,
  type ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";
import {
  PARAMETER_GROUP_KEYS,
  type ParameterGroupKey,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  PARAMETER_MODE_UI,
  type VarColumnAnchor,
} from "@/features/optimization/components/ParameterModeModal/parameterModeUi";
import type { RadiusRow } from "@/features/optimization/lib/optimizationViewModels";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { SurfacePropertyUiKey } from "@/shared/lib/optical-model/surface-properties/registry.ui";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import {
  createCommentColumn,
  createRadiusOfCurvatureColumn,
  createSemiDiameterColumn,
  createSurfacePropertyColumn,
  createSurfaceColumn,
  createThicknessColumn,
  LensPrescriptionActionWrapper,
  lensPrescriptionGridDefaultColDef,
  lensPrescriptionGridIndexColumnDef,
} from "@/shared/lib/lens-prescription-grid";

const OPTIMIZATION_VAR_COLUMN_WIDTH = 60;

function getGlassModeLabel(mode: GlassMode["mode"] | undefined): string {
  return mode === "variable" ? "V" : "C";
}

function getGlassSurfaceIndex(row: RadiusRow): number | undefined {
  if (row.row.kind === "object") {
    return 0;
  }
  if (row.row.kind === "surface") {
    return row.thicknessSurfaceIndex ?? row.radiusSurfaceIndex;
  }
  return undefined;
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
  /** Constant/variable/pickup states of every constructional-parameter group. */
  readonly parameterStates: ParameterStates;
  /** Whether the selected optimizer exposes categorical glass modes. */
  readonly canOptimizeGlass?: boolean;
  /** Constant or explicit-pool mode for Object gap 0 and physical gaps 1..N. */
  readonly glassModes?: ReadonlyArray<GlassMode>;
  /** Opens a parameter group's variable/pickup modal for a surface. */
  readonly onOpenParameterModal: (
    group: ParameterGroupKey,
    surfaceIndex: number,
  ) => void;
  readonly onOpenGlassModal?: (surfaceIndex: number) => void;
  /** Opens the read-only inspection modal of a modal-backed surface property for a row. */
  readonly onOpenPropertyModal: (
    key: SurfacePropertyUiKey,
    row: GridRow,
  ) => void;
  readonly onCellEditingStarted?: () => void;
  readonly onCellEditingStopped?: () => void;
}

/**
 * Renders the optimization lens prescription grid, including a read-only surface `Index` column, radius/thickness variable buttons, the conditional Glass Expert variable button, asphere variable/pickup button, and read-only inspection cells that open existing lens-editor dialogs.
 *
 * - Exports `OptimizationLensPrescriptionGridProps` so the component directory barrels can expose the grid's public prop type without widening the `LensPrescriptionGrid` public surface.
 * - Accepts an optional `autoAperture` prop (default `false`) and passes it to the shared semi-diameter column as its read-only mode. Auto mode displays each effective model `semiDiameter`, including rectangular-aperture surfaces; manual mode keeps editable/manual values and the existing blank rectangular-aperture cell behavior.
 * - Uses a horizontal-overflow wrapper for the wide prescription table and relies on parent layout padding instead of adding its own outer `p-4`.
 * - Uses AG Grid's normal layout so the grid owns vertical row scrolling. Below `1440px` the wrapper height is `calc(100vh - 160px)`; at `1440px` and above it fills the drawer panel with a `200px` minimum height.
 * - Memoizes row data by `rows` and uses each `RadiusRow.id` as AG Grid's row ID to preserve the mounted grid's vertical scroll position when radius, thickness, asphere, tilt/decenter, or glass modes change. Scroll position is not persisted across navigation or reload.
 * - Keeps AG Grid's native touch handling enabled so resizable header handles respond to touchscreen drags. The shared `ag-grid-touch-scroll` coarse-pointer styles continue to provide native horizontal and vertical panning, iOS momentum scrolling, and scroll chaining on viewport areas; AG Grid owns gestures that begin on resize handles.
 * - Applies the shared `lensPrescriptionGridDefaultColDef` (`{ sortable: false, suppressMovable: true }`) so the prescription columns stay in their prescribed order across the Optimization tabs.
 * - Uses `EditableAgGridReact`, matching the other editable AG Grid surfaces so any future editable prescription cells commit pending edits when editing stops.
 * - Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact`, even though current prescription cells are read-only, so the page-level Optimize gate remains wired if prescription cells become editable later.
 * - Composes common prescription columns from `shared/lib/lens-prescription-grid` with `getGridRow: (data) => data.row`; optimization-only columns remain local.
 * - Builds the read-only `Medium`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` inspection columns with `createSurfacePropertyColumn(key, { propertyTooltip: "view" })`, so their cells say `Click to view ...` and open `onOpenPropertyModal(key, row)`.
 * - Prepends an `Index` column before `Surface`; it is blank for `Object` and `Image`, shows `1..N` for real surface rows using the existing optimization surface numbering, and uses the shared lens prescription grid `Index` config so it has the shared initial width and is pinned left.
 * - The `Index`, `Surface`, `Comment`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths come from `shared/lib/lens-prescription-grid`. Comment is displayed for physical surfaces but remains entirely read-only because Optimization supplies no change callback; Object and Image stay blank.
 * - Generates one `Var.` column per parameter group from `PARAMETER_MODE_UI`, placed after the group's anchor column: radius after `Radius of Curvature`, thickness after `Thickness`, asphere after `Asph.` (real surface rows only), and tilt/decenter after `Tilt & Decenter` (numbered surfaces and Image). Each cell uses the same `ActionWrapper` plus Tooltip-wrapped native `<button>` pattern as `Medium`; clicking the button or the cell body calls `onOpenParameterModal(group, surfaceIndex)`. The Tooltip trigger fills the cell action area. The accessible name is `<noun> mode for surface <n>`, and the label is `summarizeParameterState(state)`: `C` when no stored mode is variable or pickup, otherwise `V`, `P`, or `V,P`.
 * - When `canOptimizeGlass` is true, inserts a fourth `Var.` column immediately after `Medium`. It renders `C`/`V` controls for Object gap `0` and every physical surface gap `1..N`; Image is blank. The column is omitted entirely for existing optimizers.
 * - Sets all optimization `Var.` columns to a narrow `60px` initial width sized for the `Var.` header text, while leaving them otherwise resizable by AG Grid defaults.
 */
export function OptimizationLensPrescriptionGrid({
  autoAperture = false,
  rows,
  parameterStates,
  canOptimizeGlass = false,
  glassModes = [],
  onOpenParameterModal,
  onOpenGlassModal,
  onOpenPropertyModal,
  onCellEditingStarted,
  onCellEditingStopped,
}: OptimizationLensPrescriptionGridProps) {
  const gridTheme = useAgGridTheme();
  const rowData = useMemo(() => [...rows], [rows]);

  const lensColumns = useMemo<ColDef<RadiusRow>[]>(() => {
    /** `Var.` columns of every parameter group placed after `anchor`. */
    const varColumnsAfter = (anchor: VarColumnAnchor): ColDef<RadiusRow>[] =>
      PARAMETER_GROUP_KEYS.filter(
        (group) => PARAMETER_MODE_UI[group].varColumn.after === anchor,
      ).map((group) => {
        const { varColumn } = PARAMETER_MODE_UI[group];
        return {
          headerName: "Var.",
          width: OPTIMIZATION_VAR_COLUMN_WIDTH,
          cellRenderer: (params: { data: RadiusRow }) => {
            const surfaceIndex = varColumn.surfaceIndexOf(params.data);
            if (surfaceIndex === undefined) {
              return undefined;
            }
            const state = (
              parameterStates[group] as ReadonlyArray<ParameterGroupState>
            ).find((entry) => entry.surfaceIndex === surfaceIndex);
            const openModal = () => onOpenParameterModal(group, surfaceIndex);
            return (
              <LensPrescriptionActionWrapper onAction={openModal}>
                <Tooltip
                  text={varColumn.tooltip}
                  position="top"
                  portal
                  noTouch
                  triggerClassName="flex h-full w-full"
                >
                  <OptimizationVariableModeCell
                    label={summarizeParameterState(state)}
                    ariaLabel={`${varColumn.ariaNoun} mode for surface ${surfaceIndex}`}
                    onOpenModal={openModal}
                  />
                </Tooltip>
              </LensPrescriptionActionWrapper>
            );
          },
        } satisfies ColDef<RadiusRow>;
      });

    return [
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
      createCommentColumn<RadiusRow>({ getGridRow: (data) => data.row }),
      createRadiusOfCurvatureColumn<RadiusRow>({
        getGridRow: (data) => data.row,
      }),
      ...varColumnsAfter("radiusOfCurvature"),
      createThicknessColumn<RadiusRow>({ getGridRow: (data) => data.row }),
      ...varColumnsAfter("thickness"),
      createSurfacePropertyColumn<RadiusRow>("medium", {
        getGridRow: (data) => data.row,
        onOpenPropertyModal,
        propertyTooltip: "view",
      }),
      ...(canOptimizeGlass
        ? [
            {
              headerName: "Var.",
              width: OPTIMIZATION_VAR_COLUMN_WIDTH,
              cellRenderer: (params: { data: RadiusRow }) => {
                const surfaceIndex = getGlassSurfaceIndex(params.data);
                if (
                  surfaceIndex === undefined ||
                  onOpenGlassModal === undefined
                ) {
                  return undefined;
                }

                const mode = glassModes.find(
                  (entry) => entry.surfaceIndex === surfaceIndex,
                );
                const targetLabel =
                  surfaceIndex === 0 ? "Object" : `surface ${surfaceIndex}`;
                return (
                  <LensPrescriptionActionWrapper
                    onAction={() => onOpenGlassModal(surfaceIndex)}
                  >
                    <Tooltip
                      text="Click to configure glass candidates"
                      position="top"
                      portal
                      noTouch
                      triggerClassName="flex h-full w-full"
                    >
                      <OptimizationVariableModeCell
                        label={getGlassModeLabel(mode?.mode)}
                        ariaLabel={`Glass mode for ${targetLabel}`}
                        onOpenModal={() => onOpenGlassModal(surfaceIndex)}
                      />
                    </Tooltip>
                  </LensPrescriptionActionWrapper>
                );
              },
            } satisfies ColDef<RadiusRow>,
          ]
        : []),
      createSemiDiameterColumn<RadiusRow>({
        getGridRow: (data) => data.row,
        semiDiameterReadonly: autoAperture,
      }),
      createSurfacePropertyColumn<RadiusRow>("aperture", {
        getGridRow: (data) => data.row,
        onOpenPropertyModal,
        propertyTooltip: "view",
      }),
      createSurfacePropertyColumn<RadiusRow>("aspherical", {
        getGridRow: (data) => data.row,
        onOpenPropertyModal,
        propertyTooltip: "view",
      }),
      ...varColumnsAfter("aspherical"),
      createSurfacePropertyColumn<RadiusRow>("decenter", {
        getGridRow: (data) => data.row,
        onOpenPropertyModal,
        propertyTooltip: "view",
      }),
      ...varColumnsAfter("decenter"),
      createSurfacePropertyColumn<RadiusRow>("diffractiveElement", {
        getGridRow: (data) => data.row,
        onOpenPropertyModal,
        propertyTooltip: "view",
      }),
    ];
  }, [
    autoAperture,
    canOptimizeGlass,
    glassModes,
    onOpenGlassModal,
    onOpenParameterModal,
    onOpenPropertyModal,
    parameterStates,
  ]);

  return (
    <div
      data-testid="optimization-lens-prescription-grid"
      className="ag-grid-touch-scroll h-[calc(100vh-160px)] overflow-x-auto min-[1440px]:h-full min-[1440px]:min-h-[200px]"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<RadiusRow>
          theme={gridTheme}
          rowData={rowData}
          columnDefs={lensColumns}
          getRowId={(params) => params.data.id}
          defaultColDef={lensPrescriptionGridDefaultColDef}
          domLayout="normal"
          onCellEditingStarted={onCellEditingStarted}
          onCellEditingStopped={onCellEditingStopped}
        />
      </AgGridProvider>
    </div>
  );
}
