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
