import { useState, useCallback } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { GridRowButtons } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { Button } from "@/shared/components/primitives/Button";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { Modal } from "@/shared/components/primitives/Modal";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import type { FieldSpace, FieldType } from "@/features/lens-editor/stores/specsConfiguratorStore";

interface FieldRow {
  readonly id: string;
  value: number;
}

interface FieldConfigResult {
  readonly space: FieldSpace;
  readonly type: FieldType;
  readonly maxField: number;
  readonly relativeFields: number[];
  readonly isWideAngle: boolean;
}

interface FieldConfigModalProps {
  readonly isOpen: boolean;
  readonly initialSpace: FieldSpace;
  readonly initialType: FieldType;
  readonly initialMaxField: number;
  readonly initialRelativeFields: readonly number[];
  readonly initialIsWideAngle: boolean;
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
  ...props
}: FieldConfigModalProps) {
  if (!isOpen) {
    return null;
  }

  return <FieldConfigModalContent key="field-config-modal" {...props} />;
}

function FieldConfigModalContent({
  initialSpace,
  initialType,
  initialMaxField,
  initialRelativeFields,
  initialIsWideAngle,
  onApply,
  onClose,
}: Omit<FieldConfigModalProps, "isOpen">) {
  const gridTheme = useAgGridTheme();

  const [space, setSpace] = useState(() => initialSpace);
  const [fieldType, setFieldType] = useState(() => initialType);
  const [maxFieldStr, setMaxFieldStr] = useState(() => String(initialMaxField));
  const [rows, setRows] = useState<FieldRow[]>(() => fieldsToRows(initialRelativeFields));
  const [isWideAngle, setIsWideAngle] = useState(() => initialIsWideAngle);

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
      isWideAngle,
    });
  };

  const atLimit = rows.length >= MAX_ROWS;

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
    <Modal isOpen={true} title="Field" titleId="field-modal-title" size="lg">
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        <div>
          <Label htmlFor="field-space">Field space</Label>
          <Select
            id="field-space"
            aria-label="Field space"
            type="compact"
            value={space}
            onChange={(e) => setSpace(e.target.value as FieldSpace)}
            options={[
              { value: "object", label: "Object" },
              { value: "image", label: "Image" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="field-type">Field type</Label>
          <Select
            id="field-type"
            aria-label="Field type"
            type="compact"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            options={[
              { value: "height", label: "Height" },
              { value: "angle", label: "Angle" },
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="field-max">Max field value</Label>
          <Input
            id="field-max"
            type="text"
            aria-label="Max field value"
            variant="compact"
            value={maxFieldStr}
            onChange={(e) => setMaxFieldStr(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mb-4" style={{ width: "100%" }}>
        <Paragraph variant="caption">Maximum 10 relative fields</Paragraph>
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

        <div className="mt-4">
          <CheckboxInput
            id="field-wide-angle"
            checked={isWideAngle}
            ariaLabel="Use wide angle mode for more robust ray aiming"
            label="Use wide angle mode for more robust ray aiming"
            onChange={setIsWideAngle}
            labelClassName="mb-0"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleApply}>Apply</Button>
      </div>
    </Modal>
  );
}
