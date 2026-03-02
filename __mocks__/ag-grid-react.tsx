import React from "react";

interface ColDef {
  headerName?: string;
  field?: string;
  cellRenderer?: (params: { data: Record<string, unknown>; value: unknown }) => React.ReactNode;
  [key: string]: unknown;
}

interface AgGridReactProps {
  rowData?: Record<string, unknown>[];
  columnDefs?: ColDef[];
  getRowId?: (params: { data: Record<string, unknown> }) => string;
  onRowSelected?: (event: unknown) => void;
  [key: string]: unknown;
}

export function AgGridProvider({ children }: { children: React.ReactNode; modules?: unknown[] }) {
  return <>{children}</>;
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
                {col.cellRenderer
                  ? col.cellRenderer({
                      data: row,
                      value: col.field ? row[col.field] : undefined,
                    })
                  : col.field
                    ? String(row[col.field] ?? "")
                    : ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
