# `components/micro/AsphericalCell.tsx`

## Purpose

AG Grid cell renderer for the Asph. column. Renders a `SetButton` inside a portal tooltip to indicate and toggle aspherical parameters.

## Props

```ts
interface AsphericalCellProps {
  isAspherical: boolean;
  onOpenModal: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isAspherical` | `boolean` | Yes | `true` when the surface has aspherical data set |
| `onOpenModal` | `() => void` | Yes | Callback to open the modal for aspherical surface parameters config  |

## Key Behaviors

- Delegates visual state (set vs. unset) entirely to `SetButton`.
- Uses `portal` tooltip mode for correct rendering inside AG Grid.

## Usages

- Used as a `cellRenderer` in `LensPrescriptionGrid`.
