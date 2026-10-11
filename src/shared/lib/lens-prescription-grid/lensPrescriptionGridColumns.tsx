"use client";
/**
 * In read-only auto mode the semi-diameter column shows its computed ID-keyed value or the manual fallback, including rectangular clear apertures. Manual mode continues to blank rectangular cells.
 *
 * @remarks
 * Shared column and AG Grid configuration for lens prescription grids.
 *
 * ## Design
 *
 * Builders accept `getGridRow(data)` so feature grids can adapt their own row model to `GridRow` without coupling `shared/` to feature state. Modal and edit behavior is injected through optional callbacks. When edit callbacks are omitted, numeric and select columns remain read-only.
 *
 * `LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS` (defined in `columnWidths.ts` and re-exported here) is the shared source for the `Surface`, `Comment`, `Index`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths used by Lens Editor and Optimization. `lensPrescriptionGridIndexColumnDef` applies the `index` width and pins the `Index` column to the left; feature grids spread it into their local read-only `Index` column before adding their feature-specific value getter. The inline columns apply their own widths; each modal-backed property column takes its width from its UI descriptor.
 *
 * `createLensPrescriptionCommonColumns` returns the common column order used by the Lens Editor: Surface, Comment, Radius, Thickness, Medium, Semi-diam., then the remaining modal-backed property columns in registry order. Optimization uses the individual builders so its local `Var.` columns can stay interleaved after Radius, Thickness, Asph., and Tilt & Decenter.
 *
 * Modal-backed surface properties (`Medium`, `Aperture`, `Asph.`, `Tilt & Decenter`, `Diffraction Grating`) are built by `createSurfacePropertyColumn(key, options)` from their UI descriptors in `SURFACE_PROPERTY_UIS`: header, width, value getter, the shared `SurfacePropertyCell` label and accessible name, and the editing (default) or inspection (`propertyTooltip: "view"`) tooltip. Rows a property does not apply to stay blank, and the action cell is rendered only when `onOpenPropertyModal(key, row)` is supplied. Aperture labels display `Default` only for default/omitted edge aperture plus omitted or centered circular clear aperture; otherwise they show compact clear aperture details, including Ronchi density/transform information, and append explicit circular edge aperture details. The other cells display the medium name, `None`, asphere type labels, decenter strategy values, or diffraction grating `lp/mm` labels.
 *
 * `createSemiDiameterColumn` renders a blank value and is non-editable for surface rows whose clear aperture is rectangular, because rectangular clear apertures carry their own half-length and half-width instead of using `semiDiameter`.
 */

import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS } from "@/shared/lib/lens-prescription-grid/columnWidths";
import {
  LensPrescriptionActionWrapper,
  SurfacePropertyCell,
} from "@/shared/lib/lens-prescription-grid/LensPrescriptionGridCells";
import {
  SURFACE_PROPERTY_UI_KEYS,
  SURFACE_PROPERTY_UIS,
  type SurfacePropertyUiKey,
} from "@/shared/lib/optical-model/surface-properties/registry.ui";
import type { SurfacePropertyUi } from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

export { LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS };

/** Shared resizable, non-sortable prescription grid defaults. */
export const lensPrescriptionGridDefaultColDef = {
  sortable: false,
  suppressMovable: true,
} satisfies ColDef;

/** Pinned row-index column shared by prescription grids. */
export const lensPrescriptionGridIndexColumnDef = {
  headerName: "Index",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.index,
  pinned: "left",
} satisfies ColDef;

const VALID_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/** Parses a finite numeric edit and otherwise preserves the old value. */
export function numberValueParser(params: {
  readonly newValue: string;
  readonly oldValue: unknown;
}) {
  const raw = String(params.newValue ?? "").trim();
  if (raw === "" || !VALID_NUMBER.test(raw)) return params.oldValue;
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : params.oldValue;
}

type GridRowAccessor<TData> = (data: TData) => GridRow;

