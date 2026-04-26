# `features/lens-editor/components/LensPrescriptionGrid.tsx`

## Purpose

AG Grid table for editing the lens prescription. Displays and edits surface rows (object, surface, image) with columns for surface label, radius of curvature, thickness, medium, semi-diameter, aspherical, tilt/decenter, and diffraction grating. Row action buttons appear in a leading column.

## Props

```ts
interface LensPrescriptionGridProps {
  rows: GridRow[];
  onRowChange: (id: string, patch: Partial<GridRow>) => void;
  onOpenMediumModal: (rowId: string) => void;
  onOpenAsphericalModal: (rowId: string) => void;
  onOpenDecenterModal: (rowId: string) => void;
  onOpenDiffractionGratingModal: (rowId: string) => void;
  onAddRowAfter: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  semiDiameterReadonly?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rows` | `GridRow[]` | Yes | Flat array of grid rows from the lens editor store |
| `onRowChange` | `(id, patch) => void` | Yes | Partial update for a row field |
| `onOpenMediumModal` | `(rowId) => void` | Yes | Opens `MediumSelectorModal` for the given row |
| `onOpenAsphericalModal` | `(rowId) => void` | Yes | Opens `AsphericalModal` for the given row |
| `onOpenDecenterModal` | `(rowId) => void` | Yes | Opens `DecenterModal` for the given row |
| `onOpenDiffractionGratingModal` | `(rowId) => void` | Yes | Opens `DiffractionGratingModal` for the given surface row |
| `onAddRowAfter` | `(rowId) => void` | Yes | Inserts a new surface row after the given row |
| `onDeleteRow` | `(rowId) => void` | Yes | Deletes the given surface row |
| `semiDiameterReadonly` | `boolean` | No | When `true`, semi-diameter column is read-only and dimmed (auto-aperture mode) |

## Key Behaviors

- Column definitions are memoized with `useMemo` over the callback props to avoid unnecessary AG Grid re-renders.
- The leading row action column remains editor-specific.
- Common prescription columns are composed from `shared/lib/lens-prescription-grid` so Lens Editor and Optimization use the same value getters, numeric parsing, cell renderers, and AG Grid defaults.
- Shared `MediumCell`, `AsphericalCell`, `DecenterCell`, and `DiffractionGratingCell` render inside `LensPrescriptionActionWrapper`, which opens the modal when the non-interactive cell body is clicked.
- The Medium column renders for the Object row and all surface rows; the Image row remains blank in that column.
- Only surface-kind rows get a delete button; object/image rows only get an add button or neither.
- The diffraction grating column renders only for `surface` rows.
- Number parsing rejects non-numeric input and restores the old value.
- Applies shared AG Grid config: `defaultColDef={{ sortable: false, suppressMovable: true }}` and `domLayout="autoHeight"`.

## Usages

```tsx
import { LensPrescriptionGrid } from "@/features/lens-editor/components/LensPrescriptionGrid";

// In a container component (e.g., LensPrescriptionContainer)
const rows = useStore(store, (s) => s.rows);

const handleRowChange = useCallback(
  (id: string, patch: Partial<GridRow>) => store.getState().updateRow(id, patch),
  [store]
);

const handleOpenMediumModal = useCallback(
  (rowId: string) => store.getState().openMediumModal(rowId),
  [store]
);

return (
  <>
    <LensPrescriptionGrid
      rows={rows}
      onRowChange={handleRowChange}
      onOpenMediumModal={handleOpenMediumModal}
      onOpenAsphericalModal={handleOpenAsphericalModal}
      onOpenDecenterModal={handleOpenDecenterModal}
      onAddRowAfter={handleAddRowAfter}
      onDeleteRow={handleDeleteRow}
      semiDiameterReadonly={autoAperture}
    />
  </>
);
```
