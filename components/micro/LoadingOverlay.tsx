import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Paragraph } from "@/components/micro/Paragraph";

interface LoadingOverlayProps {
  readonly title: string;
  readonly contents: React.ReactNode;
}

export function LoadingOverlay({ title, contents }: LoadingOverlayProps) {
  const overlayClass = clsx(
    cx.overlay.style.initLayout,
    cx.overlay.style.initZIndex,
    cx.overlay.style.initBlur,
    cx.overlay.color.initBgColor
  );
  const cardClass = clsx(
    cx.overlay.style.cardLayout,
    cx.overlay.style.cardBorderRadius,
    cx.overlay.size.cardHorizontalPadding,
    cx.overlay.size.cardVerticalPadding,
    cx.overlay.style.cardShadow,
    cx.overlay.color.cardBgColor,
    cx.overlay.color.cardTextColor
  );

  return (
    <div className={overlayClass}>
      <div className={cardClass}>
        <svg
          className="h-10 w-10 animate-spin text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <Paragraph className="text-lg font-semibold tracking-wide">{title}</Paragraph>
        <Paragraph>{contents}</Paragraph>
      </div>
    </div>
  );
}
