import React, { useState } from "react";

interface ColDef {
  headerName?: string;
  field?: string;
  editable?: boolean | ((params: { data: Record<string, unknown> }) => boolean);
  cellRenderer?: (params: { data: Record<string, unknown>; value: unknown }) => React.ReactNode;
  valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
  valueParser?: (params: { newValue: string; oldValue: unknown }) => unknown;
  valueSetter?: (params: { data: Record<string, unknown>; newValue: unknown; oldValue: unknown }) => boolean;
  [key: string]: unknown;
}

interface AgGridReactProps {
  rowData?: Record<string, unknown>[];
  columnDefs?: ColDef[];
  getRowId?: (params: { data: Record<string, unknown> }) => string;
  onRowSelected?: (event: unknown) => void;
  [key: string]: unknown;
}

function EditableCell({
  col,
  row,
  value,
}: {
  col: ColDef;
  row: Record<string, unknown>;
  value: unknown;
}) {
  const [inputValue, setInputValue] = useState(String(value ?? ""));

  const handleBlur = () => {
    const oldValue = value;
    let newValue: unknown = inputValue;
    if (col.valueParser) {
      newValue = col.valueParser({ newValue: inputValue, oldValue });
    }
    if (col.valueSetter) {
      col.valueSetter({ data: row, newValue, oldValue });
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
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
            {columnDefs?.map((col, colIdx) => {
              const value = col.valueGetter
                ? col.valueGetter({ data: row })
                : col.field
                  ? row[col.field]
                  : undefined;

              const isEditable =
                typeof col.editable === "function"
                  ? col.editable({ data: row })
                  : col.editable === true;

              return (
                <td key={colIdx}>
                  {col.cellRenderer
                    ? col.cellRenderer({ data: row, value })
                    : isEditable
                      ? <EditableCell col={col} row={row} value={value} />
                      : String(value ?? "")}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
