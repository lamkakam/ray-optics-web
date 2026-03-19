# `components/micro/Input.tsx`

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
- Base classes (border, background, text color, focus ring) are always applied; only padding and font size differ between variants.

## Usages

- Used for numeric and text inputs.
