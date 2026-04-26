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

const METRIC_OPTIONS: ReadonlyArray<{ value: Metric; label: string }> = [
  { value: "rmsSpot", label: "Minimize RMS Spot Radius" },
  { value: "wavefront", label: "Minimize Wavefront Error" },
];

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
      />
      <RadioInput
        name="metric"
        label="Metric"
        options={METRIC_OPTIONS}
        value={metric}
        onChange={onMetricChange}
        disabled={disabled}
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
        size="md"
        aria-label="Focus"
        disabled={disabled}
        onClick={onFocus}
      >
        Focus
      </Button>
    </div>
  );
}
