# `components/composite/LensPrescriptionGrid.tsx`

## Purpose

AG Grid table for editing the lens prescription. Displays and edits surface rows (object, surface, image) with columns for surface label, radius of curvature, thickness, medium, semi-diameter, aspherical, and tilt/decenter. Row action buttons appear in a leading column.

## Props

```ts
interface LensPrescriptionGridProps {
  rows: GridRow[];
  onRowChange: (id: string, patch: Partial<GridRow>) => void;
  onOpenMediumModal: (rowId: string) => void;
  onOpenAsphericalModal: (rowId: string) => void;
  onOpenDecenterModal: (rowId: string) => void;
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
| `onAddRowAfter` | `(rowId) => void` | Yes | Inserts a new surface row after the given row |
| `onDeleteRow` | `(rowId) => void` | Yes | Deletes the given surface row |
| `semiDiameterReadonly` | `boolean` | No | When `true`, semi-diameter column is read-only and dimmed (auto-aperture mode) |

## Key Behaviors

- Column definitions are memoized with `useMemo` over the callback props to avoid unnecessary AG Grid re-renders.
- `MediumCell`, `AsphericalCell`, and `DecenterCell` are wrapped in an `ActionWrapper` div that opens the modal on background click (in case the inner element doesn't capture it).
- Only surface-kind rows get a delete button; object/image rows only get an add button or neither.
- Number parsing rejects non-numeric input and restores the old value.

## Usages

- Rendered by `LensPrescriptionContainer`.
