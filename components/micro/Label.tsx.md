# `components/micro/Label.tsx`

## Purpose

Themed `<label>` primitive. Renders as a `block` element with consistent font weight, size, and bottom margin from style tokens.

## Props

```ts
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
```

## Key Behaviors

- Implemented as `React.forwardRef`.
- Always renders as a block element (`display: block`), making it stack above its associated input.

## Usages

- Used above every `Input` and `Select` field.
