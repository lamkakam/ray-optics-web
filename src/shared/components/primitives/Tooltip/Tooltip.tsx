import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface TooltipProps {
  readonly text: string;
  readonly children: React.ReactNode;
  readonly position?: "top" | "bottom" | "top-start" | "start" | "no-transform";
  readonly portal?: boolean;
  readonly noTouch?: boolean;
  readonly triggerClassName?: string;
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

const VIEWPORT_GUTTER = 8;

function getViewportSafeOffset(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  currentOffset: number,
  viewportWidth: number,
): number {
  const tooltipLeftWithinTrigger = tooltipRect.left - triggerRect.left - currentOffset;
  const tooltipLeft = triggerRect.left + tooltipLeftWithinTrigger;
  const availableWidth = Math.max(viewportWidth - VIEWPORT_GUTTER * 2, 0);

  if (tooltipRect.width > availableWidth) {
    return VIEWPORT_GUTTER - tooltipLeft;
  }

  const maxTooltipLeft = viewportWidth - VIEWPORT_GUTTER - tooltipRect.width;
  const safeTooltipLeft = Math.min(
    Math.max(tooltipLeft, VIEWPORT_GUTTER),
    maxTooltipLeft,
  );

  return safeTooltipLeft - tooltipLeft;
}

export function Tooltip({
  text,
  children,
  position = "top",
  portal = false,
  noTouch,
  triggerClassName,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const nonPortalTooltipRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [nonPortalHovered, setNonPortalHovered] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const horizontalOffsetRef = useRef(0);
  const isTouchingRef = useRef(false);

  useEffect(() => {
    if (portal || !nonPortalHovered) {
      return undefined;
    }

    const updatePosition = () => {
      const triggerElement = triggerRef.current;
      const tooltipElement = nonPortalTooltipRef.current;
      if (!triggerElement || !tooltipElement) {
        return;
      }

      const triggerRect = triggerElement.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();
      const nextOffset = getViewportSafeOffset(
        triggerRect,
        tooltipRect,
        horizontalOffsetRef.current,
        window.innerWidth,
      );

      horizontalOffsetRef.current = nextOffset;
      setHorizontalOffset(nextOffset);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [nonPortalHovered, portal]);

  if (portal) {
    const handleMouseEnter = () => {
      if (noTouch && isTouchingRef.current) {
        isTouchingRef.current = false;
        return;
      }
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const y =
          position === "top" || position === "top-start" ? rect.top - 4
            : position === "no-transform" || position === "start" ? rect.top
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
                : position === "top-start" ? "translate(-25%, -100%)"
                  : position === "start" ? "translateX(-25%)"
                    : undefined,
        }}
      >
        {text}
      </span>
    );

    return (
      <span
        ref={triggerRef}
        className={clsx("relative inline-flex", triggerClassName)}
        onTouchStart={noTouch ? () => { isTouchingRef.current = true; } : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => { isTouchingRef.current = false; setVisible(false); }}
      >
        {children}
        {createPortal(tooltipElement, document.body)}
      </span>
    );
  }

  const positionClasses =
    position === "top" ? "left-1/2 -translate-x-1/2 bottom-full mb-1"
      : position === "bottom" ? "left-1/2 -translate-x-1/2 top-full mt-1"
        : position === "top-start" ? "left-1/2 -translate-x-1/4 bottom-full mb-1"
          : position === "start" ? "left-1/2 -translate-x-1/4"
            : "";

  return (
    <span
      className={clsx("group relative inline-flex", triggerClassName)}
      ref={triggerRef}
      onMouseEnter={() => setNonPortalHovered(true)}
      onMouseLeave={() => {
        horizontalOffsetRef.current = 0;
        setHorizontalOffset(0);
        setNonPortalHovered(false);
      }}
    >
      {children}
      <span
        ref={nonPortalTooltipRef}
        role="tooltip"
        className={clsx(
          "absolute",
          "whitespace-nowrap",
          baseClasses,
          positionClasses,
        )}
        style={{
          marginLeft: horizontalOffset,
          maxWidth: "calc(100vw - 16px)",
          overflowWrap: "break-word",
          whiteSpace: "normal",
        }}
      >
        {text}
      </span>
    </span>
  );
}
