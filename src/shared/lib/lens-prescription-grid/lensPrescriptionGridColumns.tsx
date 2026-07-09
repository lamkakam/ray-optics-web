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
