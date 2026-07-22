"use client";

import { AgGridReact } from "ag-grid-react";
import type { AgGridReactProps } from "ag-grid-react";

/**
 * Thin wrapper around AG Grid's `AgGridReact` for editable grids.
 *
 * @remarks
 * - Forwards `AgGridReactProps<TData>` unchanged.
 * - Defaults `stopEditingWhenCellsLoseFocus` to `true` so pending cell edits are committed when focus moves to an action outside the active editor, such as Apply, Delete, or modal-opening buttons.
 * - Lets callers explicitly override `stopEditingWhenCellsLoseFocus` by passing the prop.
 * - Does not override `suppressTouch`, leaving AG Grid's native touch handling enabled for touchscreen column resizing. Callers can combine it with viewport-specific native touch-scroll styles.
 */
export function EditableAgGridReact<TData>(props: Readonly<AgGridReactProps<TData>>) {
  return (
    <AgGridReact<TData>
      stopEditingWhenCellsLoseFocus={true}
      {...props}
    />
  );
}
