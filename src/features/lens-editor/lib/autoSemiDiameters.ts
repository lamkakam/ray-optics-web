import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

/**
Maps the authoritative sequential-interface `surface_od()` list to stable physical Lens Editor row IDs. The input must contain Object and Image endpoints, so its length must be the physical row count plus two. Endpoint values are deliberately excluded from the returned cache.
*/
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
