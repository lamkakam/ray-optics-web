# `shared/lib/utils/gridTransform.ts`

## Purpose

Converts between the domain `Surfaces` model and the flat `GridRow[]` representation used by the LensEditor AG Grid, and generates stable row IDs for surface rows.

## Exports

```ts
function generateRowId(): string;
function surfacesToGridRows(surfaces: Surfaces): GridRow[];
function gridRowsToSurfaces(rows: GridRow[]): Surfaces;
```

## Behavior

### `generateRowId()`

Returns a unique string of the form `"row-surface-N"` where `N` is a module-level monotonically increasing integer starting at `0`. The counter is **never reset** between calls. It is not a UUID.

### `surfacesToGridRows(surfaces)`

1. Creates one `{ kind: "object" }` row with `id = OBJECT_ROW_ID` and `objectDistance` from `surfaces.object.distance`.
2. Maps each entry in `surfaces.surfaces` to a `{ kind: "surface" }` row by calling `generateRowId()` for each ID. Optional `aspherical`, `decenter`, and `diffractionGrating` fields are spread onto the row only when present (not `undefined`).
3. Creates one `{ kind: "image" }` row with `id = IMAGE_ROW_ID` and `curvatureRadius` from `surfaces.image`. Optional `decenter` is spread only when present.
4. Returns `[objectRow, ...surfaceRows, imageRow]`.

### `gridRowsToSurfaces(rows)`

1. Finds the first row with `kind === "object"` → provides `object.distance`.
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

5. Optional `aspherical`, `decenter`, and `diffractionGrating` are forwarded to the `Surface` object only when present.
6. `object.distance` defaults to `0` if the object row is missing.
7. `image.curvatureRadius` defaults to `0` if the image row is missing.

## Dependencies

- `shared/lib/types/opticalModel.ts` — `Surfaces`, `Surface` (type-only imports)
- `shared/lib/types/gridTypes.ts` — `OBJECT_ROW_ID`, `IMAGE_ROW_ID`, `GridRow`

## Edge Cases / Error Handling

- If the object or image row is absent from `rows`, fallback defaults are used — no error is thrown.
- The module-level `nextId` counter means IDs from two separate `surfacesToGridRows` calls will never collide, but IDs are not stable across page reloads.
- `generateRowId()` is exported for testing; in production it is only called from `surfacesToGridRows`.

## Usages

```ts
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/utils/gridTransform";
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
