import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

export function mapPhysicalSurfaceSemiDiameters(
  rows: readonly GridRow[],
  sequentialSemiDiameters: readonly number[],
): Readonly<Record<string, number>> {
  const physicalRows = rows.filter((row) => row.kind === "surface");
  if (sequentialSemiDiameters.length !== physicalRows.length + 2) {
    throw new Error(
      `Expected ${physicalRows.length + 2} sequential semi-diameters, received ${sequentialSemiDiameters.length}.`,
    );
  }

  return Object.fromEntries(
    physicalRows.map((row, index) => [row.id, sequentialSemiDiameters[index + 1]]),
  );
}
