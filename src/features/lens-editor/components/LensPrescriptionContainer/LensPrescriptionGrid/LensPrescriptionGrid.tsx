"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { GridRowButtons } from "../GridRowButtons";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import type { SurfacePropertyUiKey } from "@/shared/lib/optical-model/surface-properties/registry.ui";
import {
  createLensPrescriptionCommonColumns,
  lensPrescriptionGridDefaultColDef,
  lensPrescriptionGridIndexColumnDef,
} from "@/shared/lib/lens-prescription-grid";

interface LensPrescriptionGridProps {
  /** Flat array of grid rows from the lens editor store */
  readonly rows: GridRow[];
  /** Partial update for a row field */
  readonly onRowChange: (id: string, patch: Partial<GridRow>) => void;
  /** Opens the modal of a modal-backed surface property (medium, aperture, asphere, decenter, diffraction grating) for the given row */
  readonly onOpenPropertyModal: (
    key: SurfacePropertyUiKey,
    rowId: string,
  ) => void;
  /** Inserts a new surface row after the given row */
  readonly onAddRowAfter: (rowId: string) => void;
  /** Deletes the given surface row */
  readonly onDeleteRow: (rowId: string) => void;
  /** When `true`, semi-diameter column is read-only and dimmed (auto-aperture mode) */
  readonly semiDiameterReadonly?: boolean;
  readonly computedSemiDiameters?: Readonly<Record<string, number>>;
}

/**
 * AG Grid table for editing the lens prescription. Displays and edits surface rows (object, surface, image) with columns for surface index, surface label, optional physical-surface comment, radius of curvature, thickness, medium, semi-diameter, aspherical, tilt/decenter, and diffraction grating. Row action buttons appear in a leading column.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Column definitions are memoized with `useMemo` over the callback props to avoid unnecessary AG Grid re-renders.
 * - The leading row action column remains editor-specific.
 * - A read-only `Index` column appears immediately after the leading row action column and before `Surface`; it is pinned left through the shared lens prescription grid `Index` column config.
 * - The `Index` column is display-only. It derives continuous one-based numbering from the current `rows` order, counting only `surface` rows; Object and Image rows render blank index cells.
 * - Common prescription columns are composed from `shared/lib/lens-prescription-grid` so Lens Editor and Optimization use the same value getters, numeric parsing, cell renderers, and AG Grid defaults.
 * - The `Index`, `Surface`, `Comment`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths come from `shared/lib/lens-prescription-grid`; the leading row action column remains editor-specific at `100px`. Comment uses AG Grid's text editor only for physical surfaces; Object and Image stay blank.
 * - Modal-backed surface properties (medium, aperture, asphere, tilt/decenter, diffraction grating) render the shared `SurfacePropertyCell` inside `LensPrescriptionActionWrapper`, which opens the modal through `onOpenPropertyModal(key, rowId)` when the non-interactive cell body is clicked. Labels come from each property's UI descriptor (`None`, asphere type labels, decenter strategy values, and `${lpmm} lp/mm`).
 * - The Medium column renders for the Object row and all surface rows; the Image row remains blank in that column.
 * - Only surface-kind rows get a delete button; object/image rows only get an add button or neither.
 * - The diffraction grating column renders only for `surface` rows.
 * - The aperture column renders immediately after `Semi-diam.` and only for `surface` rows.
 * - Number parsing rejects non-numeric input and restores the old value.
 * - Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending numeric cell edits are committed before another grid action such as opening a modal or inserting/deleting a row is handled.
 * - Applies shared AG Grid column config with `defaultColDef={{ sortable: false, suppressMovable: true }}` and AG Grid's normal layout so the grid owns vertical row scrolling.
 * - Keeps AG Grid's native touch handling enabled so resizable header handles respond to touchscreen drags. The shared `ag-grid-touch-scroll` coarse-pointer styles continue to provide native horizontal and vertical panning, iOS momentum scrolling, and scroll chaining on viewport areas; AG Grid owns gestures that begin on resize handles.
 * - Uses `h-[calc(100vh-160px)]` below `1440px`; at `1440px` and above it fills the remaining flex-column drawer-panel height with a `200px` minimum.
 */
export function LensPrescriptionGrid({
  rows,
  onRowChange,
  onOpenPropertyModal,
  onAddRowAfter,
  onDeleteRow,
  semiDiameterReadonly = false,
  computedSemiDiameters = {},
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

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
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
          if (params.data?.kind !== "surface") {
            return undefined;
          }

          return surfaceIndexByRowId.get(params.data.id);
        },
      },
      ...createLensPrescriptionCommonColumns<GridRow>({
        getGridRow: (row) => row,
        onSurfaceLabelChange: (row, label) => onRowChange(row.id, { label }),
        onCommentChange: (row, comment) => onRowChange(row.id, { comment }),
        onRadiusChange: (row, curvatureRadius) =>
          onRowChange(row.id, { curvatureRadius }),
        onThicknessChange: (row, thickness) => {
          if (row.kind === "object") {
            onRowChange(row.id, { objectDistance: thickness });
          } else {
            onRowChange(row.id, { thickness });
          }
        },
        onSemiDiameterChange: (row, semiDiameter) =>
          onRowChange(row.id, { semiDiameter }),
        semiDiameterReadonly,
        computedSemiDiameters,
        onOpenPropertyModal: (key, row) => onOpenPropertyModal(key, row.id),
      }),
    ],
    [
      surfaceIndexByRowId,
      semiDiameterReadonly,
      computedSemiDiameters,
      onRowChange,
      onOpenPropertyModal,
      onAddRowAfter,
      onDeleteRow,
    ],
  );

  return (
    <section
      aria-label="Lens prescription editor"
      className="ag-grid-touch-scroll h-[calc(100vh-160px)] min-[1440px]:min-h-[200px] min-[1440px]:flex-1"
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
    </section>
  );
}
