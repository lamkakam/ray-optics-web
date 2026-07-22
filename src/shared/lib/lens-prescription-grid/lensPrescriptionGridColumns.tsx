/**
# `shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx`

In read-only auto mode the semi-diameter column shows its computed ID-keyed value or the manual fallback, including rectangular clear apertures. Manual mode continues to blank rectangular cells.

Shared column and AG Grid configuration for lens prescription grids.

## Design

Builders accept `getGridRow(data)` so feature grids can adapt their own row model to `GridRow` without coupling `shared/` to feature state. Modal and edit behavior is injected through optional callbacks. When edit callbacks are omitted, numeric and select columns remain read-only.

`LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS` is the shared source for the `Surface`, `Index`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths used by Lens Editor and Optimization. `lensPrescriptionGridIndexColumnDef` applies the `index` width and pins the `Index` column to the left; feature grids spread it into their local read-only `Index` column before adding their feature-specific value getter. `createSurfaceColumn` applies `surface`, `createRadiusOfCurvatureColumn` applies `radiusOfCurvature`, `createThicknessColumn` applies `thickness`, `createMediumColumn` applies `medium`, `createSemiDiameterColumn` applies `semiDiameter`, `createApertureColumn` applies `aperture`, `createAsphericalColumn` applies `aspherical`, `createDecenterColumn` applies `decenter`, and `createDiffractionGratingColumn` applies `diffractionGrating`.

`createLensPrescriptionCommonColumns` returns the common column order used by the Lens Editor. Optimization uses the individual builders so its local `Var.` columns can stay interleaved after Radius, Thickness, and Asph.

The modal-backed `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` builders apply shared initial widths and pass the row's actual optional config into the shared text action cells. `createApertureColumn` passes both `clear_aperture` and `edge_aperture` into `ApertureCell`, and its value getter returns the same formatted aperture label shown by the renderer. Aperture labels display `Default` only for default/omitted edge aperture plus omitted or centered circular clear aperture; otherwise they show compact clear aperture details and append explicit circular edge aperture details. The other cells display `None`, asphere type labels, decenter strategy values, or diffraction grating `lp/mm` labels while keeping the existing modal callbacks.

`createSemiDiameterColumn` renders a blank value and is non-editable for surface rows whose clear aperture is rectangular, because rectangular clear apertures carry their own half-length and half-width instead of using `semiDiameter`.*/
"use client";

import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  AsphericalCell,
  ApertureCell,
  DecenterCell,
  DiffractionGratingCell,
  LensPrescriptionActionWrapper,
  MediumCell,
} from "@/shared/lib/lens-prescription-grid/LensPrescriptionGridCells";
import { formatApertureLabel } from "@/shared/lib/lens-prescription-grid/displayLabels";

export const lensPrescriptionGridDefaultColDef = {
  sortable: false,
  suppressMovable: true,
} satisfies ColDef;

export const LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS = {
  surface: 85,
  index: 80,
  radiusOfCurvature: 170,
  thickness: 130,
  medium: 115,
  semiDiameter: 115,
  aperture: 115,
  aspherical: 140,
  decenter: 135,
  diffractionGrating: 165,
} as const;

export const lensPrescriptionGridIndexColumnDef = {
  headerName: "Index",
  width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.index,
  pinned: "left",
} satisfies ColDef;

const VALID_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function numberValueParser(params: { readonly newValue: string; readonly oldValue: unknown }) {
  const raw = String(params.newValue ?? "").trim();
  if (raw === "" || !VALID_NUMBER.test(raw)) return params.oldValue;
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : params.oldValue;
}

type GridRowAccessor<TData> = (data: TData) => GridRow;
type GridRowModalCallback = (row: GridRow) => void;

interface BaseColumnOptions<TData> {
  readonly getGridRow: GridRowAccessor<TData>;
}

interface SurfaceColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onSurfaceLabelChange?: (row: GridRow, label: "Default" | "Stop") => void;
}

interface RadiusColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onRadiusChange?: (row: GridRow, curvatureRadius: number) => void;
}

interface ThicknessColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onThicknessChange?: (row: GridRow, thickness: number) => void;
}

interface MediumColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onOpenMediumModal?: GridRowModalCallback;
  readonly tooltipText?: string;
}

interface SemiDiameterColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly semiDiameterReadonly?: boolean;
  readonly computedSemiDiameters?: Readonly<Record<string, number>>;
  readonly onSemiDiameterChange?: (row: GridRow, semiDiameter: number) => void;
}

interface ApertureColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onOpenApertureModal?: GridRowModalCallback;
  readonly tooltipText?: string;
}

interface AsphericalColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onOpenAsphericalModal?: GridRowModalCallback;
  readonly tooltipText?: string;
}

interface DecenterColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onOpenDecenterModal?: GridRowModalCallback;
  readonly tooltipText?: string;
}

