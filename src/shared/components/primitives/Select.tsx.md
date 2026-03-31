# `components/micro/Select.tsx`

## Purpose

Themed `<select>` primitive with two visual densities. Renders a list of `SelectOption` items and optionally a disabled placeholder. Forwards a ref for programmatic focus.

## Props

```ts
type SelectOption = { value: string | number; label: string };

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: ReadonlyArray<SelectOption>;
  type?: "default" | "compact";
  placeholder?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `ReadonlyArray<SelectOption>` | Yes | Items to render as `<option>` elements |
| `type` | `"default" \| "compact"` | No | Compact uses reduced padding and width tokens. Defaults to `"default"` |
| `placeholder` | `string` | No | Disabled first option shown when no value is selected |

## Key Behaviors

- Implemented as `React.forwardRef` so it can be used inside AG Grid cell editors and third-party wrappers. The `ref` forwards to `<HTMLSelectElement>`, not the wrapper div.
- `disabled:opacity-50` and `disabled:cursor-not-allowed` are applied via style tokens.
- `appearance-none` is applied to both variants to strip native OS select rendering. This fixes iOS Safari's compact/pill-shaped appearance that ignores custom Tailwind styles.
- The `<select>` is wrapped in a `<div>` with `relative w-full` plus any `className` passed via props. Width/spacing constraints (e.g. `max-w-xs`) are applied to the wrapper `<div>`, not the inner `<select>`. This ensures the SVG chevron arrow is always positioned relative to the visible control boundary and stays within bounds.
- The inner `<select>` always has `w-full` so it fills the wrapper regardless of the wrapper's width constraint.

## Usages

```tsx
// Basic dropdown with aperture types
<Select
  aria-label="System aperture type"
  options={APERTURE_OPTIONS}
  value={currentDropdownValue}
  onChange={handleDropdownChange}
/>

// Compact variant for dense layouts
<Select
  type="compact"
  aria-label="Field"
  options={fieldOptions}
  value={selectedFieldIndex}
  onChange={(e) => onFieldChange(Number(e.target.value))}
/>

// With placeholder
<Select
  aria-label="Glass"
  options={glassOptions}
  value={selectedGlass}
  placeholder="Select glass..."
  onChange={handleChange}
/>

// Disabled state
<Select
  aria-label="Plot type"
  options={PLOT_TYPE_OPTIONS}
  value={selectedPlotType}
  disabled={fieldDisabled}
  onChange={handleChange}
/>
```
