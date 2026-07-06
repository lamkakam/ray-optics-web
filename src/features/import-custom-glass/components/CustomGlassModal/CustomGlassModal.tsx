"use client";

import { useMemo, useState } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import { FRAUNHOFER_LINES } from "@/shared/lib/data/fraunhoferLines";
import { makeEditablePair } from "@/features/import-custom-glass/lib/customGlassImport";
import type { EditablePair, ModalMode } from "@/features/import-custom-glass/types/customGlassImport";

interface CustomGlassModalProps {
  readonly mode: ModalMode;
  readonly existingLabels: ReadonlySet<string>;
  readonly initialLabel: string;
  readonly initialRows: readonly EditablePair[];
  readonly onCancel: () => void;
  readonly onSubmit: (label: string, rows: readonly EditablePair[]) => void;
}

function isPositiveFinite(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function duplicateWavelengths(rows: readonly EditablePair[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const normalized = row.wavelength.trim();
    if (normalized !== "") {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

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
  const duplicates = duplicateWavelengths(rows);
  const trimmedLabel = label.trim();
  const labelExists = existingLabels.has(trimmedLabel) && (mode === "add" || trimmedLabel !== initialLabel);
  const canConfirm = trimmedLabel !== ""
    && !labelExists
    && rows.length >= 4
    && rows.every((row) => isPositiveFinite(row.wavelength) && isPositiveFinite(row.refractiveIndex))
    && duplicates.size === 0;
  const updateRow = (id: string, patch: Partial<EditablePair>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  const modalColumnDefs = useMemo<ColDef<EditablePair>[]>(() => [
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
            onClick={() => setRows((current) => current.filter((item) => item.id !== params.data?.id))}
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
          wavelength: line === undefined ? params.data.wavelength : String(line.wavelength),
        });
        return true;
      },
    },
    {
      headerName: "Wavelength (nm)",
      field: "wavelength",
      width: 170,
      editable: true,
      cellClass: (params) => duplicates.has(String(params.value ?? "").trim()) ? "text-red-600" : undefined,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }
        updateRow(params.data.id, { wavelength: String(params.newValue), fraunhofer: "" });
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
        updateRow(params.data.id, { refractiveIndex: String(params.newValue) });
        return true;
      },
    },
  ], [duplicates]);

  return (
    <Modal
      isOpen
      title={mode === "add" ? "Add Glass" : "Edit Glass"}
      size="4xl"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" aria-label="Cancel" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" aria-label="Confirm" disabled={!canConfirm} onClick={() => onSubmit(trimmedLabel, rows)}>Confirm</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-glass-label">Label</Label>
          <Input id="custom-glass-label" aria-label="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
          {labelExists && <p className="mt-1 text-sm text-red-600">Label already exists.</p>}
        </div>
        <Button variant="secondary" aria-label="Add row" onClick={() => setRows((current) => [...current, makeEditablePair()])}>Add row</Button>
        {duplicates.size > 0 && <p className="text-sm text-red-600">Duplicate wavelength rows must be resolved.</p>}
        <div className="import-custom-glass-touch-scroll h-[45vh] min-h-72">
          <style>{`
            @media (pointer: coarse) {
              .import-custom-glass-touch-scroll .ag-header-viewport,
              .import-custom-glass-touch-scroll .ag-body-viewport,
              .import-custom-glass-touch-scroll .ag-center-cols-viewport {
                overscroll-behavior-y: auto;
                touch-action: pan-y;
              }
            }
          `}</style>
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<EditablePair>
              theme={gridTheme}
              rowData={[...rows]}
              columnDefs={modalColumnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              getRowId={(params) => params.data.id}
              suppressTouch={true}
            />
          </AgGridProvider>
        </div>
      </div>
    </Modal>
  );
}
