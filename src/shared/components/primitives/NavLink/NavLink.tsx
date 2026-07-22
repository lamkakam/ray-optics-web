/**
# NavLink.tsx

## Styling (via `componentTokens.navLink` in `styleTokens.ts`)
- Base: `block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer`
- Active: `bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400`
- Inactive: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`

## Behaviour
- Renders a Next.js `Link`
- Preserves normal route navigation through `href`
- Invokes `onClick` when supplied and passes through the anchor click event, allowing callers to call `preventDefault()` before guarded programmatic navigation
- Active/inactive state is controlled entirely via the `active` prop
*/
"use client";

import React from "react";
import Link from "next/link";
import { componentTokens } from "@/shared/tokens/styleTokens";

const cx = componentTokens.navLink;

/**
## Props
| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Active state — drives colour variant |
| `href` | `string` | Route destination |
| `children` | `React.ReactNode` | Label |
| `aria-label` | `string \| undefined` | ARIA label |
| `aria-current` | `"page" \| undefined` | Active ARIA attribute |
| `className` | `string \| undefined` | Optional extra Tailwind classes |
| `onClick` | `React.MouseEventHandler<HTMLAnchorElement> \| undefined` | Optional click callback that receives the anchor click event |
*/
interface NavLinkProps {
  readonly active: boolean;
  readonly href: string;
  readonly children: React.ReactNode;
  readonly "aria-label"?: string;
  readonly "aria-current"?: "page" | undefined;
  readonly className?: string;
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

/**
## Purpose
Micro-component for navigation links. Wraps Next.js `Link` with the app's active/inactive styling and optional click handling.

## Usages

```tsx
// Navigation link in SideNav
{NAV_ITEMS.map(({ href, label }) => (
  <NavLink
    key={href}
    href={href}
    active={pathname === href}
    aria-label={label}
    aria-current={pathname === href ? "page" : undefined}
    onClick={(event) => {
      event.preventDefault();
      guardedNavigate(href);
    }}
  >
    {label}
  </NavLink>
))}

// Active and inactive states
<div className="space-y-2">
  <NavLink
    href="/"
    active={true}
    aria-label="Home"
    aria-current="page"
  >
    Home
  </NavLink>
  <NavLink
    href="/settings"
    active={false}
    aria-label="Settings"
  >
    Settings
  </NavLink>
</div>

// With custom className
<NavLink
  active={isActive}
  href="/custom"
  onClick={handleClick}
  className="mx-2"
  aria-label="Custom link"
>
  Custom Link
</NavLink>
```
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
