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

```tsx
// AG Grid column definition for Medium
{
  headerName: "Medium",
  field: "medium",
  width: 120,
  cellRenderer: (params) => (
    <MediumCell
      medium={params.data.medium}
      onOpenModal={() => openMediumModal(params.rowIndex)}
    />
  ),
}

// In grid configuration
<AgGridReact
  columnDefs={[
    {
      headerName: "Material",
      field: "medium",
      cellRenderer: MediumCellRenderer,
    },
    // ... other columns
  ]}
  rowData={surfaceData}
/>

// Cell renderer function
const MediumCellRenderer = (params) => (
  <MediumCell
    medium={params.data.medium}
    onOpenModal={() => {
      setSelectedSurfaceIndex(params.rowIndex);
      setMediumModalOpen(true);
    }}
  />
);
```
