# `features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionGrid/LensPrescriptionGrid.tsx`

## Purpose

AG Grid table for editing the lens prescription. Displays and edits surface rows (object, surface, image) with columns for surface index, surface label, radius of curvature, thickness, medium, semi-diameter, aspherical, tilt/decenter, and diffraction grating. Row action buttons appear in a leading column.

## Props

```ts
interface LensPrescriptionGridProps {
  rows: GridRow[];
  onRowChange: (id: string, patch: Partial<GridRow>) => void;
  onOpenMediumModal: (rowId: string) => void;
  onOpenAsphericalModal: (rowId: string) => void;
  onOpenDecenterModal: (rowId: string) => void;
  onOpenDiffractionGratingModal: (rowId: string) => void;
  onOpenApertureModal: (rowId: string) => void;
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
| `onOpenApertureModal` | `(rowId) => void` | Yes | Opens `ApertureModal` for the given surface row |
| `onAddRowAfter` | `(rowId) => void` | Yes | Inserts a new surface row after the given row |
| `onDeleteRow` | `(rowId) => void` | Yes | Deletes the given surface row |
| `semiDiameterReadonly` | `boolean` | No | When `true`, semi-diameter column is read-only and dimmed (auto-aperture mode) |

## Key Behaviors

- Column definitions are memoized with `useMemo` over the callback props to avoid unnecessary AG Grid re-renders.
- The leading row action column remains editor-specific.
- A read-only `Index` column appears immediately after the leading row action column and before `Surface`; it is pinned left through the shared lens prescription grid `Index` column config.
- The `Index` column is display-only. It derives continuous one-based numbering from the current `rows` order, counting only `surface` rows; Object and Image rows render blank index cells.
- Common prescription columns are composed from `shared/lib/lens-prescription-grid` so Lens Editor and Optimization use the same value getters, numeric parsing, cell renderers, and AG Grid defaults.
- The `Index`, `Surface`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Aperture`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths come from `shared/lib/lens-prescription-grid`; the leading row action column remains editor-specific at `100px`.
- Shared `MediumCell`, `ApertureCell`, `AsphericalCell`, `DecenterCell`, and `DiffractionGratingCell` render inside `LensPrescriptionActionWrapper`, which opens the modal when the non-interactive cell body is clicked.
- `AsphericalCell`, `DecenterCell`, and `DiffractionGratingCell` display text labels (`None`, asphere type labels, decenter strategy values, and `${lpmm} lp/mm`) instead of set/unset status text.
- The Medium column renders for the Object row and all surface rows; the Image row remains blank in that column.
- Only surface-kind rows get a delete button; object/image rows only get an add button or neither.
- The diffraction grating column renders only for `surface` rows.
- The aperture column renders immediately after `Semi-diam.` and only for `surface` rows.
- Number parsing rejects non-numeric input and restores the old value.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending numeric cell edits are committed before another grid action such as opening a modal or inserting/deleting a row is handled.
- Applies shared AG Grid column config with `defaultColDef={{ sortable: false, suppressMovable: true }}` and AG Grid's normal layout so the grid owns vertical row scrolling.
- Keeps AG Grid's native touch handling enabled so resizable header handles respond to touchscreen drags. The shared `ag-grid-touch-scroll` coarse-pointer styles continue to provide native horizontal and vertical panning, iOS momentum scrolling, and scroll chaining on viewport areas; AG Grid owns gestures that begin on resize handles.
- Uses `h-[calc(100vh-160px)]` below `1440px`; at `1440px` and above it fills the remaining flex-column drawer-panel height with a `200px` minimum.

## Usages

```tsx
import { LensPrescriptionGrid } from "@/features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionGrid";

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
      onOpenApertureModal={handleOpenApertureModal}
      onOpenDecenterModal={handleOpenDecenterModal}
      onAddRowAfter={handleAddRowAfter}
      onDeleteRow={handleDeleteRow}
      semiDiameterReadonly={autoAperture}
    />
  </>
);
```
