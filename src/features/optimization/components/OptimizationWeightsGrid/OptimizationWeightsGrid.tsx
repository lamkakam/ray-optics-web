"use client";

import { useMemo } from "react";
import { AgGridProvider } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import { EditableAgGridReact } from "@/shared/components/ag-grid";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import type { WeightRow } from "@/features/optimization/lib/optimizationViewModels";

interface OptimizationWeightsGridProps {
  readonly rows: ReadonlyArray<WeightRow>;
  readonly valueColumnWidth: number;
  readonly onUpdateWeight: (index: number, value: number) => void;
  readonly onCellEditingStarted?: () => void;
  readonly onCellEditingStopped?: () => void;
}

export function OptimizationWeightsGrid({
  rows,
  valueColumnWidth,
  onUpdateWeight,
  onCellEditingStarted,
  onCellEditingStopped,
}: OptimizationWeightsGridProps) {
  const gridTheme = useAgGridTheme();

  const weightColumns = useMemo<ColDef<WeightRow>[]>(() => [
    {
      headerName: "Index",
      width: 80,
      valueGetter: (params) => params.data?.index,
    },
    {
      headerName: "Value",
      width: valueColumnWidth,
      valueGetter: (params) => params.data?.label,
    },
    {
      headerName: "Weight",
      width: 90,
      editable: true,
      valueGetter: (params) => params.data?.weight,
      valueParser: (params) => Number.parseFloat(params.newValue),
      valueSetter: (params) => {
        if (params.data === undefined) {
          return false;
        }

        onUpdateWeight(params.data.index, params.newValue as number);
        return true;
      },
    },
  ], [onUpdateWeight, valueColumnWidth]);

  return (
    <div
      data-testid="optimization-weights-grid"
      className="ag-grid-touch-scroll h-[200px] overflow-x-auto"
    >
      <AgGridProvider modules={[AllCommunityModule]}>
        <EditableAgGridReact<WeightRow>
          theme={gridTheme}
          rowData={[...rows]}
          columnDefs={weightColumns}
          getRowId={(params) => params.data.id}
          defaultColDef={{ sortable: false, suppressMovable: true }}
          domLayout="normal"
          suppressTouch={true}
          onCellEditingStarted={onCellEditingStarted}
          onCellEditingStopped={onCellEditingStopped}
        />
      </AgGridProvider>
    </div>
  );
}
