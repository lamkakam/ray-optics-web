# `features/lens-editor/stores/lensEditorStore.ts`

## Purpose

Zustand store for managing the lens editor grid and its associated modals. Holds the array of `GridRow` objects displayed in the surface table and coordinates selection, insertion, deletion, and modal open/close state.

## Exports

- `LensEditorState` — interface describing all state fields and actions.
- `createLensEditorSlice` — `StateCreator<LensEditorState>` for composition.

## State

| Field | Type | Default |
|---|---|---|
| `rows` | `GridRow[]` | `[OBJECT_ROW, IMAGE_ROW]` |
| `selectedRowId` | `string \| undefined` | `undefined` |
| `autoAperture` | `boolean` | `false` |
| `activeBottomDrawerTabId` | `string` | `"specs"` |
| `bottomDrawerHeight` | `number \| undefined` | `undefined` |
| `mediumModal` | `{ open: boolean; rowId: string }` | `{ open: false, rowId: "" }` |
| `pendingMediumSelection` | `{ rowId: string; medium: string; manufacturer: string } \| undefined` | `undefined` |
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
- `setActiveBottomDrawerTabId(id)` — records the currently selected Lens Editor bottom-drawer tab so the same tab can be restored after navigating away and back.
- `setBottomDrawerHeight(height)` — records the most recently committed bottom-drawer height so the drawer can restore its size after navigating away and back.
- `openMediumModal(rowId)` — opens the glass medium picker modal and seeds `pendingMediumSelection` from the row’s confirmed medium/manufacturer.
- `updatePendingMediumSelection(patch)` — updates the unconfirmed catalog-glass selection while the medium modal is open.
- `commitPendingMediumSelection(selection?)` — writes the confirmed selection to the target row, then clears the pending draft and closes the modal. Optional `selection` allows model-glass values to bypass the catalog draft.
- `closeMediumModal()` — closes the medium modal and discards the pending draft.
- `openAsphericalModal(rowId)` / `closeAsphericalModal()` — open/close the aspherical coefficients modal.
- `openDecenterModal(rowId)` / `closeDecenterModal()` — open/close the surface decenter modal.
- `setCommittedOpticalModel(model)` — stores the last successfully submitted `OpticalModel` snapshot. Used by `AnalysisPlotContainer` and other consumers that need the most recently committed model.

## Key Conventions

- Object and image rows (`kind === "object"` / `kind === "image"`) cannot be deleted or added after (image guard in `addRowAfter`).
- New rows inserted by `addRowAfter` are seeded with `generateRowId()` and default surface values: flat (`curvatureRadius: 0`), zero thickness, `"air"` medium, `semiDiameter: 1`.
- Modal `rowId` is reset to `""` on close.
- `pendingMediumSelection` persists unconfirmed catalog-glass choices across route changes while the root store provider remains mounted.
- `activeBottomDrawerTabId` and `bottomDrawerHeight` are feature-owned UI state. They persist as long as the root store provider remains mounted.
- `bottomDrawerHeight` is persistence-only state for route restoration; `BottomDrawer` still owns live drag state locally to avoid store-driven re-renders on every pointer move.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `GridRow`, `OBJECT_ROW_ID`, `IMAGE_ROW_ID` from `@/shared/lib/types/gridTypes`.
- `generateRowId` from `@/shared/lib/utils/gridTransform`.
- `OpticalModel` from `@/shared/lib/types/opticalModel`.

## Usages

Used through `LensEditorStoreProvider` and `useLensEditorStore()` rather than as a standalone exported hook from this file.
