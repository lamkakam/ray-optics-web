import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/styleTokens";

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

export function Chip({ children }: ChipProps) {
  return <span className={chipClasses}>{children}</span>;
}
