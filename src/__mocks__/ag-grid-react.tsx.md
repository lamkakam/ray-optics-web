# `__mocks__/ag-grid-react.tsx`

Jest mock for AG Grid React.

- Renders grid data as an HTML table with headers, rows, text inputs for editable text cells, and native selects for `agSelectCellEditor`.
- Exposes theme, layout, default column, and `stopEditingWhenCellsLoseFocus` values as `data-*` attributes for component tests.
- Models pending text edits: typing only changes the editor input until Enter is pressed or the input blurs while `stopEditingWhenCellsLoseFocus` is `true`.
- Select editors commit on change, matching how the existing tests use AG Grid select cells.
