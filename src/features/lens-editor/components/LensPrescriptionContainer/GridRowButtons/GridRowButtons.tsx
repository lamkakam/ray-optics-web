/**
# `features/lens-editor/components/LensPrescriptionContainer/GridRowButtons/GridRowButtons.tsx`
*/
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface GridRowButtonsProps {
  /** Insert callback. Button is omitted entirely if `undefined` */
  readonly onAdd?: () => void;
  /** Delete callback. Button is omitted entirely if `undefined` */
  readonly onDelete?: () => void;
  /** When `true`, add button is present in DOM but `visibility: hidden` (preserves layout when at row limit) */
  readonly addHidden?: boolean;
  /** Tooltip and aria-label for add button. Defaults to `"Insert row"` */
  readonly addLabel?: string;
  /** Tooltip and aria-label for delete button. Defaults to `"Delete row"` */
  readonly deleteLabel?: string;
}

/**
## Purpose

Renders a compact pair of "insert" (+) and "delete" (−) icon buttons with portal tooltips. Used as an action cell inside AG Grid rows for tables that support row insertion and deletion.

## Key Behaviors

- Buttons are conditionally rendered based on callback presence, keeping the cell uncluttered for object/image rows.

## Usages

```tsx
import { GridRowButtons } from "@/features/lens-editor/components/LensPrescriptionContainer";

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
*/
export function GridRowButtons({
  onAdd,
  onDelete,
  addHidden,
  addLabel = "Insert row",
  deleteLabel = "Delete row",
}: GridRowButtonsProps) {
  return (
    <span className="flex items-center gap-2">
      {onAdd !== undefined && (
        <Tooltip text={addLabel} portal noTouch>
          <Button
            variant="secondary"
            size="sm"
            className="rounded"
            title={addLabel}
            aria-label={addLabel}
            style={addHidden ? { visibility: "hidden" } : undefined}
            onClick={onAdd}
          >
            +
          </Button>
        </Tooltip>
      )}
      {onDelete !== undefined && (
        <Tooltip text={deleteLabel} portal noTouch>
          <Button
            variant="secondary"
            size="sm"
            className="rounded"
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={onDelete}
          >
            −
          </Button>
        </Tooltip>
      )}
    </span>
  );
}
