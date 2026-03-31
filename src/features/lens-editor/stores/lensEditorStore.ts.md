# `store/lensEditorStore.ts`

## Purpose

Zustand store for managing the lens editor grid and its associated modals. Holds the array of `GridRow` objects displayed in the surface table and coordinates selection, insertion, deletion, and modal open/close state.

## Exports

- `LensEditorState` — interface describing all state fields and actions.
- `createLensEditorSlice` — `StateCreator<LensEditorState>` for composition.
- `useLensEditorStore` — concrete Zustand store created from the slice (ready-to-use hook).

## State

| Field | Type | Default |
|---|---|---|
| `rows` | `GridRow[]` | `[OBJECT_ROW, IMAGE_ROW]` |
| `selectedRowId` | `string \| undefined` | `undefined` |
| `autoAperture` | `boolean` | `false` |
| `mediumModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `asphericalModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `decenterModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `committedOpticalModel` | `OpticalModel \| undefined` | `undefined` |

## Actions

- `setRows(rows)` — replaces the entire rows array (used when loading a model).
- `updateRow(id, patch)` — merges `patch` into the row with the given id; `id` and `kind` are always preserved and cannot be overwritten by the patch.
- `addRowAfter(id)` — inserts a new blank surface row immediately after the row with the given id; no-op if the id is not found or the target row is the image row.
- `deleteRow(id)` — removes the surface row with the given id; no-op for object/image rows. Clears `selectedRowId` if it matches the deleted row.
- `setSelectedRowId(id)` — sets or clears the selected row.
- `setAutoAperture(value)` — sets the auto-aperture flag.
- `openMediumModal(rowId)` / `closeMediumModal()` — open/close the glass medium picker modal, storing the target row id.
- `openAsphericalModal(rowId)` / `closeAsphericalModal()` — open/close the aspherical coefficients modal.
- `openDecenterModal(rowId)` / `closeDecenterModal()` — open/close the surface decenter modal.
- `setCommittedOpticalModel(model)` — stores the last successfully submitted `OpticalModel` snapshot. Used by `AnalysisPlotContainer` and other consumers that need the most recently committed model.

## Key Conventions

- Object and image rows (`kind === "object"` / `kind === "image"`) cannot be deleted or added after (image guard in `addRowAfter`).
- New rows inserted by `addRowAfter` are seeded with `generateRowId()` and default surface values: flat (`curvatureRadius: 0`), zero thickness, `"air"` medium, `semiDiameter: 1`.
- Modal `rowId` is reset to `""` on close.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `GridRow`, `OBJECT_ROW_ID`, `IMAGE_ROW_ID` from `lib/gridTypes`.
- `generateRowId` from `lib/gridTransform`.
- `OpticalModel` from `lib/opticalModel`.

## Usages

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "@/store/createStore";
import type { LensEditorState } from "@/store/lensEditorStore";
import { createLensEditorSlice } from "@/store/lensEditorStore";
import { LensPrescriptionGrid } from "@/features/lens-editor/components/LensPrescriptionGrid";

export default function LensEditorPage() {
  // Create the store once
  const lensEditorStore = useMemo(
    () => createStore<LensEditorState>(createLensEditorSlice),
    []
  );

  // Read state
  const rows = useStore(lensEditorStore, (s) => s.rows);
  const selectedRowId = useStore(lensEditorStore, (s) => s.selectedRowId);
  const autoAperture = useStore(lensEditorStore, (s) => s.autoAperture);

  // Dispatch actions
  const handleSelectRow = (rowId: string) => {
    lensEditorStore.getState().setSelectedRowId(rowId);
  };

  const handleAddRow = (afterRowId: string) => {
    lensEditorStore.getState().addRowAfter(afterRowId);
  };

  const handleDeleteRow = (rowId: string) => {
    lensEditorStore.getState().deleteRow(rowId);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={autoAperture}
          onChange={(e) =>
            lensEditorStore.getState().setAutoAperture(e.target.checked)
          }
        />
        Auto Aperture
      </label>

      <LensPrescriptionGrid
        rows={rows}
        selectedRowId={selectedRowId}
        onSelectRow={handleSelectRow}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
      />
    </div>
  );
}
```
