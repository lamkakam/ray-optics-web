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
import type {
  FieldConfig,
  FieldSpace,
  FieldType,
} from "@/features/lens-editor/stores/specsConfiguratorStore";

interface FieldRow {
  readonly id: string;
  value: number;
}

/** Result emitted by the field editor; absolute results omit the relative-only maximum. */
export type FieldConfigResult = FieldConfig;

interface FieldConfigModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** `"object"` or `"image"` */
  readonly initialSpace: FieldSpace;
  /** `"height"` or `"angle"` */
  readonly initialType: FieldType;
  /** Maximum relative half-field value in mm or degrees; retained as a hidden draft in absolute mode. */
  readonly initialMaxField: number;
  /** Field samples interpreted according to `initialIsRelative`. */
  readonly initialFields: readonly number[];
  /** Initial field-sample interpretation. Defaults to relative mode when omitted. */
  readonly initialIsRelative?: boolean;
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
 * Modal for configuring optical field settings: field space, field type, an optional relative maximum, field samples, and the optional wide-angle ray-aiming mode. Uses AG Grid for the editable field table.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Mount-on-open: when `isOpen=false`, the component returns `null`; reopening mounts a fresh editor subtree whose draft state is initialized from props without a reset `useEffect`.
 * - Row limit is 10; the add button becomes hidden (not removed) at the limit.
 * - The first row cannot be deleted.
 * - Reuses `GridRowButtons` from the `LensPrescriptionContainer` barrel for field row insertion and deletion controls.
 * - A compact shared `CheckboxInput` below the grid toggles exact wide-angle ray aiming for Object Angle, Object Height, and Image Height. The checkbox stays narrow while the label is left-aligned beside it.
 * - A second shared `CheckboxInput` below the wide-angle control selects absolute field samples; relative mode is the default.
 * - Relative mode validates every draft sample against the inclusive range `[-1, 1]` and disables Apply while any sample is outside that range. Absolute mode has no sample range restriction.
 * - Toggling interpretation changes only `isRelative`; field samples and the hidden maximum draft remain unchanged.
 * - Row ids use a module-level counter for stable AG Grid `getRowId`.
 * - Image space offers Height only. Selecting Image while Object Angle is active atomically changes the draft type to Height, so the modal can never emit Image Angle.
 * - Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so a pending Field cell edit is committed before footer actions such as Apply read the draft rows.
 * - Keeps the caption outside a grid container that is `200px` high below the project-standard `1440px` breakpoint and `400px` high at `1440px` and above, and uses AG Grid's normal layout for internal scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
 *
 *
 *
 * ## Grid Columns
 *
 * - Row actions: 100px.
 * - Relative Field or Field: 125px.
 *
 * ## Modal Footer
 *
 * - Cancel and Apply actions are passed to `Modal.footer` so they remain fixed while field settings and the field grid scroll.
 */
export function FieldConfigModal({ isOpen, ...props }: FieldConfigModalProps) {
  if (!isOpen) {
    return null;
  }

  return <FieldConfigModalContent key="field-config-modal" {...props} />;
}

function FieldConfigModalContent({
  initialSpace,
  initialType,
  initialMaxField,
  initialFields,
  initialIsRelative,
  initialIsWideAngle,
  onApply,
  onClose,
}: Omit<FieldConfigModalProps, "isOpen">) {
  const gridTheme = useAgGridTheme();

  /** Draft object- or image-space selection. */
  const [space, setSpace] = useState(() => initialSpace);
  /** Draft angle- or height-field selection. */
  const [fieldType, setFieldType] = useState(() => initialType);
  /** String draft of the relative maximum, including while its input is hidden in absolute mode. */
  const [maxFieldStr, setMaxFieldStr] = useState(() => String(initialMaxField));
  /** Editable field rows with stable grid ids. */
  const [rows, setRows] = useState<FieldRow[]>(() =>
    fieldsToRows(initialFields),
  );
  /** Draft field-sample interpretation; relative mode is the default. */
  const [isRelative, setIsRelative] = useState(() => initialIsRelative ?? true);
  /** Draft wide-angle ray-aiming setting. */
  const [isWideAngle, setIsWideAngle] = useState(() => initialIsWideAngle);
  const fieldTypeOptions =
    space === "image"
      ? [{ value: "height", label: "Height" }]
      : [
          { value: "height", label: "Height" },
          { value: "angle", label: "Angle" },
        ];

  const handleSpaceChange = (nextSpace: FieldSpace) => {
    setSpace(nextSpace);
    if (nextSpace === "image") {
      setFieldType("height");
    }
  };

  const handleFieldTypeChange = (nextType: FieldType) => {
    setFieldType(nextType);
  };

  const hasInvalidRelativeField =
    isRelative && rows.some((row) => row.value < -1 || row.value > 1);

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
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
  }, []);

  const handleApply = () => {
    if (hasInvalidRelativeField) return;

    const fields = rows.map((r) => r.value);
    if (!isRelative) {
      onApply({
        space,
        type: fieldType,
        fields,
        isRelative: false,
        isWideAngle,
      });
      return;
    }

    const maxField = parseFloat(maxFieldStr);
    onApply({
      space,
      type: fieldType,
      maxField: Number.isNaN(maxField) ? 0 : maxField,
      fields,
      isRelative: true,
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
        const row = params.data;
        const isFirst = rows.findIndex((r) => r.id === row.id) === 0;
        return (
          <GridRowButtons
            onAdd={() => addRow(row.id)}
            addHidden={atLimit}
            onDelete={!isFirst ? () => deleteRow(row.id) : undefined}
            addLabel="Add field row"
            deleteLabel="Delete field row"
          />
        );
      },
    },
    {
      headerName: isRelative ? "Relative Field" : "Field",
      field: "value",
      width: 125,
      editable: true,
      valueGetter: (params) => {
        if (!params.data) return 0;
        return params.data.value;
      },
      valueParser: (params) => {
        const parsed = parseFloat(params.newValue);
        return Number.isNaN(parsed) ? 0 : parsed;
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
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={hasInvalidRelativeField}
          >
            Apply
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        <div>
          <Label htmlFor="field-space">Field space</Label>
          <Select
            id="field-space"
            aria-label="Field space"
            value={space}
            onChange={(e) => handleSpaceChange(e.target.value as FieldSpace)}
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
            onChange={(e) => handleFieldTypeChange(e.target.value as FieldType)}
            options={fieldTypeOptions}
          />
        </div>
        {isRelative ? (
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
        ) : null}
      </div>

      <div className="mb-4" style={{ width: "100%" }}>
        <Paragraph variant="caption">
          {isRelative ? "Maximum 10 relative fields" : "Maximum 10 fields"}
        </Paragraph>
        {hasInvalidRelativeField ? (
          <Paragraph variant="errorMessage">
            Relative field values must be between -1 and 1.
          </Paragraph>
        ) : null}
        <div className="ag-grid-touch-scroll h-[200px] min-[1440px]:h-[400px]">
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<FieldRow>
              theme={gridTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: false,
                filter: false,
                suppressMovable: true,
              }}
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
          <CheckboxInput
            id="field-absolute"
            checked={!isRelative}
            ariaLabel="Use absolute fields"
            label="Use absolute fields"
            onChange={(checked) => setIsRelative(!checked)}
            labelClassName="mb-0"
          />
        </div>
      </div>
    </Modal>
  );
}
