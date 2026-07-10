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
    <div data-testid="optimization-operands-tab" className="space-y-4 overflow-x-auto">
      <Button variant="secondary" size="sm" aria-label="Add operand" onClick={onAddOperand}>
        Add Operand
      </Button>
      <div className="ag-grid-touch-scroll h-[200px]">
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
