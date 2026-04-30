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
};

const { color, size, style } = cx.externalLink;

export function ExternalLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
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
          size.fontSize,
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
