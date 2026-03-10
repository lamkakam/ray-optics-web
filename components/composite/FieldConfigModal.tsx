import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, themeQuartz, colorSchemeLight, colorSchemeDark } from "ag-grid-community";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { GridRowButtons } from "@/components/micro/GridRowButtons";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { Input } from "@/components/micro/Input";
import { useTheme } from "@/components/ThemeProvider";
import type { FieldSpace, FieldType } from "@/store/specsConfigurerStore";

interface FieldRow {
  readonly id: string;
  value: number;
}

interface FieldConfigResult {
  readonly space: FieldSpace;
  readonly type: FieldType;
  readonly maxField: number;
  readonly relativeFields: number[];
}

interface FieldConfigModalProps {
  readonly isOpen: boolean;
  readonly initialSpace: FieldSpace;
  readonly initialType: FieldType;
  readonly initialMaxField: number;
  readonly initialRelativeFields: readonly number[];
  readonly onApply: (result: FieldConfigResult) => void;
  readonly onClose: () => void;
}

let nextId = 0;
function generateFieldRowId(): string {
  return `field-${nextId++}`;
}

function fieldsToRows(fields: readonly number[]): FieldRow[] {
  return fields.map((value) => ({ id: generateFieldRowId(), value }));
}

const MAX_ROWS = 10;

export function FieldConfigModal({
  isOpen,
  initialSpace,
  initialType,
  initialMaxField,
  initialRelativeFields,
  onApply,
  onClose,
}: FieldConfigModalProps) {
  const { theme } = useTheme();
  const gridTheme = useMemo(
    () =>
      theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight),
    [theme],
  );

  const [space, setSpace] = useState(initialSpace);
  const [fieldType, setFieldType] = useState(initialType);
  const [maxFieldStr, setMaxFieldStr] = useState(String(initialMaxField));
  const [rows, setRows] = useState<FieldRow[]>(() => fieldsToRows(initialRelativeFields));

  // Reset draft state when modal opens (reset-on-open pattern: syncing local draft state with props)
  useEffect(() => {
    if (isOpen) {
      setSpace(initialSpace); // eslint-disable-line react-hooks/set-state-in-effect
      setFieldType(initialType);
      setMaxFieldStr(String(initialMaxField));
      setRows(fieldsToRows(initialRelativeFields));
    }
  }, [isOpen, initialSpace, initialType, initialMaxField, initialRelativeFields]);



  const addRow = useCallback((afterId: string) => {
    setRows((prev) => {
      if (prev.length >= MAX_ROWS) return prev;
      const idx = prev.findIndex((r) => r.id === afterId);
      if (idx === -1) return prev;
      const newRow: FieldRow = { id: generateFieldRowId(), value: 0 };
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((r) => r.id === id);
      if (idx <= 0) return prev; // don't delete first row
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const updateRowValue = useCallback((id: string, value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, value } : r))
    );
  }, []);

  const handleApply = () => {
    const maxField = parseFloat(maxFieldStr);
    onApply({
      space,
      type: fieldType,
      maxField: isNaN(maxField) ? 0 : maxField,
      relativeFields: rows.map((r) => r.value),
    });
  };

  const atLimit = rows.length >= MAX_ROWS;

  const label = clsx(cx.label.style.baseDisplay, cx.label.style.baseFontWeight, cx.label.size.baseMargin, cx.label.color.textColor, cx.label.size.default);
  const select = clsx(cx.select.style.borderRadius, cx.select.style.borderStyle, cx.select.style.outlineStyle, cx.select.style.transitionStyle, cx.select.size.defaultWidth, cx.select.size.focusRingWidth, cx.select.color.focusRingColor, cx.select.color.borderColor, cx.select.color.bgColor, cx.select.color.textColor, cx.select.size.horizontalPadding, cx.select.size.verticalPadding, cx.select.size.fontSize);
  const caption = clsx(cx.label.style.caption, cx.label.color.captionTextColor, cx.label.size.caption);
  const divider = clsx(cx.divider.style.base, cx.divider.color.borderColor);

  const columnDefs: ColDef<FieldRow>[] = [
    {
      headerName: "",
      width: 100,
      cellRenderer: (params: { data: FieldRow | undefined }) => {
        if (!params.data) return undefined;
        const isFirst = rows.findIndex((r) => r.id === params.data!.id) === 0;
        return (
          <GridRowButtons
            onAdd={() => addRow(params.data!.id)}
            addHidden={atLimit}
            onDelete={!isFirst ? () => deleteRow(params.data!.id) : undefined}
            addLabel="Add field row"
            deleteLabel="Delete field row"
          />
        );
      },
    },
    {
      headerName: "Relative Field",
      field: "value",
      editable: true,
      valueGetter: (params) => {
        if (!params.data) return 0;
        return params.data.value;
      },
      valueParser: (params) => {
        const parsed = parseFloat(params.newValue);
        return isNaN(parsed) ? 0 : parsed;
      },
      valueSetter: (params) => {
        if (!params.data) return false;
        updateRowValue(params.data.id, params.newValue as number);
        return true;
      },
    },
  ];

  return (
    <Modal isOpen={isOpen} title="Field" titleId="field-modal-title" size="lg">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <label className={label} htmlFor="field-space">Field space</label>
            <select
              id="field-space"
              aria-label="Field space"
              className={select}
              value={space}
              onChange={(e) => setSpace(e.target.value as FieldSpace)}
            >
              <option value="object">Object</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="field-type">Field type</label>
            <select
              id="field-type"
              aria-label="Field type"
              className={select}
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              <option value="height">Height</option>
              <option value="angle">Angle</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="field-max">Max field value</label>
            <Input
              id="field-max"
              type="text"
              aria-label="Max field value"
              value={maxFieldStr}
              onChange={(e) => setMaxFieldStr(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4" style={{ width: "100%" }}>
          <p className={caption}>Maximum 10 relative fields</p>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={rows as unknown as Record<string, unknown>[]}
              columnDefs={columnDefs as unknown as ColDef[]}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              domLayout="autoHeight"
              getRowId={(params: { data: Record<string, unknown> }) => (params.data as unknown as FieldRow).id}
            />
          </AgGridProvider>
        </div>

        <div className={`flex items-center justify-end gap-3 pt-4 ${divider}`}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </div>
    </Modal>
  );
}
