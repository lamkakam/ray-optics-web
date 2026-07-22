/**
# `shared/components/primitives/RadioInput/RadioInput.tsx`

## Styling

Uses Tailwind CSS.

- Group label text color uses `cx.label.color.textColor`.
- The option container uses fixed Tailwind grid classes based on `layout` and `columns`, avoiding dynamic class generation.
- `layout="full"` uses `grid grid-cols-* gap-1`; `layout="compact"` uses `inline-grid grid-cols-* gap-x-6 gap-y-1`.
- Each option row uses `componentTokens.radio`, including the shared hover background token reused from `CheckboxInput`.
- The radio control accent color comes from `componentTokens.radio.color.checkedColor`.
*/
import React from "react";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

const OPTION_ROW_CLASSES = [
  "flex items-center text-sm",
  cx.radio.size.gap,
  cx.radio.size.wrapperPaddingX,
  cx.radio.size.wrapperPaddingY,
  cx.radio.color.hoverBgColor,
  cx.radio.color.labelTextColor,
  cx.radio.style.wrapperBorderRadius,
  cx.radio.style.transition,
  cx.radio.style.cursor,
] as const;

const OPTION_GRID_CLASSES = {
  full: {
    1: "grid grid-cols-1 gap-1",
    2: "grid grid-cols-2 gap-1",
    3: "grid grid-cols-3 gap-1",
    4: "grid grid-cols-4 gap-1",
  },
  compact: {
    1: "inline-grid grid-cols-1 gap-x-6 gap-y-1",
    2: "inline-grid grid-cols-2 gap-x-6 gap-y-1",
    3: "inline-grid grid-cols-3 gap-x-6 gap-y-1",
    4: "inline-grid grid-cols-4 gap-x-6 gap-y-1",
  },
} as const;

type RadioInputLayout = keyof typeof OPTION_GRID_CLASSES;

export type RadioOption<T extends string> = {
  value: T;
  /** Used as the `aria-label` and as fallback visual text. */
  label: string;
  /** Optional React node rendered as the visual label. When provided, replaces the plain `label` text. The `label` string is always used as `aria-label`. */
  labelNode?: React.ReactNode;
};

interface RadioInputProps<T extends string> {
  /** HTML name attribute for the radio group */
  readonly name: string;
  /** Legend / group label */
  readonly label: string;
  readonly options: ReadonlyArray<RadioOption<T>>;
  /** Currently selected value */
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Disables all inputs when true */
  readonly disabled?: boolean;
  /** Number of grid columns for options; defaults to 1 */
  readonly columns?: 1 | 2 | 3 | 4;
  /** Option grid width and gutter behavior; defaults to "full" */
  readonly layout?: RadioInputLayout;
}

/**
## Purpose

A generic radio button group component. Renders a `<fieldset>` with a `<legend>` and one labelled `<input type="radio">` per option.

## Behavior

- Each option renders as `<label><input type="radio" /> {labelNode ?? label}</label>`.
- The `aria-label` on each radio always equals the option's `label` string (even when `labelNode` is provided).
- Calls `onChange(option.value)` when a radio is clicked.
- When `disabled=true`, all radio inputs have the `disabled` attribute.
- `labelNode` allows rich content (e.g. MathJax nodes) while keeping plain-text accessibility.
- `columns` controls the option grid layout. Accepted values are `1`, `2`, `3`, and `4`; the default is `1`.
- `layout` controls whether the option grid stretches to the full available width (`"full"`, default) or shrinks to content width with compact horizontal gutters (`"compact"`).

## Usages

```tsx
// Chromaticity options
<RadioInput
  name="chromaticity"
  label="Chromaticity"
  options={[
    { value: "mono", label: "Monochromatic" },
    { value: "poly", label: "Polychromatic" },
  ]}
  value={chromaticity}
  onChange={onChromaticityChange}
  disabled={isCalculating}
/>

// Metric selection with custom labelNode for rich content
<RadioInput
  name="metric"
  label="Metric"
  options={[
    { value: "rmsSpot", label: "Minimize RMS Spot Radius" },
    { value: "wavefront", label: "Minimize Wavefront Error" },
  ]}
  value={metric}
  onChange={onMetricChange}
/>

// Two-column option layout
<RadioInput
  name="viewMode"
  label="View Mode"
  options={[
    { value: "spot", label: "Spot" },
    { value: "wavefront", label: "Wavefront" },
    { value: "field", label: "Field" },
    { value: "distortion", label: "Distortion" },
  ]}
  value={viewMode}
  onChange={onViewModeChange}
  columns={2}
/>

// Compact two-column option layout
<RadioInput
  name="plotType"
  label="Plot Type"
  options={[
    { value: "refractiveIndex", label: "Refractive Index" },
    { value: "partialDispersion", label: "Partial Dispersion" },
  ]}
  value={plotType}
  onChange={onPlotTypeChange}
  columns={2}
  layout="compact"
/>

// Radio group with MathJax content
<RadioInput
  name="aberration"
  label="Aberration Type"
  options={[
    { value: "spherical", label: "Spherical", labelNode: <MathJax>{`\\(SA\\)`}</MathJax> },
    { value: "coma", label: "Coma", labelNode: <MathJax>{`\\(Coma\\)`}</MathJax> },
  ]}
  value={selectedAberration}
  onChange={onAberrationChange}
/>
```
*/
export function RadioInput<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  disabled = false,
  columns = 1,
  layout = "full",
}: RadioInputProps<T>) {
  return (
    <fieldset className="mb-3">
      <legend className={`block text-sm font-medium mb-1 ${cx.label.color.textColor}`}>
        {label}
      </legend>
      <div className={OPTION_GRID_CLASSES[layout][columns]}>
        {options.map((opt) => (
          <label key={opt.value} className={OPTION_ROW_CLASSES.join(" ")}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled}
              aria-label={opt.label}
              onChange={() => onChange(opt.value)}
              className={cx.radio.color.checkedColor}
            />
            {opt.labelNode ?? opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
