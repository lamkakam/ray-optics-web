"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type { OptimizationOperandRow } from "@/features/optimization/stores/optimizationStore";
import { getOperandLabel } from "@/features/optimization/lib/optimizationViewModels";
import { OPTIMIZATION_OPERAND_METADATA, getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { Button } from "@/shared/components/primitives/Button";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";

interface OptimizationOperandsTabProps {
  readonly operands: ReadonlyArray<OptimizationOperandRow>;
  readonly onAddOperand: () => void;
  readonly onDeleteOperand: (id: string) => void;
  readonly onUpdateOperand: (id: string, patch: Partial<Omit<OptimizationOperandRow, "id">>) => void;
  readonly onCellEditingStarted?: () => void;
  readonly onCellEditingStopped?: () => void;
}

/**
Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.

- Uses a height-constrained flex column with a `1rem` gap and the same responsive total height as Lens Prescription: `h-[calc(100vh-160px)]` below `1440px`, then `h-full min-h-[200px]` at `1440px` and above.
- Keeps the content-sized Add Operand button above the grid. The grid wrapper uses `min-h-0 flex-1`, so it occupies the concrete remaining height after the button and gap, while the tab retains horizontal overflow and relies on parent layout padding instead of adding its own outer `p-4`.
- Uses AG Grid's normal layout so the grid owns vertical scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so users cannot reorder operand-table columns.
- Sets fixed AG Grid column widths of `215`, `85`, `90`, and `90` for Operand Kind, Target, Weight, and the delete/action column.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending operand edits commit when editing stops.
- Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while operand edits and their post-edit evaluation refreshes are pending.
- Provides AG Grid `getRowId` from each operand `id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active operand editor or discard uncommitted typed text.
- Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
- Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Shows `N/A` and disables editing in the `Target` column for target-less operands such as combined and axis-specific Ray Fan operands.
*/
export function OptimizationOperandsTab({
  operands,
  onAddOperand,
  onDeleteOperand,
  onUpdateOperand,
  onCellEditingStarted,
  onCellEditingStopped,
}: OptimizationOperandsTabProps) {
  const gridTheme = useAgGridTheme();

  const operandColumns = useMemo<ColDef<OptimizationOperandRow>[]>(() => [
    {
      headerName: "Operand Kind",
      width: 215,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: OPTIMIZATION_OPERAND_METADATA.map((metadata) => metadata.kind),
      },
      valueGetter: (params) => params.data?.kind,
      valueFormatter: (params) => getOperandLabel(params.value as OptimizationOperandKind),
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }

        onUpdateOperand(params.data.id, { kind: params.newValue as OptimizationOperandKind });
        return true;
      },
    },
    {
      headerName: "Target",
      width: 85,
      editable: (params) =>
        params.data !== undefined
        && getOptimizationOperandMetadata(params.data.kind).requiresTarget,
      valueGetter: (params) => {
        if (params.data === undefined) {
          return undefined;
        }
        return getOptimizationOperandMetadata(params.data.kind).requiresTarget ? params.data.target : "N/A";
      },
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }

        if (!getOptimizationOperandMetadata(params.data.kind).requiresTarget) {
          return false;
        }

        onUpdateOperand(params.data.id, { target: String(params.newValue) });
        return true;
      },
    },
    {
      headerName: "Weight",
      width: 90,
      editable: true,
      valueGetter: (params) => params.data?.weight,
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }

        onUpdateOperand(params.data.id, { weight: String(params.newValue) });
        return true;
      },
    },
    {
      headerName: "",
      width: 90,
      cellRenderer: (params: { data: OptimizationOperandRow }) => (
        <Button
          variant="danger"
          size="xs"
          aria-label={`Delete operand ${params.data.id}`}
          onClick={() => onDeleteOperand(params.data.id)}
        >
          Delete
        </Button>
      ),
    },
  ], [onDeleteOperand, onUpdateOperand]);

  return (
    <div
      data-testid="optimization-operands-tab"
      className="flex h-[calc(100vh-160px)] flex-col gap-4 overflow-x-auto min-[1440px]:h-full min-[1440px]:min-h-[200px]"
    >
      <Button
        className="self-start"
        variant="secondary"
        size="sm"
        aria-label="Add operand"
        onClick={onAddOperand}
      >
        Add Operand
      </Button>
      <div className="ag-grid-touch-scroll min-h-0 flex-1">
        <AgGridProvider modules={[AllCommunityModule]}>
          <EditableAgGridReact<OptimizationOperandRow>
            theme={gridTheme}
            rowData={[...operands]}
            columnDefs={operandColumns}
            getRowId={(params) => params.data.id}
            defaultColDef={{ sortable: false, suppressMovable: true }}
            domLayout="normal"
            onCellEditingStarted={onCellEditingStarted}
            onCellEditingStopped={onCellEditingStopped}
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
