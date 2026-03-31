# `shared/components/primitives/Label.tsx`

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

```tsx
// Label paired with Select
<div>
  <Label htmlFor="manufacturer-select">
    Manufacturer
  </Label>
  <Select
    id="manufacturer-select"
    aria-label="Manufacturer"
    options={manufacturerOptions}
    value={selectedManufacturer}
    onChange={handleChange}
  />
</div>

// Label paired with Input
<div>
  <Label htmlFor="aperture-value">
    Aperture Value
  </Label>
  <Input
    id="aperture-value"
    type="text"
    value={value}
    onChange={handleChange}
  />
</div>
```
