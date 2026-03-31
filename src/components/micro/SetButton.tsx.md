# `components/micro/SetButton.tsx`

## Purpose

Toggle indicator button that switches between `primary` and `secondary` variants to communicate a "set / not set" state. Used as the inner element of AG Grid cell renderers that open a configuration modal.

## Props

```ts
interface SetButtonProps {
  isSet: boolean;
  onClick: () => void;
  "aria-label": string;
  setLabel?: string;
  unsetLabel?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isSet` | `boolean` | Yes | When `true`, renders as primary variant with `setLabel` |
| `onClick` | `() => void` | Yes | Click handler — typically opens a configuration modal |
| `"aria-label"` | `string` | Yes | Accessible label for the button |
| `setLabel` | `string` | No | Label when set. Defaults to `"Set"` |
| `unsetLabel` | `string` | No | Label when not set. Defaults to `"—"` |

## Key Behaviors

- Always size `xs`; variant flips between `primary` (set) and `secondary` (unset).

## Usages

```tsx
// Cell renderer for Tilt & Decenter column
const DecenterCellRenderer = ({ isDecenterSet, onOpenModal }) => (
  <Tooltip text="Configure tilt and decenter" portal noTouch>
    <SetButton
      isSet={isDecenterSet}
      onClick={onOpenModal}
      aria-label="Tilt and decenter settings"
    />
  </Tooltip>
);

// Cell renderer with custom labels
<SetButton
  isSet={hasAspherics}
  onClick={onEditAspherics}
  aria-label="Aspheric surface definition"
  setLabel="Edit"
  unsetLabel="Add"
/>

// Usage in AG Grid column definition
{
  headerName: "Decenter",
  field: "decenter",
  cellRenderer: DecenterCellRenderer,
  width: 80,
}
```
