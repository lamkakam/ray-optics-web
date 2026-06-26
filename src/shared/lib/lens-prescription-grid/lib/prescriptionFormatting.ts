import type { AsphericalType, DecenterConfig } from "@/shared/lib/types/opticalModel";
import { generateRowId } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { IMAGE_ROW_ID, OBJECT_ROW_ID, type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

export interface SurfaceSelectorOption {
  readonly value: number;
  readonly label: string;
}

export interface ScaleRowsOptions {
  readonly first: number;
  readonly last: number;
  readonly factor: number;
}

export interface ReverseRowsOptions {
  readonly first: number;
  readonly last: number;
}

export type FormattingRowsOptions =
  | ({ readonly mode: "scale" } & ScaleRowsOptions)
  | ({ readonly mode: "reverse" } & ReverseRowsOptions);

export type FormattingRowsResult =
  | { readonly ok: true; readonly rows: GridRow[] }
  | { readonly ok: false; readonly rows: GridRow[]; readonly error: string };

const OBJECT_SELECTOR_INDEX = 0;
export const OBJECT_DISTANCE_INFINITY_THRESHOLD = 1e10;

interface GapProperties {
  readonly thickness: number;
  readonly medium: string;
  readonly manufacturer: string;
}

function surfaceCount(rows: readonly GridRow[]): number {
  return rows.filter((row) => row.kind === "surface").length;
}

export function firstSurfaceNeedsReferenceSurface(rows: readonly GridRow[]): boolean {
  const firstSurface = rows.find((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
  if (firstSurface?.decenter === undefined) {
    return false;
  }

  return [
    firstSurface.decenter.alpha,
    firstSurface.decenter.beta,
    firstSurface.decenter.gamma,
    firstSurface.decenter.offsetX,
    firstSurface.decenter.offsetY,
  ].some((value) => value !== 0);
}

export function insertReferenceSurfaceAfterObject(rows: readonly GridRow[]): GridRow[] {
  const firstSurface = rows.find((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
  const referenceSurface: Extract<GridRow, { kind: "surface" }> = {
    id: generateRowId(),
    kind: "surface",
    label: "Default",
    curvatureRadius: 0,
    thickness: 0,
    medium: "air",
    manufacturer: "",
    semiDiameter: firstSurface?.semiDiameter ?? 0,
  };
  const objectIndex = rows.findIndex((row) => row.kind === "object" || row.id === OBJECT_ROW_ID);
  const insertIndex = objectIndex === -1 ? 0 : objectIndex + 1;

  return [
    ...rows.slice(0, insertIndex),
    referenceSurface,
    ...rows.slice(insertIndex),
  ];
}

export function buildScaleSurfaceOptions(rows: readonly GridRow[]): SurfaceSelectorOption[] {
  const count = surfaceCount(rows);
  return [
    { value: OBJECT_SELECTOR_INDEX, label: "Object" },
    ...Array.from({ length: count }, (_, index) => ({
      value: index + 1,
      label: `Surface ${index + 1}`,
    })),
    { value: count + 1, label: "Image" },
  ];
}

export function buildReverseSurfaceOptions(rows: readonly GridRow[]): SurfaceSelectorOption[] {
  const count = surfaceCount(rows);
  return [
    { value: OBJECT_SELECTOR_INDEX, label: "Object" },
    ...Array.from({ length: count }, (_, index) => ({
      value: index + 1,
      label: `Surface ${index + 1}`,
    })),
  ];
}

function selectorIndexForRow(rows: readonly GridRow[], row: GridRow): number {
  if (row.id === OBJECT_ROW_ID || row.kind === "object") {
    return OBJECT_SELECTOR_INDEX;
  }
  if (row.id === IMAGE_ROW_ID || row.kind === "image") {
    return surfaceCount(rows) + 1;
  }

  return rows.slice(0, rows.indexOf(row) + 1).filter((item) => item.kind === "surface").length;
}

function scaleNumber(value: number, factor: number): number {
  return value * factor;
}

function negateNumber(value: number): number {
  const negated = -value;
  return Object.is(negated, -0) ? 0 : negated;
}

function isMirrorMedium(medium: string): boolean {
  return medium.toUpperCase() === "REFL";
}

function scaleAspherical(
  aspherical: Extract<GridRow, { kind: "surface" }>["aspherical"],
  factor: number,
): Extract<GridRow, { kind: "surface" }>["aspherical"] {
  if (aspherical === undefined || aspherical.kind === "Conic") {
    return aspherical;
  }

  const scaleCoefficient = (coefficient: number, index: number, kind: AsphericalType): number => {
    const order = kind === "RadialPolynomial" ? index + 1 : (index + 1) * 2;
    return coefficient / (factor ** (order - 1));
  };

  if (aspherical.kind === "XToroid" || aspherical.kind === "YToroid") {
    return {
      ...aspherical,
      toricSweepRadiusOfCurvature: scaleNumber(aspherical.toricSweepRadiusOfCurvature, factor),
      polynomialCoefficients: aspherical.polynomialCoefficients.map((coefficient, index) =>
        scaleCoefficient(coefficient, index, aspherical.kind)
      ),
    };
  }

  return {
    ...aspherical,
    polynomialCoefficients: aspherical.polynomialCoefficients.map((coefficient, index) =>
      scaleCoefficient(coefficient, index, aspherical.kind)
    ),
  };
}

function scaleDecenter(
  decenter: DecenterConfig | undefined,
  factor: number,
): DecenterConfig | undefined {
  if (decenter === undefined) {
    return undefined;
  }

  return {
    ...decenter,
    offsetX: scaleNumber(decenter.offsetX, factor),
    offsetY: scaleNumber(decenter.offsetY, factor),
  };
}

export function scaleRows(rows: readonly GridRow[], { first, last, factor }: ScaleRowsOptions): GridRow[] {
  return rows.map((row) => {
    const selectorIndex = selectorIndexForRow(rows, row);
    if (selectorIndex < first || selectorIndex > last) {
      return row;
    }

    if (row.kind === "object") {
      return {
        ...row,
        objectDistance: row.objectDistance < OBJECT_DISTANCE_INFINITY_THRESHOLD
          ? scaleNumber(row.objectDistance, factor)
          : row.objectDistance,
      };
    }

    if (row.kind === "image") {
      return {
        ...row,
        curvatureRadius: scaleNumber(row.curvatureRadius, factor),
        decenter: scaleDecenter(row.decenter, factor),
      };
    }

    return {
      ...row,
      curvatureRadius: scaleNumber(row.curvatureRadius, factor),
      thickness: scaleNumber(row.thickness, factor),
      semiDiameter: scaleNumber(row.semiDiameter, factor),
      aspherical: scaleAspherical(row.aspherical, factor),
      decenter: scaleDecenter(row.decenter, factor),
    };
  });
}

function getGap(rows: readonly GridRow[], surfaceSelectorIndex: number): GapProperties {
  if (surfaceSelectorIndex === OBJECT_SELECTOR_INDEX) {
    const objectRow = rows.find((row): row is Extract<GridRow, { kind: "object" }> => row.kind === "object");
    return {
      thickness: objectRow?.objectDistance ?? 0,
      medium: objectRow?.medium ?? "air",
      manufacturer: objectRow?.manufacturer ?? "",
    };
  }

  const surfaces = rows.filter((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
  const surface = surfaces[surfaceSelectorIndex - 1];
  return {
    thickness: surface?.thickness ?? 0,
    medium: surface?.medium ?? "air",
    manufacturer: surface?.manufacturer ?? "",
  };
}

function setGap(rows: GridRow[], surfaceSelectorIndex: number, gap: GapProperties): GridRow[] {
  if (surfaceSelectorIndex === OBJECT_SELECTOR_INDEX) {
    return rows.map((row) => row.kind === "object"
      ? { ...row, objectDistance: gap.thickness, medium: gap.medium, manufacturer: gap.manufacturer }
      : row);
  }

  let currentSurfaceIndex = 0;
  return rows.map((row) => {
    if (row.kind !== "surface") {
      return row;
    }
    currentSurfaceIndex += 1;
    return currentSurfaceIndex === surfaceSelectorIndex
      ? { ...row, thickness: gap.thickness, medium: gap.medium, manufacturer: gap.manufacturer }
      : row;
  });
}

export function reverseRows(rows: readonly GridRow[], { first, last }: ReverseRowsOptions): GridRow[] {
  const surfaces = rows.filter((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
  const selectedSurfaceCount = last - Math.max(first, 1) + 1;
  const selectedSurfaces = surfaces
    .slice(Math.max(first, 1) - 1, Math.max(first, 1) - 1 + selectedSurfaceCount)
    .reverse()
    .map((row) => ({ ...row, curvatureRadius: negateNumber(row.curvatureRadius) }));

  let replacementIndex = 0;
  let currentSurfaceIndex = 0;
  let reversedRows = rows.map((row): GridRow => {
    if (row.kind !== "surface") {
      return row;
    }

    currentSurfaceIndex += 1;
    if (currentSurfaceIndex < Math.max(first, 1) || currentSurfaceIndex > last) {
      return row;
    }

    const replacement = selectedSurfaces[replacementIndex];
    replacementIndex += 1;
    return replacement;
  });

  const firstGapIndex = first === OBJECT_SELECTOR_INDEX ? OBJECT_SELECTOR_INDEX : first - 1;
  const gapIndices = Array.from({ length: last - firstGapIndex + 1 }, (_, index) => firstGapIndex + index);
  const reversedGaps = gapIndices.map((gapIndex) => getGap(rows, gapIndex)).reverse();
  gapIndices.forEach((gapIndex, index) => {
    reversedRows = setGap(reversedRows, gapIndex, reversedGaps[index]);
  });

  if (first === OBJECT_SELECTOR_INDEX && last === surfaceCount(rows)) {
    reversedRows = reversedRows.map((row) => row.kind === "image" ? { ...row, curvatureRadius: 0 } : row);
  }

  currentSurfaceIndex = 0;
  replacementIndex = 0;
  reversedRows = reversedRows.map((row): GridRow => {
    if (row.kind !== "surface") {
      return row;
    }

    currentSurfaceIndex += 1;
    if (currentSurfaceIndex < Math.max(first, 1) || currentSurfaceIndex > last) {
      return row;
    }

    const replacement = selectedSurfaces[replacementIndex];
    replacementIndex += 1;
    return isMirrorMedium(replacement.medium)
      ? { ...row, medium: "REFL", manufacturer: replacement.manufacturer }
      : row;
  });

  const oldLastSurface = surfaces[last - 1];
  if (first === OBJECT_SELECTOR_INDEX && oldLastSurface !== undefined && isMirrorMedium(oldLastSurface.medium)) {
    const objectRow = rows.find((row): row is Extract<GridRow, { kind: "object" }> => row.kind === "object");
    const objectMediumSource = surfaces
      .slice(0, last - 1)
      .reverse()
      .find((surface) => !isMirrorMedium(surface.medium));
    reversedRows = reversedRows.map((row) => row.kind === "object"
      ? {
        ...row,
        medium: objectMediumSource?.medium ?? objectRow?.medium ?? row.medium,
        manufacturer: objectMediumSource?.manufacturer ?? objectRow?.manufacturer ?? row.manufacturer,
      }
      : row);
  }

  return reversedRows;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function numericValues(row: GridRow): number[] {
  if (row.kind === "object") {
    return [row.objectDistance];
  }

  const values = [row.curvatureRadius];
  if (row.decenter !== undefined) {
    values.push(row.decenter.alpha, row.decenter.beta, row.decenter.gamma, row.decenter.offsetX, row.decenter.offsetY);
  }

  if (row.kind === "surface") {
    values.push(row.thickness, row.semiDiameter);
    if (row.aspherical !== undefined) {
      values.push(row.aspherical.conicConstant);
      if (row.aspherical.kind !== "Conic") {
        values.push(...row.aspherical.polynomialCoefficients);
      }
      if (row.aspherical.kind === "XToroid" || row.aspherical.kind === "YToroid") {
        values.push(row.aspherical.toricSweepRadiusOfCurvature);
      }
    }
    if (row.diffractionGrating !== undefined) {
      values.push(row.diffractionGrating.lpmm, row.diffractionGrating.order);
    }
  }

  return values;
}

function validateRows(rows: readonly GridRow[], sourceRows?: readonly GridRow[]): string | undefined {
  const invalidValue = rows.flatMap((row) => numericValues(row)).find((value) => !isFiniteNumber(value));
  if (invalidValue !== undefined) {
    return "Formatting was not applied because one or more transformed numeric values are invalid or exceed JavaScript finite number limits.";
  }

  if (sourceRows !== undefined) {
    const underflowed = rows.some((row, rowIndex) => {
      const sourceValues = numericValues(sourceRows[rowIndex]);
      return numericValues(row).some((value, valueIndex) => value === 0 && sourceValues[valueIndex] !== 0);
    });
    if (underflowed) {
      return "Formatting was not applied because one or more nonzero transformed numeric values underflowed to zero.";
    }
  }

  return undefined;
}

export function formatPrescriptionRows(rows: readonly GridRow[], options: FormattingRowsOptions): FormattingRowsResult {
  if (options.mode === "scale") {
    if (!Number.isFinite(options.factor) || options.factor <= 0) {
      return { ok: false, rows: [...rows], error: "Formatting was not applied because the scale factor must be a positive finite number." };
    }
    if (options.first > options.last || options.first < 0 || options.last > surfaceCount(rows) + 1) {
      return { ok: false, rows: [...rows], error: "Formatting was not applied because the selected surface range is invalid." };
    }

    const scaledRows = scaleRows(rows, options);
    const error = validateRows(scaledRows, rows);
    return error === undefined ? { ok: true, rows: scaledRows } : { ok: false, rows: rows as GridRow[], error };
  }

  if (options.first >= options.last || options.first < 0 || options.last > surfaceCount(rows)) {
    return { ok: false, rows: [...rows], error: "Formatting was not applied because Last Surface must be after First Surface." };
  }

  const reversedRows = reverseRows(rows, options);
  const error = validateRows(reversedRows);
  return error === undefined ? { ok: true, rows: reversedRows } : { ok: false, rows: rows as GridRow[], error };
}
