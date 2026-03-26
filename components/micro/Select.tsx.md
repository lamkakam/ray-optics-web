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
- The `<select>` is wrapped in `<div className="relative w-full">` so a custom SVG chevron arrow can be absolutely positioned at the right edge, replacing the native OS dropdown indicator.

