/**
Jest mock for AG Grid React.

- Renders grid data as an HTML table with headers, rows, text inputs for editable text cells, and native selects for `agSelectCellEditor`.
- Exposes theme, layout, default column, column width, effective per-header sortable/filter flags, unsorted sort-icon flags, `stopEditingWhenCellsLoseFocus`, `suppressTouch`, and edit lifecycle callback presence as `data-*` attributes for component tests.
- Keys rendered rows by AG Grid `getRowId` when provided, otherwise by row object identity, so tests can observe whether replacement row objects preserve or reset active editor state.
- Blurs the active mocked grid editor when `columnDefs` identity changes, matching AG Grid editor recreation closely enough for tests to catch focus-loss regressions caused by prop churn.
- Models pending text edits: focusing an editable input emits `onCellEditingStarted`; typing only changes the editor input until Enter is pressed or the input blurs while `stopEditingWhenCellsLoseFocus` is `true`; Enter or blur emits `onCellEditingStopped`.
- Select editors emit edit-start on focus, commit and emit edit-stop on change, and also emit edit-stop on blur when still editing.
*/
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
  onSortChanged?: (event: { api: MockGridApi }) => void;
  onFilterChanged?: (event: { api: MockGridApi }) => void;
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
  applyColumnState: (params: { state: MockColumnState[]; defaultState?: Record<string, unknown> }) => void;
  getColumnState: () => MockColumnState[];
  setFilterModel: (model: Record<string, unknown>) => void;
  getFilterModel: () => Record<string, unknown>;
}

interface MockRowNode {
  data: Record<string, unknown>;
  isSelected: () => boolean;
  setSelected: (selected: boolean) => void;
}

interface MockColumnState {
  colId?: string;
  sort?: "asc" | "desc";
  sortIndex?: number;
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
  onSortChanged,
  onFilterChanged,
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
  const apiRef = useRef<MockGridApi | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<ReadonlySet<string>>(new Set());
  const [currentColumnState, setCurrentColumnState] = useState<MockColumnState[]>([]);
  const [appliedColumnState, setAppliedColumnState] = useState<{ state: MockColumnState[]; defaultState?: Record<string, unknown> } | undefined>(undefined);
  const [currentFilterModel, setCurrentFilterModel] = useState<Record<string, unknown>>({});
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
      applyColumnState: (params) => {
        setAppliedColumnState((previous) => (
          JSON.stringify(previous) === JSON.stringify(params)
            ? previous
            : params
        ));
        setCurrentColumnState((previous) => (
          JSON.stringify(previous) === JSON.stringify(params.state)
            ? previous
            : params.state
        ));
      },
      getColumnState: () => currentColumnState,
      setFilterModel: (model) => {
        setCurrentFilterModel((previous) => (
          JSON.stringify(previous) === JSON.stringify(model)
            ? previous
            : model
        ));
      },
      getFilterModel: () => currentFilterModel,
    };

    apiRef.current = api;
    onGridReady?.({ api });
  }, [currentColumnState, currentFilterModel, effectiveRowData, getRowId, onGridReady, selectedRowKeys]);

  const handleSortChanged = (event: CustomEvent<{ columnState?: MockColumnState[] }>) => {
    const detail = event.detail;
    const nextColumnState = detail?.columnState ?? [];
    setCurrentColumnState(nextColumnState);
    const api = apiRef.current;
    if (api !== undefined) {
      api.getColumnState = () => nextColumnState;
      onSortChanged?.({ api });
    }
  };

  const handleFilterChanged = (event: CustomEvent<{ filterModel?: Record<string, unknown> }>) => {
    const detail = event.detail;
    const nextFilterModel = detail?.filterModel ?? {};
    setCurrentFilterModel(nextFilterModel);
    const api = apiRef.current;
    if (api !== undefined) {
      api.getFilterModel = () => nextFilterModel;
      onFilterChanged?.({ api });
    }
  };

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

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (table === null) {
      return undefined;
    }

    const sortListener = (event: Event) => handleSortChanged(event as CustomEvent<{ columnState?: MockColumnState[] }>);
    const filterListener = (event: Event) => handleFilterChanged(event as CustomEvent<{ filterModel?: Record<string, unknown> }>);
    table.addEventListener("mockSortChanged", sortListener);
    table.addEventListener("mockFilterChanged", filterListener);

    return () => {
      table.removeEventListener("mockSortChanged", sortListener);
      table.removeEventListener("mockFilterChanged", filterListener);
    };
  });

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
      data-current-column-state={JSON.stringify(currentColumnState)}
      data-applied-column-state={appliedColumnState === undefined ? undefined : JSON.stringify(appliedColumnState)}
      data-current-filter-model={JSON.stringify(currentFilterModel)}
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
