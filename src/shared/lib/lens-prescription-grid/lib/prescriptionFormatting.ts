/**
 * Pure prescription formatting orchestration. Callers provide rows and receive a
 * complete candidate row set or an error; no store state is read or mutated.
 */
import { generateRowId } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { IMAGE_ROW_ID, OBJECT_ROW_ID, type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  collectSurfaceScalingNumericValues,
  OBJECT_DISTANCE_INFINITY_THRESHOLD,
  scaleSurfaceValueRow,
} from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";

export { OBJECT_DISTANCE_INFINITY_THRESHOLD } from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";

/** One Object, physical-surface, or Image range-selector option. */
export interface SurfaceSelectorOption {
  readonly value: number;
  readonly label: string;
}

/** Inclusive selector range and positive finite scale factor. */
export interface ScaleRowsOptions {
  readonly first: number;
  readonly last: number;
  readonly factor: number;
}

/** Inclusive selector range for reversal; Image is not a valid endpoint. */
export interface ReverseRowsOptions {
  readonly first: number;
  readonly last: number;
}

/** Scale or reverse formatting request. */
export type FormattingRowsOptions =
  | ({ readonly mode: "scale" } & ScaleRowsOptions)
  | ({ readonly mode: "reverse" } & ReverseRowsOptions);

/** Successful candidate rows or the unchanged rows plus validation error. */
export type FormattingRowsResult =
  | { readonly ok: true; readonly rows: GridRow[] }
  | { readonly ok: false; readonly rows: GridRow[]; readonly error: string };

const OBJECT_SELECTOR_INDEX = 0;

interface GapProperties {
  readonly thickness: number;
  readonly medium: string;
  readonly manufacturer: string;
}

interface NormalizedReverseRows {
  readonly rows: GridRow[];
  readonly first: number;
  readonly last: number;
  readonly gapOverridesBySurfaceIndex: ReadonlyMap<number, GapProperties>;
}

function surfaceCount(rows: readonly GridRow[]): number {
  return rows.filter((row) => row.kind === "surface").length;
}

/** Returns whether the first physical surface has any non-zero decenter or tilt component. */
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

/** Returns new rows with a flat air reference surface after Object, preserving the first surface semi-diameter. */
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

/** Builds Object-through-Image inclusive range options for scaling. */
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

/** Builds Object-through-last-physical-surface range options for reversal. */
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

function negateNumber(value: number): number {
  const negated = -value;
  return Object.is(negated, -0) ? 0 : negated;
}

function isMirrorMedium(medium: string): boolean {
  return medium.toUpperCase() === "REFL";
}

function needsSeparatePropagationGap(
  surface: Extract<GridRow, { kind: "surface" }>,
  assignedGap: GapProperties | undefined,
): assignedGap is GapProperties {
  return isMirrorMedium(surface.medium)
    && assignedGap !== undefined
    && !isMirrorMedium(assignedGap.medium)
    && assignedGap.thickness > 0;
}

function buildPropagationGapSurface(
  gap: GapProperties,
  semiDiameter: number,
): Extract<GridRow, { kind: "surface" }> {
  return {
    id: generateRowId(),
    kind: "surface",
    label: "Default",
    curvatureRadius: 0,
    thickness: gap.thickness,
    medium: gap.medium,
    manufacturer: gap.manufacturer,
    semiDiameter,
  };
}

function isInsertedPropagationGapSurface(
  row: Extract<GridRow, { kind: "surface" }>,
  previousSurface: Extract<GridRow, { kind: "surface" }> | undefined,
): boolean {
  return previousSurface !== undefined
    && isMirrorMedium(previousSurface.medium)
    && previousSurface.thickness === 0
    && row.label === "Default"
    && row.curvatureRadius === 0
    && !isMirrorMedium(row.medium)
    && row.thickness > 0
    && row.semiDiameter === previousSurface.semiDiameter
    && row.aspherical === undefined
    && row.decenter === undefined
    && row.diffractionGrating === undefined;
}

