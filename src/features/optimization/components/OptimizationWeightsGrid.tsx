"use client";

import React, { useMemo } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { AllCommunityModule, type ColDef } from "ag-grid-community";
import { useAgGridTheme } from "@/shared/hooks/useAgGridTheme";
import type { WeightRow } from "@/features/optimization/components/optimizationViewModels";

interface OptimizationWeightsGridProps {
  readonly rows: ReadonlyArray<WeightRow>;
  readonly onUpdateWeight: (index: number, value: number) => void;
}

export function OptimizationWeightsGrid({
  rows,
  onUpdateWeight,
}: OptimizationWeightsGridProps) {
  const gridTheme = useAgGridTheme();

  const weightColumns = useMemo<ColDef<WeightRow>[]>(() => [
    {
      headerName: "Index",
      valueGetter: (params) => params.data?.index,
    },
    {
      headerName: "Value",
      valueGetter: (params) => params.data?.label,
    },
    {
      headerName: "Weight",
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
  ], [onUpdateWeight]);

  return (
    <div data-testid="optimization-weights-grid" className="overflow-x-auto">
      <AgGridProvider modules={[AllCommunityModule]}>
        <AgGridReact theme={gridTheme} rowData={[...rows]} columnDefs={weightColumns} domLayout="autoHeight" />
      </AgGridProvider>
    </div>
  );
}
