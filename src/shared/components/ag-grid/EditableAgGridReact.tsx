"use client";

import { AgGridReact } from "ag-grid-react";
import type { AgGridReactProps } from "ag-grid-react";

export function EditableAgGridReact<TData>(props: Readonly<AgGridReactProps<TData>>) {
  return (
    <AgGridReact<TData>
      stopEditingWhenCellsLoseFocus={true}
      {...props}
    />
  );
}
