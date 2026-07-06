# `features/import-custom-glass/components/CustomGlassTable/CustomGlassTable.tsx`

## Purpose
Readonly AG Grid table for all user-defined custom glasses.

## Props
- `rows` are sorted page-derived `CustomGlassRow` records.
- `checked` identifies selected glass labels.
- `onCheckedChange(next)` receives the next selected label set when a checkbox changes.

## Behavior
- Preserves the columns ``, `Label`, `nd`, `vd`, `ne`, `ve`, `Pg,F`, `PF,e`, and `PF,d`.
- Keeps the selection column fixed at `81px`, `Label` at `125px`, and each numeric optical property column at `137px`.
- Selection is neither sortable nor filterable; data columns are sortable/filterable with `unSortIcon: true`.
- `Label` uses `agTextColumnFilter`; numeric columns use `agNumberColumnFilter`.
- Filter options intentionally omit AG Grid `blank` and `notBlank` choices.
- Numeric optical values are formatted with `Number(value).toFixed(6)`.

## Accessibility
- Each row checkbox exposes `aria-label="Select {label}"`.