function normalizeReverseRows(rows: readonly GridRow[], { first, last }: ReverseRowsOptions): NormalizedReverseRows {
  const normalizedRows: GridRow[] = [];
  const sourceSurfaceIndexToPhysicalIndex = new Map<number, number>();
  const gapOverridesBySurfaceIndex = new Map<number, GapProperties>();
  let sourceSurfaceIndex = 0;
  let physicalSurfaceIndex = 0;
  let previousPhysicalSurface: Extract<GridRow, { kind: "surface" }> | undefined;
  let previousPhysicalSurfaceIndex = 0;

  rows.forEach((row) => {
    if (row.kind !== "surface") {
      normalizedRows.push(row);
      return;
    }

    sourceSurfaceIndex += 1;
    if (isInsertedPropagationGapSurface(row, previousPhysicalSurface)) {
      sourceSurfaceIndexToPhysicalIndex.set(sourceSurfaceIndex, previousPhysicalSurfaceIndex);
      gapOverridesBySurfaceIndex.set(previousPhysicalSurfaceIndex, {
        thickness: row.thickness,
        medium: row.medium,
        manufacturer: row.manufacturer,
      });
      return;
    }

    physicalSurfaceIndex += 1;
    sourceSurfaceIndexToPhysicalIndex.set(sourceSurfaceIndex, physicalSurfaceIndex);
    normalizedRows.push(row);
    previousPhysicalSurface = row;
    previousPhysicalSurfaceIndex = physicalSurfaceIndex;
  });

  return {
    rows: normalizedRows,
    first: first === OBJECT_SELECTOR_INDEX ? OBJECT_SELECTOR_INDEX : sourceSurfaceIndexToPhysicalIndex.get(first) ?? physicalSurfaceIndex,
    last: sourceSurfaceIndexToPhysicalIndex.get(last) ?? physicalSurfaceIndex,
    gapOverridesBySurfaceIndex,
  };
}

/** Scales the selected inclusive range according to the shared surface-value policy. */
export function scaleRows(rows: readonly GridRow[], { first, last, factor }: ScaleRowsOptions): GridRow[] {
  return rows.map((row) => {
    const selectorIndex = selectorIndexForRow(rows, row);
    if (selectorIndex < first || selectorIndex > last) {
      return row;
    }

    return scaleSurfaceValueRow(row, factor);
  });
}

