"use client";

import React from "react";
import Link from "next/link";
import { componentTokens } from "@/shared/tokens/styleTokens";

const cx = componentTokens.navLink;

interface NavLinkProps {
  /** Active state — drives colour variant */
  readonly active: boolean;
  /** Route destination */
  readonly href: string;
  /** Label */
  readonly children: React.ReactNode;
  /** ARIA label */
  readonly "aria-label"?: string;
  /** Active ARIA attribute */
  readonly "aria-current"?: "page" | undefined;
  /** Optional extra Tailwind classes */
  readonly className?: string;
  /** Optional click callback that receives the anchor click event */
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

/**
 *
 * ## Styling (via `componentTokens.navLink` in `styleTokens.ts`)
 * - Base: `block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer`
 * - Active: `bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400`
 * - Inactive: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`
 *
 * ## Behaviour
 * - Renders a Next.js `Link`
 * - Preserves normal route navigation through `href`
 * - Invokes `onClick` when supplied and passes through the anchor click event, allowing callers to call `preventDefault()` before guarded programmatic navigation
 * - Active/inactive state is controlled entirely via the `active` prop
 */
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
