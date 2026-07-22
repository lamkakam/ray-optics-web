import { useState, useCallback } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { GridRowButtons } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
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
  /** Controls visibility */
  readonly isOpen: boolean;
  /** `"object"` or `"image"` */
  readonly initialSpace: FieldSpace;
  /** `"height"` or `"angle"` */
  readonly initialType: FieldType;
  /** Max half-field value in mm or degrees */
  readonly initialMaxField: number;
  /** List of relative field values (0–1) */
  readonly initialRelativeFields: readonly number[];
  /** Initial state for the wide-angle ray-aiming checkbox */
  readonly initialIsWideAngle: boolean;
  /** Called with the final config on Apply */
  readonly onApply: (result: FieldConfigResult) => void;
  /** Cancel callback */
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

/**
 * Modal for configuring optical field settings: field space, field type, max half-field value, a list of relative field positions, and the optional wide-angle ray-aiming mode. Uses AG Grid for the editable field table.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Mount-on-open: when `isOpen=false`, the component returns `null`; reopening mounts a fresh editor subtree whose draft state is initialized from props without a reset `useEffect`.
 * - Row limit is 10; the add button becomes hidden (not removed) at the limit.
 * - The first row cannot be deleted.
 * - Reuses `GridRowButtons` from the `LensPrescriptionContainer` barrel for field row insertion and deletion controls.
 * - A compact shared `CheckboxInput` below the grid toggles whether wide-angle mode is enabled for more robust ray aiming; the checkbox stays narrow while the label is left-aligned beside it.
 * - Row ids use a module-level counter for stable AG Grid `getRowId`.
 * - Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so a pending Relative Field cell edit is committed before footer actions such as Apply read the draft rows.
 * - Keeps the caption outside a grid container that is `200px` high below the project-standard `1440px` breakpoint and `400px` high at `1440px` and above, and uses AG Grid's normal layout for internal scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
 *
 *
 *
 * ## Grid Columns
 *
 * - Row actions: 100px.
 * - Relative Field: 125px.
 *
 * ## Modal Footer
 *
 * - Cancel and Apply actions are passed to `Modal.footer` so they remain fixed while field settings and the field grid scroll.
 */
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

  /** Draft object- or image-space selection. */
  const [space, setSpace] = useState(() => initialSpace);
  /** Draft angle- or height-field selection. */
  const [fieldType, setFieldType] = useState(() => initialType);
  /** String draft of the maximum absolute field. */
  const [maxFieldStr, setMaxFieldStr] = useState(() => String(initialMaxField));
  /** Editable relative-field rows with stable grid ids. */
  const [rows, setRows] = useState<FieldRow[]>(() => fieldsToRows(initialRelativeFields));
  /** Draft wide-angle ray-aiming setting. */
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
      width: 125,
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
    <Modal
      isOpen={true}
      title="Half-Field"
      titleId="field-modal-title"
      size="lg"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </div>
      )}
    >
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        <div>
          <Label htmlFor="field-space">Field space</Label>
          <Select
            id="field-space"
            aria-label="Field space"
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
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            options={[
              { value: "height", label: "Height" },
              { value: "angle", label: "Angle" },
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="field-max">Max half-field value</Label>
          <Input
            id="field-max"
            type="text"
            aria-label="Max half-field value"
            value={maxFieldStr}
            onChange={(e) => setMaxFieldStr(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mb-4" style={{ width: "100%" }}>
        <Paragraph variant="caption">Maximum 10 relative fields</Paragraph>
        <div className="ag-grid-touch-scroll h-[200px] min-[1440px]:h-[400px]">
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<FieldRow>
              theme={gridTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              domLayout="normal"
              getRowId={(params) => params.data.id}
            />
          </AgGridProvider>
        </div>

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
    </Modal>
  );
}
