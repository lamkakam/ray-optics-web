/**
# `shared/lib/lens-prescription-grid/lib/gridTransform.ts`

## Purpose

Converts between the domain `Surfaces` model and the flat `GridRow[]` representation used by the LensEditor AG Grid, and generates stable row IDs for surface rows.

## Exports

```ts
function generateRowId(): string;
function surfacesToGridRows(surfaces: Surfaces): GridRow[];
function gridRowsToSurfaces(rows: GridRow[]): Surfaces;
```

## Behavior

## Dependencies

- `shared/lib/types/opticalModel.ts` — `Surfaces`, `Surface` (type-only imports)
- `shared/lib/lens-prescription-grid/types/gridTypes.ts` — `OBJECT_ROW_ID`, `IMAGE_ROW_ID`, `GridRow`

## Edge Cases / Error Handling

- If the object or image row is absent from `rows`, fallback defaults are used — no error is thrown.
- The module-level `nextId` counter means IDs from two separate `surfacesToGridRows` calls will never collide, but IDs are not stable across page reloads.
- `generateRowId()` is exported for testing; in production it is only called from `surfacesToGridRows`.

## Usages

```ts
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel, Surfaces } from "@/shared/lib/types/opticalModel";

// Convert model to AG Grid rows when loading
const surfaces: Surfaces = model;
const gridRows = surfacesToGridRows(surfaces);
lensEditorStore.getState().setRows(gridRows);

// Convert grid rows back to surfaces when user submits
const editedRows = lensEditorStore.getState().rows;
const editedSurfaces = gridRowsToSurfaces(editedRows);

// Create updated model and send to worker
const updatedModel: OpticalModel = {
  ...model,
  ...editedSurfaces,
};
const result = await proxy.getFirstOrderData(updatedModel);
```

- `surfacesToGridRows` is called when loading a model into the LensEditor.
- `gridRowsToSurfaces` is called when the user commits an edit before dispatching to the Pyodide worker.
*/
import type { Surfaces, Surface } from "@/shared/lib/types/opticalModel";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

let nextId = 0;

/**
### `generateRowId()`

Returns a unique string of the form `"row-surface-N"` where `N` is a module-level monotonically increasing integer starting at `0`. The counter is **never reset** between calls. It is not a UUID.
*/
export function generateRowId(): string {
  return `row-surface-${nextId++}`;
}

/**
### `surfacesToGridRows(surfaces)`

1. Creates one `{ kind: "object" }` row with `id = OBJECT_ROW_ID`, `objectDistance` from `surfaces.object.distance`, and `medium` / `manufacturer` from `surfaces.object`.
2. Maps each entry in `surfaces.surfaces` to a `{ kind: "surface" }` row by calling `generateRowId()` for each ID. Optional `clear_aperture`, `edge_aperture`, `aspherical`, `decenter`, and `diffractionGrating` fields are spread onto the row only when present (not `undefined`).
3. Creates one `{ kind: "image" }` row with `id = IMAGE_ROW_ID` and `curvatureRadius` from `surfaces.image`. Optional `decenter` is spread only when present.
4. Returns `[objectRow, ...surfaceRows, imageRow]`.
*/
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
    label: s.label,
    curvatureRadius: s.curvatureRadius,
    thickness: s.thickness,
    medium: s.medium,
    manufacturer: s.manufacturer,
    semiDiameter: s.semiDiameter,
    ...(s.clear_aperture !== undefined ? { clear_aperture: s.clear_aperture } : {}),
    ...(s.edge_aperture !== undefined ? { edge_aperture: s.edge_aperture } : {}),
    ...(s.aspherical !== undefined ? { aspherical: s.aspherical } : {}),
    ...(s.decenter !== undefined ? { decenter: s.decenter } : {}),
    ...(s.diffractionGrating !== undefined ? { diffractionGrating: s.diffractionGrating } : {}),
  }));

  const imageRow: GridRow = {
    id: IMAGE_ROW_ID,
    kind: "image",
    curvatureRadius: surfaces.image.curvatureRadius,
    ...(surfaces.image.decenter !== undefined ? { decenter: surfaces.image.decenter } : {}),
  };

  return [objectRow, ...surfaceRows, imageRow];
}

/**
### `gridRowsToSurfaces(rows)`

1. Finds the first row with `kind === "object"` → provides `object.distance`, `object.medium`, and `object.manufacturer`.
2. Finds the first row with `kind === "image"` → provides `image.curvatureRadius` and optional `image.decenter`.
3. Filters all rows with `kind === "surface"` (in order) → provides `surfaces[]`.
4. Each surface field falls back to a default when missing:

| Field | Default |
|---|---|
| `label` | `"Default"` |
| `curvatureRadius` | `0` |
| `thickness` | `0` |
| `medium` | `"air"` |
| `manufacturer` | `""` |
| `semiDiameter` | `1` |

5. Optional `clear_aperture`, `edge_aperture`, `aspherical`, `decenter`, and `diffractionGrating` are forwarded to the `Surface` object only when present.
6. `object.distance` defaults to `0`, `object.medium` defaults to `"air"`, and `object.manufacturer` defaults to `""` if the object row is missing.
7. `image.curvatureRadius` defaults to `0` if the image row is missing.
*/
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
    if (r.clear_aperture !== undefined) {
      surface.clear_aperture = r.clear_aperture;
    }
    if (r.edge_aperture !== undefined) {
      surface.edge_aperture = r.edge_aperture;
    }
    if (r.decenter !== undefined) {
      surface.decenter = r.decenter;
    }
    if (r.diffractionGrating !== undefined) {
      surface.diffractionGrating = r.diffractionGrating;
    }
    return surface;
  });

  return {
    object: {
      distance: objectRow?.objectDistance ?? 0,
      medium: objectRow?.medium ?? "air",
      manufacturer: objectRow?.manufacturer ?? "",
    },
    image: {
      curvatureRadius: imageRow?.curvatureRadius ?? 0,
      ...(imageRow?.decenter !== undefined ? { decenter: imageRow.decenter } : {}),
    },
    surfaces,
  };
}
