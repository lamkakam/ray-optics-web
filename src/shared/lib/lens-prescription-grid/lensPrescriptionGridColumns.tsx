"use client";

import type { ColDef } from "ag-grid-community";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import {
  AsphericalCell,
  DecenterCell,
  DiffractionGratingCell,
  LensPrescriptionActionWrapper,
  MediumCell,
} from "@/shared/lib/lens-prescription-grid/LensPrescriptionGridCells";

export const lensPrescriptionGridDefaultColDef = {
  sortable: false,
  suppressMovable: true,
} satisfies ColDef;

export const LENS_PRESCRIPTION_GRID_DOM_LAYOUT = "autoHeight";

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
  return {
    headerName: "Semi-diam.",
    valueGetter: (params) => {
      if (params.data === undefined) return undefined;
      const row = getGridRow(params.data);
      if (row.kind !== "surface") return undefined;
      return row.semiDiameter;
    },
    editable: (params) => {
      if (params.data === undefined || onSemiDiameterChange === undefined || semiDiameterReadonly) return false;
      return getGridRow(params.data).kind === "surface";
    },
    cellStyle: (params) => {
      if (params.data === undefined) return { opacity: 0.5 };
      const row = getGridRow(params.data);
      return !semiDiameterReadonly && row.kind === "surface" ? undefined : { opacity: 0.5 };
    },
    valueParser: numberValueParser,
    valueSetter: (params) => {
      if (params.data === undefined || onSemiDiameterChange === undefined) return false;
      onSemiDiameterChange(getGridRow(params.data), params.newValue as number);
      return true;
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
            isAspherical={row.aspherical !== undefined}
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
            isDecenterSet={row.decenter !== undefined}
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
            isDiffractionGratingSet={row.diffractionGrating !== undefined}
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
    createAsphericalColumn(options),
    createDecenterColumn(options),
    createDiffractionGratingColumn(options),
  ];
}
