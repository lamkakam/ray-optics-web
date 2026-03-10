import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, themeQuartz, colorSchemeLight, colorSchemeDark } from "ag-grid-community";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { GridRowButtons } from "@/components/micro/GridRowButtons";
import { Button } from "@/components/micro/Button";
import { Modal } from "@/components/micro/Modal";
import { useTheme } from "@/components/ThemeProvider";
import { FRAUNHOFER_LINES, lookupWavelength, type FraunhoferSymbol } from "@/lib/fraunhoferLines";

interface WavelengthRow {
  readonly id: string;
  fraunhofer: string;
  wavelength: number;
  weight: number;
}

interface WavelengthConfigResult {
  readonly weights: [number, number][];
  readonly referenceIndex: number;
}

interface WavelengthConfigModalProps {
  readonly isOpen: boolean;
  readonly initialWeights: readonly [number, number][];
  readonly initialReferenceIndex: number;
  readonly onApply: (result: WavelengthConfigResult) => void;
  readonly onClose: () => void;
}

let nextId = 0;
function generateWlRowId(): string {
  return `wl-${nextId++}`;
}

function findFraunhoferSymbol(wavelength: number): string {
  const line = FRAUNHOFER_LINES.find((l) => Math.abs(l.wavelength - wavelength) < 0.001);
  return line ? line.symbol : "";
}

function weightsToRows(weights: readonly [number, number][]): WavelengthRow[] {
  return weights.map(([wavelength, weight]) => ({
    id: generateWlRowId(),
    fraunhofer: findFraunhoferSymbol(wavelength),
    wavelength,
    weight,
  }));
}

const MAX_ROWS = 7;

export function WavelengthConfigModal({
  isOpen,
  initialWeights,
  initialReferenceIndex,
  onApply,
  onClose,
}: WavelengthConfigModalProps) {
  const { theme } = useTheme();
  const gridTheme = useMemo(
    () =>
      theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight),
    [theme],
  );

  const [rows, setRows] = useState<WavelengthRow[]>(() => weightsToRows(initialWeights));
  const [referenceIndex, setReferenceIndex] = useState(initialReferenceIndex);

  // Reset draft state when modal opens (reset-on-open pattern: syncing local draft state with props)
  useEffect(() => {
    if (isOpen) {
      setRows(weightsToRows(initialWeights)); // eslint-disable-line react-hooks/set-state-in-effect
      setReferenceIndex(initialReferenceIndex);
    }
  }, [isOpen, initialWeights, initialReferenceIndex]);



  const addRow = useCallback((afterId: string) => {
    setRows((prev) => {
      if (prev.length >= MAX_ROWS) return prev;
      const idx = prev.findIndex((r) => r.id === afterId);
      if (idx === -1) return prev;
      const newRow: WavelengthRow = {
        id: generateWlRowId(),
        fraunhofer: "e",
        wavelength: lookupWavelength("e"),
        weight: 1,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  }, []);

  const handleDeleteRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((r) => r.id === id);
      if (idx <= 0) return prev;
      const next = prev.filter((r) => r.id !== id);
      // Adjust referenceIndex
      setReferenceIndex((prevRef) => {
        if (idx < prevRef) return prevRef - 1;
        if (idx === prevRef) return 0;
        return prevRef;
      });
      return next;
    });
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<WavelengthRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }, []);

  const handleApply = () => {
    onApply({
      weights: rows.map((r) => [r.wavelength, r.weight]),
      referenceIndex,
    });
  };

  const atLimit = rows.length >= MAX_ROWS;

  const caption = clsx(cx.label.style.caption, cx.label.color.captionTextColor, cx.label.size.caption);
  const divider = clsx(cx.divider.style.base, cx.divider.color.borderColor);

  const columnDefs: ColDef<WavelengthRow>[] = [
    {
      headerName: "",
      width: 100,
      cellRenderer: (params: { data: WavelengthRow | undefined }) => {
        if (!params.data) return undefined;
        const isFirst = rows.findIndex((r) => r.id === params.data!.id) === 0;
        return (
          <GridRowButtons
            onAdd={() => addRow(params.data!.id)}
            addHidden={atLimit}
            onDelete={!isFirst ? () => handleDeleteRow(params.data!.id) : undefined}
            addLabel="Add wavelength row"
            deleteLabel="Delete wavelength row"
          />
        );
      },
    },
    {
      headerName: "Fraunhofer",
      field: "fraunhofer",
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: FRAUNHOFER_LINES.map((l) => l.symbol),
      },
      valueSetter: (params) => {
        if (!params.data) return false;
        const symbol = params.newValue as FraunhoferSymbol;
        const wl = lookupWavelength(symbol);
        updateRow(params.data.id, { fraunhofer: symbol, wavelength: wl });
        return true;
      },
    },
    {
      headerName: "Wavelength (nm)",
      field: "wavelength",
      editable: true,
      valueGetter: (params) => {
        if (!params.data) return 0;
        return params.data.wavelength;
      },
      valueParser: (params) => {
        const parsed = parseFloat(params.newValue);
        return isNaN(parsed) || parsed <= 0 ? lookupWavelength("e") : parsed;
      },
      valueSetter: (params) => {
        if (!params.data) return false;
        const newVal = params.newValue as number;
        const fraunhofer = findFraunhoferSymbol(newVal);
        updateRow(params.data.id, { wavelength: newVal, fraunhofer });
        return true;
      },
    },
    {
      headerName: "Weight",
      field: "weight",
      editable: true,
      valueGetter: (params) => {
        if (!params.data) return 0;
        return params.data.weight;
      },
      valueParser: (params) => {
        const parsed = parseFloat(params.newValue);
        return isNaN(parsed) || parsed < 0 ? 1 : parsed;
      },
      valueSetter: (params) => {
        if (!params.data) return false;
        updateRow(params.data.id, { weight: params.newValue as number });
        return true;
      },
    },
    {
      headerName: "Reference",
      width: 100,
      cellRenderer: (params: { data: WavelengthRow | undefined }) => {
        if (!params.data) return undefined;
        const idx = rows.findIndex((r) => r.id === params.data!.id);
        return (
          <input
            type="radio"
            name="reference-wavelength"
            aria-label={`Reference wavelength ${idx + 1}`}
            checked={idx === referenceIndex}
            onChange={() => setReferenceIndex(idx)}
          />
        );
      },
    },
  ];

  return (
    <Modal isOpen={isOpen} title="Wavelengths" titleId="wavelength-modal-title" size="4xl">
        <div className="mb-4" style={{ width: "100%" }}>
          <p className={caption}>Maximum 7 wavelengths</p>
          <AgGridProvider modules={[AllCommunityModule]}>
            <AgGridReact
              theme={gridTheme}
              rowData={rows as unknown as Record<string, unknown>[]}
              columnDefs={columnDefs as unknown as ColDef[]}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              domLayout="autoHeight"
              getRowId={(params: { data: Record<string, unknown> }) => (params.data as unknown as WavelengthRow).id}
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
