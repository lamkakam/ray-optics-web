# `components/micro/DecenterCell.tsx`

## Purpose

AG Grid cell renderer for the Tilt & Decenter column. Renders a `SetButton` inside a portal tooltip to indicate and toggle decenter/tilt settings.

## Props

```ts
interface DecenterCellProps {
  isDecenterSet: boolean;
  onOpenModal: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isDecenterSet` | `boolean` | Yes | `true` when `DecenterConfig` is defined for this surface |
| `onOpenModal` | `() => void` | Yes | Callback to open the modal for surface tilt and decenter parameters config |

## Key Behaviors

- Delegates visual state (set vs. unset) entirely to `SetButton`.
- Uses `portal` tooltip for AG Grid compatibility.

## Usages

- Used as a `cellRenderer` in `LensPrescriptionGrid`.
