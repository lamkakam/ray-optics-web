import React, { useState } from "react";

interface ColDef {
  headerName?: string;
  field?: string;
  editable?: boolean | ((params: { data: Record<string, unknown> }) => boolean);
  cellEditor?: string;
  cellEditorParams?: { values?: unknown[] };
  cellRenderer?: (params: { data: Record<string, unknown>; value: unknown }) => React.ReactNode;
  valueGetter?: (params: { data: Record<string, unknown> }) => unknown;
  valueFormatter?: (params: { value: unknown }) => string;
  valueParser?: (params: { newValue: string; oldValue: unknown }) => unknown;
  valueSetter?: (params: { data: Record<string, unknown>; newValue: unknown; oldValue: unknown }) => boolean;
  [key: string]: unknown;
}

interface AgGridReactProps {
  rowData?: Record<string, unknown>[];
  columnDefs?: ColDef[];
  defaultColDef?: ColDef;
  getRowId?: (params: { data: Record<string, unknown> }) => string;
  onRowSelected?: (event: unknown) => void;
  theme?: unknown;
  domLayout?: string;
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

function SelectCell({
  col,
  row,
  value,
  headerName,
}: {
  col: ColDef;
  row: Record<string, unknown>;
  value: unknown;
  headerName: string;
}) {
  const values = col.cellEditorParams?.values ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const oldValue = value;
    if (col.valueSetter) {
      col.valueSetter({ data: row, newValue, oldValue });
    }
  };

  return (
    <select
      aria-label={headerName}
      value={String(value ?? "")}
      onChange={handleChange}
    >
      {values.map((v) => (
        <option key={String(v)} value={String(v)}>
          {col.valueFormatter ? col.valueFormatter({ value: v }) : String(v)}
        </option>
      ))}
    </select>
  );
}

export function AgGridProvider({ children }: { children: React.ReactNode; modules?: unknown[] }) {
  return <>{children}</>;
}

export function AgGridReact({ rowData, columnDefs, defaultColDef, theme, domLayout }: AgGridReactProps) {
  const themeName = theme && typeof theme === "object" && "_name" in theme ? (theme as { _name: string })._name : undefined;
  return (
    <table
      data-testid="ag-grid-mock"
      data-theme={themeName}
      data-dom-layout={domLayout}
      data-default-col-def-suppress-movable={String(defaultColDef?.suppressMovable === true)}
      data-default-col-def-sortable={String(defaultColDef?.sortable === true)}
    >
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

              const isSelectEditor = col.cellEditor === "agSelectCellEditor";

              return (
                <td key={colIdx}>
                  {col.cellRenderer
                    ? col.cellRenderer({ data: row, value })
                    : isEditable && isSelectEditor
                      ? <SelectCell col={col} row={row} value={value} headerName={col.headerName ?? col.field ?? ""} />
                      : isEditable
                        ? <EditableCell col={col} row={row} value={value} />
                        : col.valueFormatter
                          ? col.valueFormatter({ value })
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
