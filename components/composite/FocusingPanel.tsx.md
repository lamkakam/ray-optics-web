# `components/composite/FocusingPanel.tsx`

## Purpose

Pure presentational panel for configuring and triggering optical focusing. Composed from `RadioInput`, `Label`, `Select`, and `Button` micro components.

## Props

```ts
interface FocusingPanelProps {
  readonly chromaticity: "mono" | "poly";
  readonly metric: "rmsSpot" | "wavefront";
  readonly fieldIndex: number;
  readonly fieldOptions: ReadonlyArray<{ value: number; label: string }>;
  readonly onChromaticityChange: (value: "mono" | "poly") => void;
  readonly onMetricChange: (value: "rmsSpot" | "wavefront") => void;
  readonly onFieldIndexChange: (value: number) => void;
  readonly onFocus: () => void;
  readonly disabled: boolean;
}
```

## Layout

1. `RadioInput` for chromaticity: options `[{ value: "mono", label: "Monochromatic" }, { value: "poly", label: "Polychromatic" }]`
2. `RadioInput` for metric: options `[{ value: "rmsSpot", label: "Minimize RMS Spot Radius" }, { value: "wavefront", label: "Minimize Wavefront Error" }]`
3. `Label` + `Select` (aria-label="Field") for field index selection
4. `Button` variant `"primary"` text "Focus", `aria-label="Focus"`, `disabled={disabled}`

All inputs and the button are disabled when `disabled=true`.

## Usages

Used by `FocusingContainer`.
