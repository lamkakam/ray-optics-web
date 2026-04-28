import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface LoadingOverlayProps {
  readonly title: string;
  readonly contents: React.ReactNode;
}

export function LoadingOverlay({ title, contents }: LoadingOverlayProps) {
  const overlayClass = clsx(
    cx.overlay.style.zIndex,
    cx.overlay.style.backdropBlur,
    cx.overlay.color.backdropBgColor
  );
  const panelClass = clsx(
    cx.overlay.style.panelBorderRadius,
    cx.overlay.size.panelHorizontalPadding,
    cx.overlay.size.panelVerticalPadding,
    cx.overlay.style.panelShadow,
    cx.overlay.color.panelBgColor,
    cx.overlay.color.panelTextColor
  );

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center ${overlayClass}`}>
      <div className={`flex flex-col items-center gap-4 ${panelClass}`}>
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
        <div className="text-center text-sm text-gray-700 dark:text-gray-300">
          {contents}
        </div>
      </div>
    </div>
  );
}
