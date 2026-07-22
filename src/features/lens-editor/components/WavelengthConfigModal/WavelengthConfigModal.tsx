/**
# `features/lens-editor/components/WavelengthConfigModal/WavelengthConfigModal.tsx`

## Internal State

- `rows: WavelengthRow[]` — AG Grid row data; each row has `id`, `fraunhofer` symbol, `wavelength`, and `weight`.
- `referenceIndex: number` — index of the reference wavelength.

## Grid Columns

- Row actions: 100px.
- Fraunhofer: 110px.
- Wavelength (nm): 150px.
- Weight: 85px.
- Reference: 100px.

## Modal Footer

- Cancel and Apply actions are passed to `Modal.footer` so they remain fixed while the wavelength grid scrolls.
*/
import { useState, useCallback } from "react";
import { AgGridProvider } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { GridRowButtons } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import { FRAUNHOFER_LINES, lookupWavelength, type FraunhoferSymbol } from "@/shared/lib/data/fraunhoferLines";

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
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Array of `[wavelength_nm, weight]` pairs */
  readonly initialWeights: readonly [number, number][];
  /** Index of the reference wavelength in the weights array */
  readonly initialReferenceIndex: number;
  /** Called with updated weights and reference index on Apply */
  readonly onApply: (result: WavelengthConfigResult) => void;
  /** Cancel callback */
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

/**
## Purpose

Modal for configuring the system's wavelengths. Provides an AG Grid table with columns for Fraunhofer symbol, wavelength (nm), weight, and a reference wavelength radio button.

## Key Behaviors

- Mount-on-open: when `isOpen=false`, the component returns `null`; reopening mounts a fresh editor subtree whose rows and `referenceIndex` are initialized from props without a reset `useEffect`.
- Fraunhofer symbol and wavelength are kept in sync: editing the symbol updates the wavelength, and editing the wavelength updates the symbol if it matches a Fraunhofer line exactly. BUT THE USER'S MANUAL WAVELENGTH INPUT OVERRIDES THE VALUE OF THE SYMBOL.
- Row limit is 7 (HARD LIMIT FROM RayOptics); the first row cannot be deleted.
- Reuses `GridRowButtons` from the `LensPrescriptionContainer` barrel for wavelength row insertion and deletion controls.
- When a row is deleted, `referenceIndex` is adjusted to remain valid.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending wavelength or weight edits are committed before footer actions such as Apply read the draft rows.
- Keeps the caption outside a `400px`-high grid container at all screen sizes and uses AG Grid's normal layout for internal scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.

## Usages

```tsx
import { WavelengthConfigModal } from "@/features/lens-editor/components/WavelengthConfigModal";

// In a container component (e.g., SpecsConfiguratorContainer)
const wavelengthWeights = useStore(store, (s) => s.wavelengthWeights);
const referenceIndex = useStore(store, (s) => s.referenceIndex);
const wavelengthModalOpen = useStore(store, (s) => s.wavelengthModalOpen);

const handleWavelengthApply = useCallback(
  (result: { weights: WavelengthWeights; referenceIndex: ReferenceIndex }) => {
    store.getState().setWavelengths(result);
    store.getState().closeWavelengthModal();
  },
  [store]
);

return (
  <>
    <WavelengthConfigModal
      isOpen={wavelengthModalOpen}
      initialWeights={wavelengthWeights}
      initialReferenceIndex={referenceIndex}
      onApply={handleWavelengthApply}
      onClose={() => store.getState().closeWavelengthModal()}
    />
  </>
);
```
*/
export function WavelengthConfigModal({
  isOpen,
  ...props
}: WavelengthConfigModalProps) {
  if (!isOpen) {
    return null;
  }

  return <WavelengthConfigModalContent key="wavelength-config-modal" {...props} />;
}

function WavelengthConfigModalContent({
  initialWeights,
  initialReferenceIndex,
  onApply,
  onClose,
}: Omit<WavelengthConfigModalProps, "isOpen">) {
  const gridTheme = useAgGridTheme();

  const [rows, setRows] = useState<WavelengthRow[]>(() => weightsToRows(initialWeights));
  const [referenceIndex, setReferenceIndex] = useState(() => initialReferenceIndex);

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
      width: 110,
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
      width: 150,
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
      width: 85,
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
    <Modal
      isOpen={true}
      title="Wavelengths"
      titleId="wavelength-modal-title"
      size="4xl"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </div>
      )}
    >
      <div className="mb-4" style={{ width: "100%" }}>
        <Paragraph variant="caption">Maximum 7 wavelengths</Paragraph>
        <div className="ag-grid-touch-scroll h-[400px]">
          <AgGridProvider modules={[AllCommunityModule]}>
            <EditableAgGridReact<WavelengthRow>
              theme={gridTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: false, filter: false, suppressMovable: true }}
              domLayout="normal"
              getRowId={(params) => params.data.id}
            />
          </AgGridProvider>
        </div>
      </div>
    </Modal>
  );
}
