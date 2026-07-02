import React, { useLayoutEffect, useRef, useState } from "react";

interface ColDef {
  headerName?: string;
  field?: string;
  width?: number;
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
  onCellEditingStarted?: (event: unknown) => void;
  onCellEditingStopped?: (event: unknown) => void;
  stopEditingWhenCellsLoseFocus?: boolean;
  theme?: unknown;
  domLayout?: string;
  [key: string]: unknown;
}

const rowObjectIds = new WeakMap<Record<string, unknown>, string>();
let nextRowObjectId = 0;

function getRowKey(row: Record<string, unknown>, rowIdx: number, getRowId: AgGridReactProps["getRowId"]) {
  if (getRowId !== undefined) {
    return getRowId({ data: row });
  }

  const existingId = rowObjectIds.get(row);
  if (existingId !== undefined) {
    return existingId;
  }

  const nextId = `row-object-${rowIdx}-${nextRowObjectId}`;
  nextRowObjectId += 1;
  rowObjectIds.set(row, nextId);
  return nextId;
}

function commitValue(col: ColDef, row: Record<string, unknown>, value: unknown, inputValue: string) {
  const oldValue = value;
  let newValue: unknown = inputValue;
  if (col.valueParser) {
    newValue = col.valueParser({ newValue: inputValue, oldValue });
  }
  if (col.valueSetter) {
    col.valueSetter({ data: row, newValue, oldValue });
  }
}

function EditableCell({
  col,
  row,
  value,
  stopEditingWhenCellsLoseFocus,
  onCellEditingStarted,
  onCellEditingStopped,
}: {
  col: ColDef;
  row: Record<string, unknown>;
  value: unknown;
  stopEditingWhenCellsLoseFocus: boolean;
  onCellEditingStarted?: (event: unknown) => void;
  onCellEditingStopped?: (event: unknown) => void;
}) {
  const [inputValue, setInputValue] = useState(String(value ?? ""));
  const isEditingRef = useRef(false);

  const startEditing = () => {
    if (isEditingRef.current) {
      return;
    }
    isEditingRef.current = true;
    onCellEditingStarted?.({ data: row, value, colDef: col });
  };

  const stopEditing = () => {
    if (!isEditingRef.current) {
      return;
    }
    isEditingRef.current = false;
    onCellEditingStopped?.({ data: row, value, colDef: col });
  };

  const handleBlur = () => {
    if (stopEditingWhenCellsLoseFocus) {
      commitValue(col, row, value, inputValue);
    }
    stopEditing();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitValue(col, row, value, inputValue);
      stopEditing();
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onFocus={startEditing}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

function SelectCell({
  col,
  row,
  value,
  headerName,
  onCellEditingStarted,
  onCellEditingStopped,
}: {
  col: ColDef;
  row: Record<string, unknown>;
  value: unknown;
  headerName: string;
  onCellEditingStarted?: (event: unknown) => void;
  onCellEditingStopped?: (event: unknown) => void;
}) {
  const values = col.cellEditorParams?.values ?? [];
  const isEditingRef = useRef(false);

  const startEditing = () => {
    if (isEditingRef.current) {
      return;
    }
    isEditingRef.current = true;
    onCellEditingStarted?.({ data: row, value, colDef: col });
  };

  const stopEditing = () => {
    if (!isEditingRef.current) {
      return;
    }
    isEditingRef.current = false;
    onCellEditingStopped?.({ data: row, value, colDef: col });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const oldValue = value;
    if (col.valueSetter) {
      col.valueSetter({ data: row, newValue, oldValue });
    }
    stopEditing();
  };

  return (
    <select
      aria-label={headerName}
      value={String(value ?? "")}
      onFocus={startEditing}
      onChange={handleChange}
      onBlur={stopEditing}
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

export function AgGridReact({
  rowData,
  columnDefs,
  defaultColDef,
  getRowId,
  onCellEditingStarted,
  onCellEditingStopped,
  stopEditingWhenCellsLoseFocus = false,
  theme,
  domLayout,
}: AgGridReactProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const previousColumnDefsRef = useRef<ColDef[] | undefined>(undefined);
  const themeName = theme && typeof theme === "object" && "_name" in theme ? (theme as { _name: string })._name : undefined;

  useLayoutEffect(() => {
    const previousColumnDefs = previousColumnDefsRef.current;
    previousColumnDefsRef.current = columnDefs;

    if (previousColumnDefs === undefined || previousColumnDefs === columnDefs) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && tableRef.current?.contains(activeElement) === true) {
      activeElement.blur();
    }
  }, [columnDefs]);

  return (
    <table
      ref={tableRef}
      data-testid="ag-grid-mock"
      data-theme={themeName}
      data-dom-layout={domLayout}
      data-stop-editing-when-cells-lose-focus={String(stopEditingWhenCellsLoseFocus)}
      data-default-col-def-suppress-movable={String(defaultColDef?.suppressMovable === true)}
      data-default-col-def-sortable={String(defaultColDef?.sortable === true)}
      data-has-on-cell-editing-started={String(onCellEditingStarted !== undefined)}
      data-has-on-cell-editing-stopped={String(onCellEditingStopped !== undefined)}
    >
      <thead>
        <tr>
          {columnDefs?.map((col, i) => (
            <th
              key={i}
              data-pinned={typeof col.pinned === "string" ? col.pinned : undefined}
              data-width={col.width}
            >
              {col.headerName ?? col.field ?? ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowData?.map((row, rowIdx) => {
          const rowKey = getRowKey(row, rowIdx, getRowId);

          return (
            <tr key={rowKey}>
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
                        ? (
                            <SelectCell
                              col={col}
                              row={row}
                              value={value}
                              headerName={col.headerName ?? col.field ?? ""}
                              onCellEditingStarted={onCellEditingStarted}
                              onCellEditingStopped={onCellEditingStopped}
                            />
                          )
                        : isEditable
                          ? (
                              <EditableCell
                                col={col}
                                row={row}
                                value={value}
                                stopEditingWhenCellsLoseFocus={stopEditingWhenCellsLoseFocus}
                                onCellEditingStarted={onCellEditingStarted}
                                onCellEditingStopped={onCellEditingStopped}
                              />
                            )
                          : col.valueFormatter
                            ? col.valueFormatter({ value })
                            : String(value ?? "")}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
