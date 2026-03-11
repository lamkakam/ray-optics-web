import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface TooltipProps {
  readonly text: string;
  readonly children: React.ReactNode;
  readonly position?: "top" | "bottom";
}

const baseClasses = clsx(
  cx.tooltip.style.pointerEvents,
  cx.tooltip.style.borderRadius,
  cx.tooltip.style.opacity,
  cx.tooltip.style.transition,
  cx.tooltip.style.hoverOpacity,
  cx.tooltip.style.zIndex,
  cx.tooltip.color.bgColor,
  cx.tooltip.color.textColor,
  cx.tooltip.size.horizontalPadding,
  cx.tooltip.size.verticalPadding,
  cx.tooltip.size.fontSize,
);


export function Tooltip({ text, children, position = "top" }: TooltipProps) {
  const positionClasses =
    position === "top" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={clsx(
          "absolute left-1/2 -translate-x-1/2",
          "whitespace-nowrap",
          baseClasses,
          positionClasses,
        )}
      >
        {text}
      </span>
    </span>
  );
}