interface DiffractionGratingColumnOptions<TData> extends BaseColumnOptions<TData> {
  readonly onOpenDiffractionGratingModal?: GridRowModalCallback;
  readonly tooltipText?: string;
}

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
      if (params.data === undefined || onSurfaceLabelChange === undefined) return false;
      return getGridRow(params.data).kind === "surface";
    },
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: ["Default", "Stop"] },
    valueSetter: (params) => {
      if (params.data === undefined || onSurfaceLabelChange === undefined) return false;
      onSurfaceLabelChange(getGridRow(params.data), params.newValue as "Default" | "Stop");
      return true;
    },
  };
}

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
      if (params.data === undefined || onRadiusChange === undefined) return false;
      return getGridRow(params.data).kind !== "object";
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onRadiusChange === undefined) return false;
      onRadiusChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

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
      if (params.data === undefined || onThicknessChange === undefined) return false;
      return getGridRow(params.data).kind !== "image";
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onThicknessChange === undefined) return false;
      onThicknessChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

export function createMediumColumn<TData>({
  getGridRow,
  onOpenMediumModal,
  tooltipText,
}: MediumColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Medium",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.medium,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "image") return undefined;
      return row.medium;
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenMediumModal === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "image") return undefined;
      return (
        <LensPrescriptionActionWrapper onAction={() => onOpenMediumModal(row)}>
          <MediumCell
            medium={row.medium}
            onOpenModal={() => onOpenMediumModal(row)}
            tooltipText={tooltipText}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

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
      if (semiDiameterReadonly) return computedSemiDiameters[row.id] ?? row.semiDiameter;
      if (isRectangularClearApertureRow(row)) return undefined;
      return row.semiDiameter;
    },
    editable: (params) => {
      if (params.data === undefined || onSemiDiameterChange === undefined || semiDiameterReadonly) return false;
      const row = getGridRow(params.data);
      return row.kind === "surface" && !isRectangularClearApertureRow(row);
    },
    cellStyle: (params) => {
      if (params.data === undefined) return { opacity: 0.5 };
      const row = getGridRow(params.data);
      return !semiDiameterReadonly && row.kind === "surface" && !isRectangularClearApertureRow(row)
        ? undefined
        : { opacity: 0.5 };
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onSemiDiameterChange === undefined) return false;
      onSemiDiameterChange(getGridRow(params.data), params.newValue as number);
      return true;
    },
  };
}

export function createApertureColumn<TData>({
  getGridRow,
  onOpenApertureModal,
  tooltipText,
}: ApertureColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Aperture",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aperture,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return formatApertureLabel(row.clear_aperture, row.edge_aperture);
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenApertureModal === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return (
        <LensPrescriptionActionWrapper onAction={() => onOpenApertureModal(row)}>
          <ApertureCell
            clearAperture={row.clear_aperture}
            edgeAperture={row.edge_aperture}
            onOpenModal={() => onOpenApertureModal(row)}
            tooltipText={tooltipText}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

export function createAsphericalColumn<TData>({
  getGridRow,
  onOpenAsphericalModal,
  tooltipText,
}: AsphericalColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Asph.",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.aspherical,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return row.aspherical;
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenAsphericalModal === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return (
        <LensPrescriptionActionWrapper onAction={() => onOpenAsphericalModal(row)}>
          <AsphericalCell
            aspherical={row.aspherical}
            onOpenModal={() => onOpenAsphericalModal(row)}
            tooltipText={tooltipText}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

export function createDecenterColumn<TData>({
  getGridRow,
  onOpenDecenterModal,
  tooltipText,
}: DecenterColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Tilt & Decenter",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.decenter,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "object") return undefined;
      return row.decenter;
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenDecenterModal === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind === "object") return undefined;
      return (
        <LensPrescriptionActionWrapper onAction={() => onOpenDecenterModal(row)}>
          <DecenterCell
            decenter={row.decenter}
            onOpenModal={() => onOpenDecenterModal(row)}
            tooltipText={tooltipText}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

export function createDiffractionGratingColumn<TData>({
  getGridRow,
  onOpenDiffractionGratingModal,
  tooltipText,
}: DiffractionGratingColumnOptions<TData>): ColDef<TData> {
  return {
    headerName: "Diffraction Grating",
    width: LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS.diffractionGrating,
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return row.diffractionGrating;
    },
    cellRenderer: (params: { readonly data?: TData }) => {
      if (params.data === undefined || onOpenDiffractionGratingModal === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return (
        <LensPrescriptionActionWrapper onAction={() => onOpenDiffractionGratingModal(row)}>
          <DiffractionGratingCell
            diffractionGrating={row.diffractionGrating}
            onOpenModal={() => onOpenDiffractionGratingModal(row)}
            tooltipText={tooltipText}
          />
        </LensPrescriptionActionWrapper>
      );
    },
  };
}

interface CommonColumnOptions<TData>
  extends SurfaceColumnOptions<TData>,
    RadiusColumnOptions<TData>,
    ThicknessColumnOptions<TData>,
    MediumColumnOptions<TData>,
    SemiDiameterColumnOptions<TData>,
    ApertureColumnOptions<TData>,
    AsphericalColumnOptions<TData>,
    DecenterColumnOptions<TData>,
    DiffractionGratingColumnOptions<TData> {}

export function createLensPrescriptionCommonColumns<TData>(
  options: CommonColumnOptions<TData>,
): ColDef<TData>[] {
  return [
    createSurfaceColumn(options),
    createRadiusOfCurvatureColumn(options),
    createThicknessColumn(options),
    createMediumColumn(options),
    createSemiDiameterColumn(options),
    createApertureColumn(options),
    createAsphericalColumn(options),
    createDecenterColumn(options),
    createDiffractionGratingColumn(options),
  ];
}
