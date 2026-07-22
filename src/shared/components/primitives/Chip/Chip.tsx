/**
# `shared/components/primitives/Chip/Chip.tsx`
*/
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface ChipProps {
  readonly children: React.ReactNode;
}

const { color: c, size: sz, style: s } = cx.chip;

const chipClasses = clsx(
  s.borderRadius,
  s.borderStyle,
  c.borderColor,
  c.bgColor,
  c.textColor,
  sz.horizontalPadding,
  sz.verticalPadding,
  sz.fontSize,
);

/**
## Purpose

Read-only badge rendered as a `<span>` with a pill shape and muted styling. Used to surface concise key-value metrics.

## Key Behaviors

- Stateless — purely presentational.
- Classes are computed once at module load (not per-render) since there are no dynamic props.

## Usages

```tsx
// Display optical metrics
<Chip>EFL: 100.00mm</Chip>
<Chip>f/#: 4.0</Chip>
<Chip>NA OBJ: 0.1250</Chip>

// Multiple chips in a row
<div className="flex gap-2 flex-wrap">
  {CHIP_CONFIG.filter(({ key }) => key in data).map(
    ({ key, format }) => <Chip key={key}>{format(data[key])}</Chip>
  )}
</div>

// Displaying status badges
<Chip>Active</Chip>
<Chip>In Progress</Chip>
```
*/
export function Chip({ children }: ChipProps) {
  return <span className={chipClasses}>{children}</span>;
}
