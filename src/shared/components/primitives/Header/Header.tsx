"use client";
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Determines which `<h*>` tag is rendered and which font-size token is applied */
  readonly level: HeaderLevel;
}

const levelFontSizes: Record<HeaderLevel, string> = {
  1: cx.header.size.h1FontSize,
  2: cx.header.size.h2FontSize,
  3: cx.header.size.h3FontSize,
  4: cx.header.size.h4FontSize,
  5: cx.header.size.h5FontSize,
  6: cx.header.size.h6FontSize,
};

/**
 * Polymorphic heading component that renders an `h1`–`h6` tag with a consistent font weight and per-level font size drawn from style tokens.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Tag is derived dynamically from `level`: `` `h${level}` ``.
 * - Font sizes: h1 = xl, h2 = lg, h3 = base, h4/h5/h6 = sm/xs/xs.
 */
export function Header({ level, className, children, ...rest }: HeaderProps) {
  const Tag = `h${level}` as `h${HeaderLevel}`;
  return (
    <Tag
      className={clsx(
        cx.header.style.fontWeight,
        cx.header.color.textColor,
        levelFontSizes[level],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
