# `shared/components/ag-grid/EditableAgGridReact.tsx`

Thin wrapper around AG Grid's `AgGridReact` for editable grids.

- Forwards `AgGridReactProps<TData>` unchanged.
- Defaults `stopEditingWhenCellsLoseFocus` to `true` so pending cell edits are committed when focus moves to an action outside the active editor, such as Apply, Delete, or modal-opening buttons.
- Lets callers explicitly override `stopEditingWhenCellsLoseFocus` by passing the prop.
