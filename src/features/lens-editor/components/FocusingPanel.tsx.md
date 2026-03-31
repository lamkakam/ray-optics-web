# `features/lens-editor/components/FocusingPanel.tsx`

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

```tsx
import { FocusingPanel } from "@/features/lens-editor/components/FocusingPanel";

// In a container component (e.g., FocusingContainer)
const [chromaticity, setChromaticity] = useState<"mono" | "poly">("mono");
const [metric, setMetric] = useState<"rmsSpot" | "wavefront">("rmsSpot");
const [fieldIndex, setFieldIndex] = useState(0);

const fieldOptions = [
  { label: "0.0°", value: 0 },
  { label: "14.0°", value: 1 },
  { label: "20.0°", value: 2 },
];

const handleFocus = async () => {
  // Call proxy focusing methods based on chromaticity and metric
  // Update system after focusing
};

return (
  <FocusingPanel
    chromaticity={chromaticity}
    metric={metric}
    fieldIndex={fieldIndex}
    fieldOptions={fieldOptions}
    onChromaticityChange={setChromaticity}
    onMetricChange={setMetric}
    onFieldIndexChange={setFieldIndex}
    onFocus={handleFocus}
    disabled={!isReady || computing}
  />
);
```
