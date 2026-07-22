/**
# `features/lens-editor/components/FocusingPanel/FocusingPanel.tsx`

## Layout

1. `RadioInput` for chromaticity: options `[{ value: "mono", label: "Monochromatic" }, { value: "poly", label: "Polychromatic" }]`, rendered with `columns={2}`
2. `RadioInput` for metric: options `[{ value: "rmsSpot", label: "Minimize RMS Spot Radius", labelNode: "RMS Spot Radius" }, { value: "wavefront", label: "Minimize Wavefront Error", labelNode: "Wavefront Error" }]`, rendered with `columns={2}` and `layout="compact"`. The shorter `labelNode` values are visible while the full `label` values remain each radio's accessible name.
3. `Label` + `Select` (aria-label="Field") for field index selection
4. `Button` variant `"primary"` text "Focus", `aria-label="Focus"`, `disabled={disabled}`

All inputs and the button are disabled when `disabled=true`.
*/
import { RadioInput } from "@/shared/components/primitives/RadioInput";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { Button } from "@/shared/components/primitives/Button";

type Chromaticity = "mono" | "poly";
type Metric = "rmsSpot" | "wavefront";

interface FocusingPanelProps {
  readonly chromaticity: Chromaticity;
  readonly metric: Metric;
  readonly fieldIndex: number;
  readonly fieldOptions: ReadonlyArray<{ value: number; label: string }>;
  readonly onChromaticityChange: (value: Chromaticity) => void;
  readonly onMetricChange: (value: Metric) => void;
  readonly onFieldIndexChange: (value: number) => void;
  readonly onFocus: () => void;
  readonly disabled: boolean;
}

const CHROMATICITY_OPTIONS: ReadonlyArray<{ value: Chromaticity; label: string }> = [
  { value: "mono", label: "Monochromatic" },
  { value: "poly", label: "Polychromatic" },
];

const METRIC_OPTIONS: ReadonlyArray<{
  value: Metric;
  label: string;
  labelNode: string;
}> = [
  {
    value: "rmsSpot",
    label: "Minimize RMS Spot Radius",
    labelNode: "RMS Spot Radius",
  },
  {
    value: "wavefront",
    label: "Minimize Wavefront Error",
    labelNode: "Wavefront Error",
  },
];

/**
## Purpose

Pure presentational panel for configuring and triggering optical focusing. Composed from `RadioInput`, `Label`, `Select`, and `Button` micro components.

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
*/
export function FocusingPanel({
  chromaticity,
  metric,
  fieldIndex,
  fieldOptions,
  onChromaticityChange,
  onMetricChange,
  onFieldIndexChange,
  onFocus,
  disabled,
}: FocusingPanelProps) {
  return (
    <div className="flex flex-col gap-4 max-w-xs">
      <RadioInput
        name="chromaticity"
        label="Chromaticity"
        options={CHROMATICITY_OPTIONS}
        value={chromaticity}
        onChange={onChromaticityChange}
        disabled={disabled}
        columns={2}
      />
      <RadioInput
        name="metric"
        label="Metric"
        options={METRIC_OPTIONS}
        value={metric}
        onChange={onMetricChange}
        disabled={disabled}
        columns={2}
        layout="compact"
      />
      <div>
        <Label htmlFor="focusing-field-select">Field</Label>
        <Select
          id="focusing-field-select"
          aria-label="Field"
          options={fieldOptions}
          value={fieldIndex}
          disabled={disabled}
          onChange={(e) => onFieldIndexChange(Number(e.target.value))}
        />
      </div>
      <Button
        variant="primary"
        aria-label="Focus"
        disabled={disabled}
        onClick={onFocus}
      >
        Focus
      </Button>
    </div>
  );
}
