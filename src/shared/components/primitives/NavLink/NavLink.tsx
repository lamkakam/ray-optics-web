"use client";

import React from "react";
import Link from "next/link";
import { componentTokens } from "@/shared/tokens/styleTokens";

const cx = componentTokens.navLink;

interface NavLinkProps {
  readonly active: boolean;
  readonly href: string;
  readonly children: React.ReactNode;
  readonly "aria-label"?: string;
  readonly "aria-current"?: "page" | undefined;
  readonly className?: string;
  readonly onClick?: () => void;
}

export function NavLink({
  active,
  href,
  children,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
  className,
  onClick,
}: NavLinkProps) {
  const baseClasses = [
    cx.style.display,
    cx.size.horizontalPadding,
    cx.size.verticalPadding,
    cx.style.borderRadius,
    cx.size.fontSize,
    cx.style.fontWeight,
    cx.style.transition,
    cx.style.cursor,
  ].join(" ");

  const variantClasses = active
    ? `${cx.color.activeBgColor} ${cx.color.activeTextColor}`
    : `${cx.color.inactiveTextColor} ${cx.color.inactiveHoverBgColor}`;

  return (
    <Link
      href={href}
      className={[baseClasses, variantClasses, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