function getGap(
  rows: readonly GridRow[],
  surfaceSelectorIndex: number,
  gapOverridesBySurfaceIndex?: ReadonlyMap<number, GapProperties>,
): GapProperties {
  if (surfaceSelectorIndex === OBJECT_SELECTOR_INDEX) {
    const objectRow = rows.find((row): row is Extract<GridRow, { kind: "object" }> => row.kind === "object");
    return {
      thickness: objectRow?.objectDistance ?? 0,
      medium: objectRow?.medium ?? "air",
      manufacturer: objectRow?.manufacturer ?? "",
    };
  }

  const override = gapOverridesBySurfaceIndex?.get(surfaceSelectorIndex);
  if (override !== undefined) {
    return override;
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

/** Reverses an inclusive Object/physical-surface span while preserving surface-owned data and moving gap-owned data with each propagation gap. */
export function reverseRows(rows: readonly GridRow[], { first, last }: ReverseRowsOptions): GridRow[] {
  const normalized = normalizeReverseRows(rows, { first, last });
  const sourceRows = normalized.rows;
  const surfaces = sourceRows.filter((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
  const selectedSurfaceCount = normalized.last - Math.max(normalized.first, 1) + 1;
  const selectedSurfaces = surfaces
    .slice(Math.max(normalized.first, 1) - 1, Math.max(normalized.first, 1) - 1 + selectedSurfaceCount)
    .reverse()
    .map((row) => ({ ...row, curvatureRadius: negateNumber(row.curvatureRadius) }));

  let replacementIndex = 0;
  let currentSurfaceIndex = 0;
  let reversedRows = sourceRows.map((row): GridRow => {
    if (row.kind !== "surface") {
      return row;
    }

    currentSurfaceIndex += 1;
    if (currentSurfaceIndex < Math.max(normalized.first, 1) || currentSurfaceIndex > normalized.last) {
      return row;
    }

    const replacement = selectedSurfaces[replacementIndex];
    replacementIndex += 1;
    return replacement;
  });

  const firstGapIndex = normalized.first === OBJECT_SELECTOR_INDEX ? OBJECT_SELECTOR_INDEX : normalized.first - 1;
  const gapIndices = Array.from({ length: normalized.last - firstGapIndex + 1 }, (_, index) => firstGapIndex + index);
  const reversedGaps = gapIndices
    .map((gapIndex) => getGap(sourceRows, gapIndex, normalized.gapOverridesBySurfaceIndex))
    .reverse();
  const assignedGapsBySelectorIndex = new Map<number, GapProperties>();
  gapIndices.forEach((gapIndex, index) => {
    const gap = reversedGaps[index];
    assignedGapsBySelectorIndex.set(gapIndex, gap);
    reversedRows = setGap(reversedRows, gapIndex, gap);
  });

  if (normalized.first === OBJECT_SELECTOR_INDEX && normalized.last === surfaceCount(sourceRows)) {
    reversedRows = reversedRows.map((row) => row.kind === "image" ? { ...row, curvatureRadius: 0 } : row);
  }

  currentSurfaceIndex = 0;
  replacementIndex = 0;
  reversedRows = reversedRows.flatMap((row): GridRow[] => {
    if (row.kind !== "surface") {
      return [row];
    }

    currentSurfaceIndex += 1;
    if (currentSurfaceIndex < Math.max(normalized.first, 1) || currentSurfaceIndex > normalized.last) {
      return [row];
    }

    const replacement = selectedSurfaces[replacementIndex];
    replacementIndex += 1;
    if (!isMirrorMedium(replacement.medium)) {
      return [row];
    }

    const assignedGap = assignedGapsBySelectorIndex.get(currentSurfaceIndex);
    const mirrorRow = { ...row, medium: "REFL", manufacturer: replacement.manufacturer };
    if (currentSurfaceIndex < normalized.last && needsSeparatePropagationGap(replacement, assignedGap)) {
      return [
        { ...mirrorRow, thickness: 0 },
        buildPropagationGapSurface(assignedGap, row.semiDiameter),
      ];
    }

    return [mirrorRow];
  });

  const oldLastSurface = surfaces[normalized.last - 1];
  if (normalized.first === OBJECT_SELECTOR_INDEX && oldLastSurface !== undefined && isMirrorMedium(oldLastSurface.medium)) {
    const objectRow = sourceRows.find((row): row is Extract<GridRow, { kind: "object" }> => row.kind === "object");
    const objectMediumSource = surfaces
      .slice(0, normalized.last - 1)
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

function validateRows(rows: readonly GridRow[], sourceRows?: readonly GridRow[]): string | undefined {
  const invalidValue = rows.flatMap((row) => collectSurfaceScalingNumericValues(row)).find((value) => !isFiniteNumber(value));
  if (invalidValue !== undefined) {
    return "Formatting was not applied because one or more transformed numeric values are invalid or exceed JavaScript finite number limits.";
  }

  if (sourceRows !== undefined) {
    const underflowed = rows.some((row, rowIndex) => {
      const sourceValues = collectSurfaceScalingNumericValues(sourceRows[rowIndex]);
      return collectSurfaceScalingNumericValues(row).some((value, valueIndex) => value === 0 && sourceValues[valueIndex] !== 0);
    });
    if (underflowed) {
      return "Formatting was not applied because one or more nonzero transformed numeric values underflowed to zero.";
    }
  }

  return undefined;
}

/** Validates and applies a scale or reverse request atomically. Rejects invalid ranges, non-positive factors, non-finite results, and precision underflow without mutating source rows. */
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
