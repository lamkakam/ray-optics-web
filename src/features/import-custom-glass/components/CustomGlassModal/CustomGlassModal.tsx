"use client";

import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridProvider } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { makeEditablePair } from "@/features/import-custom-glass/lib/customGlassImport";
import {
  duplicateCustomGlassWavelengths,
  validateCustomGlassInput,
} from "@/features/import-custom-glass/lib/customGlassValidation";
import type {
  EditablePair,
  ModalMode,
} from "@/features/import-custom-glass/types/customGlassImport";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import { FRAUNHOFER_LINES } from "@/shared/lib/data/fraunhoferLines";

interface CustomGlassModalProps {
  /** Selects the `Add Glass` or `Edit Glass` title and duplicate-label behavior. */
  readonly mode: ModalMode;
  /** Used to reject duplicate labels. */
  readonly existingLabels: ReadonlySet<string>;
  /** Seeds the modal label state. */
  readonly initialLabel: string;
  /** Seeds the modal row state. */
  readonly initialRows: readonly EditablePair[];
  /** Closes without saving. */
  readonly onCancel: () => void;
  /** Receives the trimmed label and current editable rows after validation passes. */
  readonly onSubmit: (label: string, rows: readonly EditablePair[]) => void;
}

/**
 * Add/edit modal for a single user-defined tabulated custom glass.
 *
 * @remarks
 * ## Behavior
 * - Uses the shared `Modal` primitive and an AG Grid instance for row editing.
 * - Preserves the tabulated pair columns: delete action, `Fraunhofer`, `Wavelength (nm)`, and `Refractive Index`.
 * - The Fraunhofer selector fills the matching wavelength and clears free-form wavelength edits when wavelength is manually changed.
 * - Confirm delegates the named-pair contract to the shared custom-glass validator and additionally rejects a label already present in the catalog.
 * - The modal-level `Add row`, `Cancel`, and `Confirm` buttons use the Lens Editor responsive sizing rule: shared `Button` size `sm` on `screenLG`, and `xs` on `screenSM`.
 * - Row-level AG Grid delete actions stay fixed at shared `Button` size `xs`.
 * - Duplicate wavelengths are marked with `text-red-600` and a validation message.
 * - Keeps the AG Grid column definitions stable while row data changes so active cell editors are not recreated during draft updates.
 * - Wraps the coefficient grid with `import-custom-glass-touch-scroll` and component-local coarse-pointer CSS that restores horizontal and vertical touch panning plus scroll chaining for AG Grid viewports in this modal only.
 * - Keeps AG Grid touch handling enabled so resizable coefficient-column headers respond to touchscreen drags while native two-axis viewport scrolling remains available.
 *
 *
 *
 * ## Accessibility
 * - The label input exposes `aria-label="Label"`.
 * - Row delete actions expose `aria-label="Delete row {id}"`.
 * - Footer actions keep the visible labels and aria labels `Cancel` and `Confirm`.
 * - `Add row` keeps the same visible label and aria label.
 */
export function CustomGlassModal({
  mode,
  existingLabels,
  initialLabel,
  initialRows,
  onCancel,
  onSubmit,
}: CustomGlassModalProps) {
  const gridTheme = useAgGridTheme();
  const [label, setLabel] = useState(initialLabel);
  const [rows, setRows] = useState<readonly EditablePair[]>(initialRows);
  const numericPairs = rows.map(
    (row) => [Number(row.wavelength), Number(row.refractiveIndex)] as const,
  );
  const duplicates = duplicateCustomGlassWavelengths(
    rows
      .filter((row) => row.wavelength.trim() !== "")
      .map(
        (row) => [Number(row.wavelength), Number(row.refractiveIndex)] as const,
      ),
  );
  const duplicatesRef = useRef<ReadonlySet<number>>(new Set());
  duplicatesRef.current = duplicates;
  const trimmedLabel = label.trim();
  const labelExists =
    existingLabels.has(trimmedLabel) &&
    (mode === "add" || trimmedLabel !== initialLabel);
  const canConfirm =
    !labelExists &&
    validateCustomGlassInput({ name: trimmedLabel, pairs: numericPairs });
  const updateRow = useCallback((id: string, patch: Partial<EditablePair>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }, []);
  const modalColumnDefs = useMemo<ColDef<EditablePair>[]>(
    () => [
      {
        headerName: "",
        width: 95,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: EditablePair | undefined }) => {
          if (params.data === undefined) {
            return undefined;
          }

          return (
            <Button
              variant="danger"
              size="xs"
              aria-label={`Delete row ${params.data.id}`}
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.id !== params.data?.id),
                )
              }
            >
              Delete
            </Button>
          );
        },
      },
      {
        headerName: "Fraunhofer",
        field: "fraunhofer",
        width: 130,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...FRAUNHOFER_LINES.map((line) => line.symbol)],
        },
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }
          const symbol = String(params.newValue);
          const line = FRAUNHOFER_LINES.find((item) => item.symbol === symbol);
          updateRow(params.data.id, {
            fraunhofer: symbol,
            wavelength:
              line === undefined
                ? params.data.wavelength
                : String(line.wavelength),
          });
          return true;
        },
      },
      {
        headerName: "Wavelength (nm)",
        field: "wavelength",
        width: 170,
        editable: true,
        cellClass: (params) =>
          duplicatesRef.current.has(Number(params.value))
            ? "text-red-600"
            : undefined,
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }
          updateRow(params.data.id, {
            wavelength: String(params.newValue),
            fraunhofer: "",
          });
          return true;
        },
      },
      {
        headerName: "Refractive Index",
        field: "refractiveIndex",
        width: 170,
        editable: true,
        valueSetter: (params) => {
          if (params.data === undefined) {
            return false;
          }
          updateRow(params.data.id, {
            refractiveIndex: String(params.newValue),
          });
          return true;
        },
      },
    ],
    [updateRow],
  );

  return (
    <Modal
      isOpen
      title={mode === "add" ? "Add Glass" : "Edit Glass"}
      size="4xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" aria-label="Cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            aria-label="Confirm"
            disabled={!canConfirm}
            onClick={() => onSubmit(trimmedLabel, rows)}
          >
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-glass-label">Label</Label>
          <Input
            id="custom-glass-label"
            aria-label="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          {labelExists && (
            <p className="mt-1 text-sm text-red-600">Label already exists.</p>
          )}
        </div>
        <Button
          variant="secondary"
          aria-label="Add row"
          onClick={() => setRows((current) => [...current, makeEditablePair()])}
        >
          Add row
        </Button>
        {duplicates.size > 0 && (
          <p className="text-sm text-red-600">
            Duplicate wavelength rows must be resolved.
          </p>
        )}
        <div className="import-custom-glass-touch-scroll h-[45vh] min-h-72">
          <style>{`
            @media (pointer: coarse) {
              .import-custom-glass-touch-scroll .ag-header-viewport,
              .import-custom-glass-touch-scroll .ag-body-viewport,
              .import-custom-glass-touch-scroll .ag-center-cols-viewport {
                overscroll-behavior-y: auto;
                touch-action: pan-x pan-y;
              }
            }
          `}</style>
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<EditablePair>
              theme={gridTheme}
              rowData={[...rows]}
              columnDefs={modalColumnDefs}
              defaultColDef={{
                sortable: false,
                filter: false,
                suppressMovable: true,
              }}
              getRowId={(params) => params.data.id}
            />
          </AgGridProvider>
        </div>
      </div>
    </Modal>
  );
}
