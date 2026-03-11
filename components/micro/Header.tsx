"use client";
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type HeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeaderVariant = "page" | "modal" | "section";

interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  readonly level: HeaderLevel;
  readonly variant: HeaderVariant;
}

const variantClasses: Record<HeaderVariant, string[]> = {
  page: [cx.header.style.fontWeight, cx.header.color.textColor],
  section: [cx.header.size.sectionMargin, cx.header.size.sectionFontSize, cx.header.style.fontWeight, cx.header.color.textColor],
  modal: [cx.header.style.fontWeight, cx.header.size.modalFontSize, cx.header.size.modalMargin, cx.header.size.modalPadding, cx.header.color.textColor],
};

export function Header({ level, variant, className, children, ...rest }: HeaderProps) {
  const Tag = `h${level}` as `h${HeaderLevel}`;
  return (
    <Tag className={clsx(variantClasses[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}
