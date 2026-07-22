/**
# `shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts`

## Purpose

Pure formatting helpers for lens prescription grid rows. The module does not read or mutate Zustand state; callers pass rows in and receive either a full candidate row array or an error.

## Scale Behavior

- Scaleable numeric fields and preservation rules are centralized in `surfaceValueScaling.ts`; this module delegates selected-row scaling and validation numeric collection to that helper.
- `first` and `last` are selector indices: `0` for Object, `1..n` for surfaces, and `n + 1` for Image.
- Surface `curvatureRadius`, `thickness`, `semiDiameter`, clear aperture `offsetX`/`offsetY`, annular `obstructionRadius`, rectangular `xHalfWidth`/`yHalfWidth`, edge aperture `radius`, edge aperture `offsetX`/`offsetY`, rectangular edge `xHalfWidth`/`yHalfWidth`, and decenter `offsetX`/`offsetY` are multiplied by `factor`. Rectangular aperture `rotation` is an angle and is not scaled.
- Image `curvatureRadius` and image decenter offsets are multiplied when Image is in the selected range.
- Object distance is multiplied only when it is below `1e10`; larger object distances are preserved.
- Toroid sweep radius is multiplied for `XToroid`/`YToroid`.
- Radial Polynomial coefficients use orders `1..10`; other coefficient-bearing aspheres use even orders `2..20`. Each coefficient is divided by `factor ** (order - 1)`.
- Diffraction grating `lpmm` and `order`, conic constants, and decenter angular fields are preserved.

## Reverse Behavior

- `first` and `last` use the same selector indices, except Image is invalid.
- `last` must be strictly after `first`.
- Reversed surface rows keep surface-owned data with the surface: semi-diameter, asphere, decenter, diffraction grating, and label.
- Gap-owned data moves with the reversed gap: object distance or surface thickness, plus `medium` and `manufacturer`.
- Curvature radius is multiplied by `-1` for each included surface.
- Flat reversed radii remain `0` rather than `-0`.
- Boundary gaps are reversed with the selected span: object distance or the preceding surface thickness is the leading gap, and the selected surfaces' thickness values complete the gap list.
- Reversing `Object` through the last surface sets image `curvatureRadius` to `0`.
- Mirror surfaces are identified by medium `REFL` case-insensitively. When reversing, transformed mirror surfaces keep canonical medium `REFL` so a reversed system preserves its physical mirror count.
- When a reversed mirror surface also needs to hand off to a positive non-reflective propagation gap, the mirror row is kept as `REFL` with zero thickness and a generated flat spacer surface is inserted immediately after it to carry that gap's `thickness`, `medium`, and `manufacturer`.
- A positive air/glass gap between folded mirror interactions remains a normal propagation medium after reversal; for example, the Newtonian reflector's intermediate `860` air gap is represented by an inserted flat air spacer instead of becoming an extra `REFL` row or removing the primary mirror marker.
- Before reversing, generated flat propagation spacer rows after zero-thickness `REFL` mirrors are normalized away: the spacer is removed from the physical surface list and its gap data is used as the preceding mirror's gap. This keeps reverse formatting involutive for folded mirror systems, so applying the same full reverse twice restores the original physical surface sequence.
- When a full `Object`-through-last-surface reverse starts from an old last surface whose medium is `REFL`, the transformed Object medium comes from the old last non-mirror surface before it. If no such surface exists, the old Object medium is retained so the transformed Object row does not become reflective.

## Reference Surface Helpers

- A first surface needs a reference surface only when `decenter` is present and one of `alpha`, `beta`, `gamma`, `offsetX`, or `offsetY` is nonzero. A missing decenter config, or an all-zero decenter config, returns false.
- The inserted reference surface is a standard flat air surface with `curvatureRadius: 0`, `thickness: 0`, `medium: "air"`, `manufacturer: ""`, label `Default`, and no decenter, aspherical, or diffraction grating data.
- The reference surface copies `semiDiameter` from the original first surface so aperture display remains consistent before any auto-aperture recalculation.
- The helper returns a new row array and preserves all original row objects.

## Validation

`formatPrescriptionRows` rejects without mutation when the selection is invalid, the scale factor is not positive finite, or any numeric value collected by `surfaceValueScaling.ts` in the candidate rows is non-finite. Arithmetic beyond JavaScript's finite number range overflows to infinity and is therefore rejected by the same finite-number check. Scaling is also rejected atomically with a precision-underflow error when any nonzero source numeric value, including an aperture dimension, aspheric coefficient, or preserved dimensionless value, becomes zero. Source values that are already zero remain valid.*/
import { generateRowId } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { IMAGE_ROW_ID, OBJECT_ROW_ID, type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  collectSurfaceScalingNumericValues,
  OBJECT_DISTANCE_INFINITY_THRESHOLD,
  scaleSurfaceValueRow,
} from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";

export { OBJECT_DISTANCE_INFINITY_THRESHOLD } from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";

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
