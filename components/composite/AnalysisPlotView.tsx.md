# `components/composite/AnalysisPlotView.tsx`

## Purpose

Displays an analysis plot image alongside plot-type and field selectors. Handles field-dependent vs. field-independent plot types by disabling the field selector when irrelevant.

## Props

```ts
interface AnalysisPlotViewProps {
  fieldOptions: readonly (SelectOption & { value: number })[];
  selectedFieldIndex: number;
  selectedPlotType: PlotType;
  plotImageBase64?: string;
  loading?: boolean;
  onFieldChange: (fieldIndex: number) => void;
  onPlotTypeChange: (plotType: PlotType) => void;
  autoHeight?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fieldOptions` | `readonly FieldOption[]` | Yes | Selectable field points for the field dropdown |
| `selectedFieldIndex` | `number` | Yes | Currently selected field index |
| `selectedPlotType` | `PlotType` | Yes | Currently selected plot type |
| `plotImageBase64` | `string` | No | Base64 PNG data for the plot image |
| `loading` | `boolean` | No | Shows "Loading plot..." placeholder when `true` |
| `onFieldChange` | `(n) => void` | Yes | Called with the new field index |
| `onPlotTypeChange` | `(t) => void` | Yes | Called with the new plot type |
| `autoHeight` | `boolean` | No | When `true`, image uses `w-full h-auto` instead of `max-h-full` fill layout |

## Key Behaviors

- `PLOT_TYPE_CONFIG` (exported) declares which plot types are field-dependent; the field dropdown is disabled for non-field-dependent types.
- Uses `useScreenBreakpoint` to switch between `compact` and `default` Select variants on small screens.
- Uses a plain `<img>` tag with a data URI (not `next/image`).

## Usages

- Used in the analysis panel of the main page.
