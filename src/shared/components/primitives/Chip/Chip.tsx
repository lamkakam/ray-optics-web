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
Read-only badge rendered as a `<span>` with a pill shape and muted styling. Used to surface concise key-value metrics.

## Key Behaviors

- Stateless — purely presentational.
- Classes are computed once at module load (not per-render) since there are no dynamic props.
*/
export function Chip({ children }: ChipProps) {
  return <span className={chipClasses}>{children}</span>;
}
