/**
# `shared/components/primitives/ExternalLink/ExternalLink.tsx`
*/
import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

type ExternalLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children" | "target" | "rel" | "aria-label"
> & {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly "aria-label": string;
  readonly variant?: "default" | "description";
};

const { color, size, style } = cx.externalLink;

const fontSizeByVariant: Record<NonNullable<ExternalLinkProps["variant"]>, string> = {
  default: size.fontSize,
  description: size.descriptionFontSize,
};

/**
## Purpose

External URL link primitive for source/reference links that should leave the app. It renders a plain HTML anchor rather than Next.js `Link`.

## Key Behaviors

- Always renders `target="_blank"` and `rel="noopener noreferrer"`; consumers cannot override either attribute.
- Requires an explicit `aria-label` so external links remain accessible when visible text is generic.
- Uses the `"default"` variant when no variant is provided.
- Uses `componentTokens.externalLink.size.fontSize` for the default variant and `componentTokens.externalLink.size.descriptionFontSize` for the `"description"` variant.
- Uses `componentTokens.externalLink` for theme-aware text colors, hover colors, underline styling, transitions, and focus-visible styling.
- Merges consumer `className` with token classes via `clsx` + `twMerge`, allowing focused overrides including consumer font-size classes.

## Usages

```tsx
<ExternalLink href="https://example.com/source" aria-label="Open source material">
  Source material
</ExternalLink>
```
*/
export function ExternalLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
  variant = "default",
  ...rest
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={twMerge(
        clsx(
          color.textColor,
          color.hoverTextColor,
          color.decorationColor,
          color.focusRingColor,
          fontSizeByVariant[variant],
          size.focusRingWidth,
          style.fontWeight,
          style.underline,
          style.underlineOffset,
          style.transition,
          style.outline,
          style.focusRing,
          style.focusRingOffset,
          style.focusRingOffsetColor,
          className,
        ),
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
