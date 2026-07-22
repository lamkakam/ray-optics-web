/**
# `shared/components/primitives/InlineLink/InlineLink.tsx`
*/
"use client";

import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

/**
## Props

```ts
interface InlineLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}
```
*/
interface InlineLinkProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly "aria-label"?: string;
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

/**
## Purpose

Inline navigation link primitive for text-style links rendered with Next.js `Link`. Used for contextual navigation actions inside forms and side panels.

## Key Behaviors

- Renders a Next.js `Link`
- Uses inline text-link styling with underline and theme-aware colours
- Merges consumer `className` with the default classes via `clsx` + `twMerge`
- Supports explicit `aria-label` for accessibility when the visible label is not enough
- Forwards an optional typed anchor click handler for navigation actions that also update client state

## Usages

```tsx
<InlineLink href="/glass-map?source=medium-selector&catalog=Schott&glass=N-BK7">
  View in glass map
</InlineLink>

<InlineLink href="/" aria-label="Back to lens editor">
  Back to lens editor
</InlineLink>
```
*/
export function InlineLink({
  href,
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
}: InlineLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={onClick}
      className={twMerge(
        clsx(
          "text-sm font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-500 dark:hover:text-blue-300",
          className,
        ),
      )}
    >
      {children}
    </Link>
  );
}
