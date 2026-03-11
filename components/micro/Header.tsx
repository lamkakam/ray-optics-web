"use client";
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
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
