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

```tsx
// AG Grid column definition for Tilt & Decenter
{
  headerName: "Tilt & Decenter",
  field: "decenter",
  width: 120,
  cellRenderer: (params) => (
    <DecenterCell
      isDecenterSet={!!params.data.decenterConfig}
      onOpenModal={() => openDecenterModal(params.rowIndex)}
    />
  ),
}

// In grid configuration
<AgGridReact
  columnDefs={[
    // ... other columns
    {
      headerName: "Decenter",
      cellRenderer: DecenterCellRenderer,
    },
  ]}
  rowData={surfaceData}
/>

// Cell renderer function
const DecenterCellRenderer = (params) => (
  <DecenterCell
    isDecenterSet={params.data.hasDecenter}
    onOpenModal={() => setSelectedSurface(params.rowIndex)}
  />
);
```
