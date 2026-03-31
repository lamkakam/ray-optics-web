# `shared/components/primitives/Table.tsx`

## Purpose

Simple read-only HTML table with a header row and data rows. Accepts generic cell content including React nodes for formatted values.

## Props

```ts
interface TableProps {
  headers: readonly string[];
  rows: readonly (readonly (string | number | React.ReactNode)[])[];
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `headers` | `readonly string[]` | Yes | Column header labels |
| `rows` | `readonly (...)[]` | Yes | Row data; each cell may be a string, number, or React node |

## Key Behaviors

- Row keys fall back to index since rows have no stable id.
- No sorting, filtering, or pagination — purely a display table.

## Usages

```tsx
// Optical aberration metrics table
<Table
  headers={["Name", "Value", "Status"]}
  rows={[
    ["Spherical Aberration", "0.100000", <Chip>Low</Chip>],
    ["Coma", 0.2, <Chip>Medium</Chip>],
    ["Astigmatism", "0.050000", <Chip>Low</Chip>],
  ]}
/>

// First-order data table
const firstOrderData = [
  ["EFL", "100.00 mm"],
  ["BFL", "95.45 mm"],
  ["f/#", "4.0"],
  ["Image Height", "21.6 mm"],
];

<Table
  headers={["Parameter", "Value"]}
  rows={firstOrderData}
/>

// Mix of different cell types
<Table
  headers={["Parameter", "Value", "Unit"]}
  rows={[
    ["Focal Length", 100, "mm"],
    ["Aperture", "f/4", "—"],
    ["Field of View", 20, "°"],
  ]}
/>
```
