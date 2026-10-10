/** Bidirectional conversion between sequential surface data and flat editor grid rows. */
import type {
  Surfaces,
  Surface,
} from "@/shared/lib/optical-model/model/opticalModel";
import {
  completeImage,
  completeSurface,
  pickImageProperties,
  pickSurfaceProperties,
} from "@/shared/lib/optical-model/operations/surfaceProperties";
import {
  OBJECT_ROW_ID,
  IMAGE_ROW_ID,
  type GridRow,
} from "@/shared/lib/lens-prescription-grid/types/gridTypes";

let nextId = 0;

/** Returns a process-local `row-surface-N` id from a monotonically increasing counter. */
export function generateRowId(): string {
  return `row-surface-${nextId++}`;
}

/** Converts sequential surfaces to Object, generated physical-surface, and Image grid rows, copying every registered surface property that is present. */
export function surfacesToGridRows(surfaces: Surfaces): GridRow[] {
  const objectRow: GridRow = {
    id: OBJECT_ROW_ID,
    kind: "object",
    objectDistance: surfaces.object.distance,
    medium: surfaces.object.medium,
    manufacturer: surfaces.object.manufacturer,
  };

  const surfaceRows: GridRow[] = surfaces.surfaces.map((s) => ({
    id: generateRowId(),
    kind: "surface" as const,
    ...(pickSurfaceProperties(s) as Surface),
  }));

  const imageRow: GridRow = {
    id: IMAGE_ROW_ID,
    kind: "image",
    ...(pickImageProperties(surfaces.image) as Surfaces["image"]),
  };

  return [objectRow, ...surfaceRows, imageRow];
}

/**
 * Converts ordered grid rows to sequential surfaces without throwing for missing
 * Object or Image rows. Missing required surface and image values use their
 * registry defaults (Default label, zero radii/thickness, air, empty
 * manufacturer, semi-diameter one); omitted optional values remain omitted.
 */
export function gridRowsToSurfaces(rows: GridRow[]): Surfaces {
  const objectRow = rows.find(
    (r): r is GridRow & { kind: "object" } => r.kind === "object",
  );
  const imageRow = rows.find(
    (r): r is GridRow & { kind: "image" } => r.kind === "image",
  );
  const surfaceRows = rows.filter(
    (r): r is GridRow & { kind: "surface" } => r.kind === "surface",
  );

  return {
    object: {
      distance: objectRow?.objectDistance ?? 0,
      medium: objectRow?.medium ?? "air",
      manufacturer: objectRow?.manufacturer ?? "",
    },
    image: completeImage(imageRow ?? {}),
    surfaces: surfaceRows.map((row) => completeSurface(row)),
  };
}
