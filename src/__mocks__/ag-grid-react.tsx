import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

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
  onGridReady?: (event: { api: MockGridApi }) => void;
  onSelectionChanged?: (event: { selectedNodes: { data: Record<string, unknown> }[]; source: "uiSelectAll" | "checkboxSelected" }) => void;
  rowSelection?: {
    mode?: string;
    checkboxes?: boolean;
    headerCheckbox?: boolean;
    selectAll?: string;
  };
  selectionColumnDef?: ColDef;
  onCellEditingStarted?: (event: unknown) => void;
  onCellEditingStopped?: (event: unknown) => void;
  stopEditingWhenCellsLoseFocus?: boolean;
  suppressTouch?: boolean;
  theme?: unknown;
  domLayout?: string;
  [key: string]: unknown;
}

interface MockGridApi {
  forEachNode: (callback: (node: MockRowNode) => void) => void;
}

interface MockRowNode {
  data: Record<string, unknown>;
  isSelected: () => boolean;
  setSelected: (selected: boolean) => void;
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

function resolveColumnFlag(col: ColDef, defaultColDef: ColDef | undefined, key: "sortable" | "filter") {
  const value = col[key] ?? defaultColDef?.[key];
  return String(value === true || (key === "filter" && typeof value === "string"));
}

function resolveFilterOptions(col: ColDef): string | undefined {
  const filterParams = col.filterParams;
  if (filterParams === undefined || filterParams === null || typeof filterParams !== "object") {
    return undefined;
  }

  const filterOptions = (filterParams as { filterOptions?: unknown }).filterOptions;
  return Array.isArray(filterOptions) ? filterOptions.map(String).join(",") : undefined;
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
  onGridReady,
  onSelectionChanged,
  rowSelection,
  selectionColumnDef,
  stopEditingWhenCellsLoseFocus = false,
  suppressTouch = false,
  theme,
  domLayout,
}: AgGridReactProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const previousColumnDefsRef = useRef<ColDef[] | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<ReadonlySet<string>>(new Set());
  const themeName = theme && typeof theme === "object" && "_name" in theme ? (theme as { _name: string })._name : undefined;
  const effectiveRowData = useMemo(() => rowData ?? [], [rowData]);
  const hasSelectionColumn = rowSelection?.mode === "multiRow";
  const showsHeaderCheckbox = hasSelectionColumn && rowSelection?.headerCheckbox !== false;
  const showsRowCheckboxes = hasSelectionColumn && rowSelection?.checkboxes !== false;

  const getSelectedRows = (selectedKeys: ReadonlySet<string>) =>
    effectiveRowData.filter((row, rowIdx) => selectedKeys.has(getRowKey(row, rowIdx, getRowId)));

  const emitSelectionChanged = (selectedKeys: ReadonlySet<string>, source: "uiSelectAll" | "checkboxSelected") => {
    onSelectionChanged?.({
      selectedNodes: getSelectedRows(selectedKeys).map((data) => ({ data })),
      source,
    });
  };

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

  useLayoutEffect(() => {
    const api: MockGridApi = {
      forEachNode: (callback) => {
        effectiveRowData.forEach((row, rowIdx) => {
          const rowKey = getRowKey(row, rowIdx, getRowId);
          callback({
            data: row,
            isSelected: () => selectedRowKeys.has(rowKey),
            setSelected: (selected) => {
              setSelectedRowKeys((previous) => {
                const next = new Set(previous);
                if (selected) {
                  next.add(rowKey);
                } else {
                  next.delete(rowKey);
                }
                return next;
              });
            },
          });
        });
      },
    };

    onGridReady?.({ api });
  }, [effectiveRowData, getRowId, onGridReady, selectedRowKeys]);

  const handleHeaderCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked
      ? new Set(effectiveRowData.map((row, rowIdx) => getRowKey(row, rowIdx, getRowId)))
      : new Set<string>();
    setSelectedRowKeys(next);
    emitSelectionChanged(next, "uiSelectAll");
  };

  const handleRowCheckboxChange = (row: Record<string, unknown>, rowIdx: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const rowKey = getRowKey(row, rowIdx, getRowId);
    const next = new Set(selectedRowKeys);
    if (event.target.checked) {
      next.add(rowKey);
    } else {
      next.delete(rowKey);
    }
    setSelectedRowKeys(next);
    emitSelectionChanged(next, "checkboxSelected");
  };

  const allRowsSelected = effectiveRowData.length > 0 && effectiveRowData.every((row, rowIdx) => selectedRowKeys.has(getRowKey(row, rowIdx, getRowId)));

  return (
    <table
      ref={tableRef}
      data-testid="ag-grid-mock"
      data-theme={themeName}
      data-dom-layout={domLayout}
      data-stop-editing-when-cells-lose-focus={String(stopEditingWhenCellsLoseFocus)}
      data-suppress-touch={String(suppressTouch)}
      data-default-col-def-suppress-movable={String(defaultColDef?.suppressMovable === true)}
      data-default-col-def-sortable={String(defaultColDef?.sortable === true)}
      data-has-on-cell-editing-started={String(onCellEditingStarted !== undefined)}
      data-has-on-cell-editing-stopped={String(onCellEditingStopped !== undefined)}
    >
      <thead>
        <tr>
          {hasSelectionColumn ? (
            <th
              data-width={selectionColumnDef?.width}
              data-sortable={resolveColumnFlag(selectionColumnDef ?? {}, defaultColDef, "sortable")}
              data-filter={resolveColumnFlag(selectionColumnDef ?? {}, defaultColDef, "filter")}
              data-un-sort-icon={String(selectionColumnDef?.unSortIcon === true)}
            >
              {showsHeaderCheckbox ? (
                <input
                  type="checkbox"
                  aria-label="Select all custom glasses"
                  checked={allRowsSelected}
                  onChange={handleHeaderCheckboxChange}
                />
              ) : null}
            </th>
          ) : null}
          {columnDefs?.map((col, i) => (
            <th
              key={i}
              data-pinned={typeof col.pinned === "string" ? col.pinned : undefined}
              data-width={col.width}
              data-sortable={resolveColumnFlag(col, defaultColDef, "sortable")}
              data-filter={resolveColumnFlag(col, defaultColDef, "filter")}
              data-filter-options={resolveFilterOptions(col)}
              data-un-sort-icon={String(col.unSortIcon === true)}
            >
              {col.headerName ?? col.field ?? ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {effectiveRowData.map((row, rowIdx) => {
          const rowKey = getRowKey(row, rowIdx, getRowId);

          return (
            <tr key={rowKey}>
              {hasSelectionColumn ? (
                <td>
                  {showsRowCheckboxes ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${String(row.label)}`}
                      checked={selectedRowKeys.has(rowKey)}
                      onChange={(event) => handleRowCheckboxChange(row, rowIdx, event)}
                    />
                  ) : null}
                </td>
              ) : null}
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
