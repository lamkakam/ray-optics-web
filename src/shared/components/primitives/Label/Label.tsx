/**
# `shared/components/primitives/Label/Label.tsx`
*/
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

/**
## Props

```ts
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
```
*/
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

const BASE_CLASSES = [
  cx.label.style.fontWeight,
  cx.label.size.margin,
  cx.label.color.textColor,
  cx.label.size.fontSize,
] as const;

/**
## Purpose

Themed `<label>` primitive. Renders as a `block` element with consistent font weight, size, and bottom margin from style tokens.

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
*/
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={clsx("block", BASE_CLASSES, className)}
        {...rest}
      />
    );
  },
);
