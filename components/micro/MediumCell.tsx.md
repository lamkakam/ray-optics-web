# `components/micro/MediumCell.tsx`

## Purpose

AG Grid cell renderer for the Medium column. Displays the medium name as a clickable button with a tooltip that opens the medium-selector modal.

## Props

```ts
interface MediumCellProps {
  medium: string;
  onOpenModal: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `medium` | `string` | Yes | Medium name to display (e.g. `"air"`, `"N-BK7"`) |
| `onOpenModal` | `() => void` | Yes | Callback to open a `Modal` instance for medium selection |

## Key Behaviors

- Uses `portal` mode on `Tooltip` because it is rendered inside AG Grid's overflow-hidden row.

## Usages

- Used as a `cellRenderer` in `LensPrescriptionGrid`.
