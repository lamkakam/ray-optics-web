import React from "react";

type TableColumnAlignment = "left" | "right";

interface TableProps {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number | React.ReactNode)[])[];
  readonly columnAlignments?: readonly TableColumnAlignment[];
}

function getAlignmentClass(alignment: TableColumnAlignment | undefined): string {
  return alignment === "right" ? "text-right" : "text-left";
}

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
