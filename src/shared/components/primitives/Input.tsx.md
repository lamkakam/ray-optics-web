# `shared/components/primitives/Input.tsx`

## Purpose

Themed `<input>` primitive with two visual densities. Forwards a ref and passes all standard HTML input attributes through.

## Props

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact";
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `"default" \| "compact"` | No | Compact uses reduced padding and width tokens. Defaults to `"default"` |

## Key Behaviors

- Implemented as `React.forwardRef` so it can be used inside forms and AG Grid cell editors.
- Base classes (border, background, text color, focus ring, and disabled-state opacity/cursor tokens) are always applied; only padding and font size differ between variants.
- Disabled styling is tokenized via `cx.input.style.opacity` and `cx.input.style.cursor`, which mirror the shared disabled behavior used by `Select`.

## Usages

```tsx
// Text input for aperture value
<Input
  type="text"
  aria-label="Aperture value"
  value={valueStr}
  onChange={(e) => setValueStr(e.target.value)}
  onBlur={handleValueBlur}
/>

// Numeric input with default variant
<Input
  type="number"
  placeholder="Enter value"
  min="0"
  max="100"
/>

// Compact variant for space-constrained layouts
<Input
  variant="compact"
  type="text"
  placeholder="Search..."
/>
```
