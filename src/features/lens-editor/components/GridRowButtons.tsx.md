# `features/lens-editor/components/GridRowButtons.tsx`

## Purpose

Renders a compact pair of "insert" (+) and "delete" (−) icon buttons with portal tooltips. Used as an action cell inside AG Grid rows for tables that support row insertion and deletion.

## Props

```ts
interface GridRowButtonsProps {
  onAdd?: () => void;
  onDelete?: () => void;
  addHidden?: boolean;
  addLabel?: string;
  deleteLabel?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onAdd` | `() => void` | No | Insert callback. Button is omitted entirely if `undefined` |
| `onDelete` | `() => void` | No | Delete callback. Button is omitted entirely if `undefined` |
| `addHidden` | `boolean` | No | When `true`, add button is present in DOM but `visibility: hidden` (preserves layout when at row limit) |
| `addLabel` | `string` | No | Tooltip and aria-label for add button. Defaults to `"Insert row"` |
| `deleteLabel` | `string` | No | Tooltip and aria-label for delete button. Defaults to `"Delete row"` |

## Key Behaviors

- Buttons are conditionally rendered based on callback presence, keeping the cell uncluttered for object/image rows.

## Usages

```tsx
import { GridRowButtons } from "@/features/lens-editor/components/GridRowButtons";

// In an AG Grid cellRenderer
const columnDefs = [
  {
    headerName: "",
    field: "kind",
    width: 100,
    cellRenderer: (params: { data: GridRow }) => {
      const { kind, id } = params.data;
      return (
        <GridRowButtons
          onAdd={kind !== "image" ? () => onAddRowAfter(id) : undefined}
          onDelete={kind === "surface" ? () => onDeleteRow(id) : undefined}
        />
      );
    },
  },
  // ... other columns
];
```
