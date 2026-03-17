import React from "react";

interface TableProps {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number | React.ReactNode)[])[];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          {headers.map((h) => (
            <th key={h} className="py-2 pr-3 text-left font-medium text-gray-400 first:pl-0">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-white/5">
            {row.map((cell, j) => (
              <td key={j} className="py-2 pr-3 first:pl-0">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
