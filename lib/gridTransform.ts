import type { Surfaces, Surface } from "./opticalModel";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "./gridTypes";

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
  }));

  const imageRow: GridRow = {
    id: IMAGE_ROW_ID,
    kind: "image",
    curvatureRadius: surfaces.image.curvatureRadius,
  };

  return [objectRow, ...surfaceRows, imageRow];
}

export function gridRowsToSurfaces(rows: GridRow[]): Surfaces {
  const objectRow = rows.find((r): r is GridRow & { kind: "object" } => r.kind === "object");
  const imageRow = rows.find((r): r is GridRow & { kind: "image" } => r.kind === "image");
  const surfaceRows = rows.filter((r): r is GridRow & { kind: "surface" } => r.kind === "surface");

  const surfaces: Surface[] = surfaceRows.map((r) => {
    const surface: Surface = {
      label: r.label,
      curvatureRadius: r.curvatureRadius,
      thickness: r.thickness,
      medium: r.medium,
      manufacturer: r.manufacturer,
      semiDiameter: r.semiDiameter,
    };
    if (r.aspherical !== undefined) {
      surface.aspherical = r.aspherical;
    }
    return surface;
  });

  return {
    object: { distance: objectRow?.objectDistance ?? 0 },
    image: { curvatureRadius: imageRow?.curvatureRadius ?? 0 },
    surfaces,
  };
}
