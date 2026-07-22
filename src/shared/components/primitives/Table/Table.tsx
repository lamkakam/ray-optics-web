/**
# `shared/components/primitives/Table/Table.tsx`
*/
import React from "react";

type TableColumnAlignment = "left" | "right";

interface TableProps {
  /** Column header labels */
  readonly headers: readonly string[];
  /** Row data; each cell may be a string, number, or React node */
  readonly rows: readonly (readonly (string | number | React.ReactNode)[])[];
  /** Optional per-column text alignment applied to both header and body cells; unspecified columns default to left alignment */
  readonly columnAlignments?: readonly TableColumnAlignment[];
}

function getAlignmentClass(alignment: TableColumnAlignment | undefined): string {
  return alignment === "right" ? "text-right" : "text-left";
}

/**
## Purpose

Simple read-only HTML table with a header row and data rows. Accepts generic cell content including React nodes for formatted values.

## Key Behaviors

- Row keys fall back to index since rows have no stable id.
- Header and body cells share the same per-column alignment so numeric columns can be right-aligned consistently.
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
*/
export function Table({ headers, rows, columnAlignments }: TableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          {headers.map((h, index) => (
            <th
              key={h}
              className={`py-2 pr-3 ${getAlignmentClass(columnAlignments?.[index])} font-medium text-gray-400 first:pl-0`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-white/5">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`py-2 pr-3 ${getAlignmentClass(columnAlignments?.[j])} first:pl-0`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
