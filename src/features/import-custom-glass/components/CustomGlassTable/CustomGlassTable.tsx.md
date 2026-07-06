# `features/import-custom-glass/components/CustomGlassTable/CustomGlassTable.tsx`

## Purpose
Readonly AG Grid table for all user-defined custom glasses.

## Props
- `rows` are sorted page-derived `CustomGlassRow` records.
- `checked` identifies selected glass labels.
- `onCheckedChange(next)` receives the next selected label set when a checkbox changes.

## Behavior
- Uses AG Grid multi-row selection with a dedicated selection column, row checkboxes, a header checkbox, and `selectAll: "all"`.
- Preserves the data columns `Label`, `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d`.
- Keeps the AG Grid selection column fixed at `81px`, `Label` at `125px`, and each numeric optical property column at `137px`.
- Selection is neither sortable nor filterable; data columns are sortable/filterable with `unSortIcon: true`.
- `Label` uses `agTextColumnFilter`; numeric columns use `agNumberColumnFilter`.
- Filter options intentionally omit AG Grid `blank` and `notBlank` choices.
- Numeric optical values are formatted with `Number(value).toFixed(6)`.
- `getRowId` uses the custom glass label so AG Grid can preserve row selection across row-data refreshes.
- `onSelectionChanged` maps AG Grid selected row nodes back into the page-level `ReadonlySet<string>` checked state.
- When `checked` changes externally after add, edit, delete, or import flows, the grid row selection is synchronized from that set.
- Wraps the grid with `import-custom-glass-touch-scroll` and component-local coarse-pointer CSS that restores horizontal and vertical touch panning plus scroll chaining for AG Grid viewports in this component only.
- Passes `suppressTouch={true}` to this feature-owned AG Grid instance.

## Accessibility
- Each row checkbox exposes `aria-label="Select {label}"`.
- The header checkbox exposes `aria-label="Select all custom glasses"` in tests through the AG Grid mock.
