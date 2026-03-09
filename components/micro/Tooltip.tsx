import React from "react";
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
        className={`${cx.tooltip.style.base} ${cx.tooltip.color.default} ${cx.tooltip.size.default} ${positionClasses}`}
      >
        {text}
      </span>
    </span>
  );
}
