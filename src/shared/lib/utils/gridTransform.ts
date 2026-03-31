import type { Surfaces, Surface } from "@/shared/lib/types/opticalModel";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/shared/lib/types/gridTypes";

let nextId = 0;

export function generateRowId(): string {
  return `row-surface-${nextId++}`;
}

export function surfacesToGridRows(surfaces: Surfaces): GridRow[] {
  const objectRow: GridRow = {
    id: OBJECT_ROW_ID,
    kind: "object",
    objectDistance: surfaces.object.distance,
  };

  const surfaceRows: GridRow[] = surfaces.surfaces.map((s) => ({
    id: generateRowId(),
    kind: "surface" as const,
    label: s.label,
    curvatureRadius: s.curvatureRadius,
    thickness: s.thickness,
    medium: s.medium,
    manufacturer: s.manufacturer,
    semiDiameter: s.semiDiameter,
    ...(s.aspherical !== undefined ? { aspherical: s.aspherical } : {}),
    ...(s.decenter !== undefined ? { decenter: s.decenter } : {}),
  }));

  const imageRow: GridRow = {
    id: IMAGE_ROW_ID,
    kind: "image",
    curvatureRadius: surfaces.image.curvatureRadius,
    ...(surfaces.image.decenter !== undefined ? { decenter: surfaces.image.decenter } : {}),
  };

  return [objectRow, ...surfaceRows, imageRow];
}

export function gridRowsToSurfaces(rows: GridRow[]): Surfaces {
  const objectRow = rows.find((r): r is GridRow & { kind: "object" } => r.kind === "object");
  const imageRow = rows.find((r): r is GridRow & { kind: "image" } => r.kind === "image");
  const surfaceRows = rows.filter((r): r is GridRow & { kind: "surface" } => r.kind === "surface");

  const surfaces: Surface[] = surfaceRows.map((r) => {
    const surface: Surface = {
      label: r.label ?? "Default",
      curvatureRadius: r.curvatureRadius ?? 0,
      thickness: r.thickness ?? 0,
      medium: r.medium ?? "air",
      manufacturer: r.manufacturer ?? "",
      semiDiameter: r.semiDiameter ?? 1,
    };
    if (r.aspherical !== undefined) {
      surface.aspherical = r.aspherical;
    }
    if (r.decenter !== undefined) {
      surface.decenter = r.decenter;
    }
    return surface;
  });

  return {
    object: { distance: objectRow?.objectDistance ?? 0 },
    image: {
      curvatureRadius: imageRow?.curvatureRadius ?? 0,
      ...(imageRow?.decenter !== undefined ? { decenter: imageRow.decenter } : {}),
    },
    surfaces,
  };
}
