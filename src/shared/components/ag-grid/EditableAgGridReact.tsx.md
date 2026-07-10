# `shared/components/ag-grid/EditableAgGridReact.tsx`

Thin wrapper around AG Grid's `AgGridReact` for editable grids.

- Forwards `AgGridReactProps<TData>` unchanged.
- Defaults `stopEditingWhenCellsLoseFocus` to `true` so pending cell edits are committed when focus moves to an action outside the active editor, such as Apply, Delete, or modal-opening buttons.
- Lets callers explicitly override `stopEditingWhenCellsLoseFocus` by passing the prop.
- Does not override `suppressTouch`, leaving AG Grid's native touch handling enabled for touchscreen column resizing. Callers can combine it with viewport-specific native touch-scroll styles.
