# `components/micro/RadioInput.tsx`

## Purpose

A generic radio button group component. Renders a `<fieldset>` with a `<legend>` and one labelled `<input type="radio">` per option.

## Props

```ts
interface RadioInputProps<T extends string> {
  readonly name: string;          // HTML name attribute for the radio group
  readonly label: string;         // Legend / group label
  readonly options: ReadonlyArray<RadioOption<T>>;
  readonly value: T;              // Currently selected value
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;    // Disables all inputs when true
}

type RadioOption<T extends string> = {
  value: T;
  label: string;         // Used as the aria-label and as fallback visual text
  labelNode?: React.ReactNode; // Optional custom visual content; replaces label text when provided
};
```

## Behavior

- Each option renders as `<label><input type="radio" /> {labelNode ?? label}</label>`.
- The `aria-label` on each radio always equals the option's `label` string (even when `labelNode` is provided).
- Calls `onChange(option.value)` when a radio is clicked.
- When `disabled=true`, all radio inputs have the `disabled` attribute.
- `labelNode` allows rich content (e.g. MathJax nodes) while keeping plain-text accessibility.

## Styling

Uses Tailwind CSS. Label text color uses `cx.label.color.textColor`.

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
