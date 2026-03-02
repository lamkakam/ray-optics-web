import React from "react";

interface ColDef {
  headerName?: string;
  field?: string;
  [key: string]: unknown;
}

interface AgGridReactProps {
  rowData?: Record<string, unknown>[];
  columnDefs?: ColDef[];
  getRowId?: (params: { data: Record<string, unknown> }) => string;
  onRowSelected?: (event: unknown) => void;
  [key: string]: unknown;
}

export function AgGridReact({ rowData, columnDefs }: AgGridReactProps) {
  return (
    <table data-testid="ag-grid-mock">
      <thead>
        <tr>
          {columnDefs?.map((col, i) => (
            <th key={i}>{col.headerName ?? col.field ?? ""}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowData?.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {columnDefs?.map((col, colIdx) => (
              <td key={colIdx}>
                {col.field ? String(row[col.field] ?? "") : ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
