# `components/micro/Table.tsx`

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

- Used for displaying simple tabulated data.