interface BaseColumnOptions<TData> {
  readonly getGridRow: GridRowAccessor<TData>;
}

interface SurfaceColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onSurfaceLabelChange?: (
    row: GridRow,
    label: "Default" | "Stop",
  ) => void;
}

interface CommentColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onCommentChange?: (row: GridRow, comment: string) => void;
}

interface RadiusColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onRadiusChange?: (row: GridRow, curvatureRadius: number) => void;
}

interface ThicknessColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onThicknessChange?: (row: GridRow, thickness: number) => void;
}

interface SemiDiameterColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly semiDiameterReadonly?: boolean;
  readonly computedSemiDiameters?: Readonly<Record<string, number>>;
  readonly onSemiDiameterChange?: (row: GridRow, semiDiameter: number) => void;
}

/** Opens the modal of one modal-backed surface property for a row. */
type SurfacePropertyModalCallback = (
  key: SurfacePropertyUiKey,
  row: GridRow,
) => void;

interface SurfacePropertyColumnOptions<TData> extends BaseColumnOptions<TData> {
  /** Opens the property's modal; when omitted the column shows no action cell. */
  readonly onOpenPropertyModal?: SurfacePropertyModalCallback;
  /** Chooses the descriptor's editing (default) or inspection tooltip. */
  readonly propertyTooltip?: "edit" | "view";
}

/** Creates the shared surface-label column. */
export function createSurfaceColumn<TData>({
  getGridRow,
  onSurfaceLabelChange,
}: SurfaceColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Surface",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.surface,
    valueGetter: (params) => {
      if (params.data === undefined) return "";
      const row = getGridRow(params.data);
      if (row.kind === "object") return "Object";
      if (row.kind === "image") return "Image";
      return row.label;
    },
    editable: (params) => {
      if (params.data === undefined || onSurfaceLabelChange === undefined)
        return false;
      return getGridRow(params.data).kind === "surface";
    },
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: ["Default", "Stop"] },
    valueSetter: (params) => {
      if (params.data === undefined || onSurfaceLabelChange === undefined)
        return false;
      onSurfaceLabelChange(
        getGridRow(params.data),
        params.newValue as "Default" | "Stop",
      );
      return true;
    },
  };
}

/** Creates the optional surface-comment column; Object and Image are always blank and read-only. */
export function createCommentColumn<TData>({
  getGridRow,
  onCommentChange,
}: CommentColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Comment",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.comment,
    valueGetter: (params) => {
      if (params.data === undefined) return "";
      const row = getGridRow(params.data);
      return row.kind === "surface" ? (row.comment ?? "") : "";
    },
    editable: (params) => {
      if (params.data === undefined || onCommentChange === undefined)
        return false;
      return getGridRow(params.data).kind === "surface";
    },
    cellEditor: "agTextCellEditor",
    valueSetter: (params) => {
      if (params.data === undefined || onCommentChange === undefined)
        return false;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return false;
      onCommentChange(row, String(params.newValue ?? ""));
      return true;
    },
  };
}

/** Creates the editable or mode-aware radius column. */
export function createRadiusOfCurvatureColumn<TData>({
  getGridRow,
  onRadiusChange,
}: RadiusColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Radius of Curvature",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.radiusOfCurvature,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "object") return undefined;
      return row.curvatureRadius;
    },
    editable: (params) => {
      if (params.data === undefined || onRadiusChange === undefined)
        return false;
      return getGridRow(params.data).kind !== "object";
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onRadiusChange === undefined)
        return false;
      onRadiusChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

/** Creates the editable or mode-aware thickness column. */
export function createThicknessColumn<TData>({
  getGridRow,
  onThicknessChange,
}: ThicknessColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Thickness",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.thickness,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "object") return row.objectDistance;
      if (row.kind === "image") return undefined;
      return row.thickness;
    },
    editable: (params) => {
      if (params.data === undefined || onThicknessChange === undefined)
        return false;
      return getGridRow(params.data).kind !== "image";
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onThicknessChange === undefined)
        return false;
      onThicknessChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

