import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface TooltipProps {
  readonly text: string;
  readonly children: React.ReactNode;
  readonly position?: "top" | "bottom" | "top-left" | "no-transform";
  readonly portal?: boolean;
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

const portalBaseClasses = clsx(
  "pointer-events-none",
  cx.tooltip.style.borderRadius,
  cx.tooltip.style.transition,
  "z-[9999]",
  cx.tooltip.color.bgColor,
  cx.tooltip.color.textColor,
  cx.tooltip.size.horizontalPadding,
  cx.tooltip.size.verticalPadding,
  cx.tooltip.size.fontSize,
  "fixed",
  "whitespace-nowrap",
);


export function Tooltip({ text, children, position = "top", portal = false }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  if (portal) {
    const handleMouseEnter = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const y =
          position === "top" || position === "top-left" ? rect.top - 4
          : position === "no-transform" ? rect.top
          : rect.bottom + 4;
        setCoords({
          x: rect.left + rect.width / 2,
          y,
        });
      }
      setVisible(true);
    };

    const tooltipElement = (
      <span
        role="tooltip"
        className={clsx(portalBaseClasses, visible ? "opacity-100" : "opacity-0")}
        style={{
          left: coords.x,
          top: coords.y,
          transform:
            position === "top" ? "translate(-50%, -100%)"
            : position === "bottom" ? "translateX(-50%)"
            : position === "top-left" ? "translate(0, -100%)"
            : undefined,
        }}
      >
        {text}
      </span>
    );

    return (
      <span
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
        {createPortal(tooltipElement, document.body)}
      </span>
    );
  }

  const positionClasses =
    position === "top" ? "left-1/2 -translate-x-1/2 bottom-full mb-1"
    : position === "bottom" ? "left-1/2 -translate-x-1/2 top-full mt-1"
    : position === "top-left" ? "bottom-full mb-1"
    : "";

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={clsx(
          "absolute",
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
