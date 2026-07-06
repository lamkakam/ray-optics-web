# `__mocks__/ag-grid-react.tsx`

Jest mock for AG Grid React.

- Renders grid data as an HTML table with headers, rows, text inputs for editable text cells, and native selects for `agSelectCellEditor`.
- Exposes theme, layout, default column, column width, effective per-header sortable/filter flags, unsorted sort-icon flags, `stopEditingWhenCellsLoseFocus`, and edit lifecycle callback presence as `data-*` attributes for component tests.
- Keys rendered rows by AG Grid `getRowId` when provided, otherwise by row object identity, so tests can observe whether replacement row objects preserve or reset active editor state.
- Blurs the active mocked grid editor when `columnDefs` identity changes, matching AG Grid editor recreation closely enough for tests to catch focus-loss regressions caused by prop churn.
- Models pending text edits: focusing an editable input emits `onCellEditingStarted`; typing only changes the editor input until Enter is pressed or the input blurs while `stopEditingWhenCellsLoseFocus` is `true`; Enter or blur emits `onCellEditingStopped`.
- Select editors emit edit-start on focus, commit and emit edit-stop on change, and also emit edit-stop on blur when still editing.