/** Creates the semi-diameter column with auto-aperture presentation. */
export function createSemiDiameterColumn<TData>({
  getGridRow,
  semiDiameterReadonly = false,
  computedSemiDiameters = {},
  onSemiDiameterChange,
}: SemiDiameterColumnOptions<TData>): ColDef<TData> {
  const isRectangularClearApertureRow = (row: GridRow): boolean =>
    row.kind === "surface" && row.clear_aperture?.shape === "rectangular";

  return {
    headerName: "Semi-diam.",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.semiDiameter,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      if (semiDiameterReadonly)
        return computedSemiDiameters[row.id] ?? row.semiDiameter;
      if (isRectangularClearApertureRow(row)) return undefined;
      return row.semiDiameter;
    },
    editable: (params) => {
      if (
        params.data === undefined ||
        onSemiDiameterChange === undefined ||
        semiDiameterReadonly
      )
        return false;
      const row = getGridRow(params.data);
      return row.kind === "surface" && !isRectangularClearApertureRow(row);
    },
    cellStyle: (params) => {
      if (params.data === undefined) return { opacity: 0.5 };
      const row = getGridRow(params.data);
      return !semiDiameterReadonly &&
        row.kind === "surface" &&
        !isRectangularClearApertureRow(row)
        ? undefined
        : { opacity: 0.5 };
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onSemiDiameterChange === undefined)
        return false;
      onSemiDiameterChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

/**
 * Creates the display/action column of one modal-backed surface property from
 * its UI descriptor: header, width, value getter, label, accessible name, and
 * tooltip. Rows the property does not apply to stay blank.
 */
export function createSurfacePropertyColumn<TData>(
  key: SurfacePropertyUiKey,
  {
    getGridRow,
    onOpenPropertyModal,
    propertyTooltip = "edit",
  }: SurfacePropertyColumnOptions<TData>,
): ColDef<TData> {
  const ui: SurfacePropertyUi = SURFACE_PROPERTY_UIS[key];
  return {
    headerName: ui.headerName,
    width: ui.width,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      return ui.appliesTo(row) ? ui.cellValue(row) : undefined;
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenPropertyModal === undefined)
        return undefined;
      const row = getGridRow(params.data);
      if (!ui.appliesTo(row)) return undefined;
      const openModal = () => onOpenPropertyModal(key, row);
      return (
        <LensPrescriptionActionWrapper onAction={openModal}>
          <SurfacePropertyCell
            label={ui.formatLabel(row)}
            ariaLabel={ui.ariaLabel}
            tooltipText={
              propertyTooltip === "view" ? ui.viewTooltip : ui.editTooltip
            }
            onOpenModal={openModal}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

interface CommonColumnOptions<TData>
  extends SurfaceColumnOptions<TData>,
    CommentColumnOptions<TData>,
    RadiusColumnOptions<TData>,
    ThicknessColumnOptions<TData>,
    SemiDiameterColumnOptions<TData>,
    SurfacePropertyColumnOptions<TData> {}

/**
 * Creates the complete shared prescription-column set for a grid consumer:
 * Surface, Comment, Radius, Thickness, Medium, Semi-diam., then every other
 * modal-backed surface property in `SURFACE_PROPERTY_UIS` order.
 */
export function createLensPrescriptionCommonColumns<TData>(
  options: CommonColumnOptions<TData>,
): ColDef<TData>[] {
  return [
    createSurfaceColumn(options),
    createCommentColumn(options),
    createRadiusOfCurvatureColumn(options),
    createThicknessColumn(options),
    createSurfacePropertyColumn("medium", options),
    createSemiDiameterColumn(options),
    ...SURFACE_PROPERTY_UI_KEYS.filter((key) => key !== "medium").map((key) =>
      createSurfacePropertyColumn(key, options),
    ),
  ];
}
