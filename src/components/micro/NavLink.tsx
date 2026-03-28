"use client";

import React from "react";
import { componentTokens } from "@/components/ui/styleTokens";

const cx = componentTokens.navLink;

interface NavLinkProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
  readonly "aria-label"?: string;
  readonly "aria-current"?: "page" | undefined;
  readonly className?: string;
}

export function NavLink({
  active,
  onClick,
  children,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
  className,
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick();
  };

  return (
    <a
      href="#"
      role="link"
      className={[baseClasses, variantClasses, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
