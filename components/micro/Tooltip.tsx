import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface TooltipProps {
  readonly text: string;
  readonly children: React.ReactNode;
  readonly position?: "top" | "bottom";
}

export function Tooltip({ text, children, position = "top" }: TooltipProps) {
  const positionClasses =
    position === "top" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={clsx(cx.tooltip.style.base, cx.tooltip.color.bgColor, cx.tooltip.color.textColor, cx.tooltip.size.default, positionClasses)}
      >
        {text}
      </span>
    </span>
  );
}
