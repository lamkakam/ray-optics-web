/** Portal and in-flow tooltip positioning, viewport correction, and touch behavior. */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface TooltipProps {
  /** Tooltip content */
  readonly text: string;
  /** Trigger element */
  readonly children: React.ReactNode;
  /** Placement relative to trigger. Defaults to `"top"` */
  readonly position?: "top" | "bottom" | "top-start" | "start" | "no-transform";
  /** When `true`, renders via `createPortal` using fixed positioning. Required inside AG Grid cells. Defaults to `false` */
  readonly portal?: boolean;
  /** When `true` in portal mode, uses a `touchstart` ref flag to suppress the synthetic `mouseenter` browsers fire after touch. It does not apply `touch-action: none`, so native scroll and pan gestures remain available. Defaults to `false` */
  readonly noTouch?: boolean;
  /** Additional classes for the trigger wrapper span. Use this when the hover target must fill its parent, such as an AG Grid cell action area. */
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

/**
 * Hover tooltip with two rendering modes: a viewport-aware CSS `group-hover` absolute variant (default) and a `portal` variant that renders via `createPortal` into `document.body` to avoid overflow-hidden clipping inside AG Grid cells.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - **Non-portal mode**: uses CSS `group-hover:opacity-100` on an absolutely positioned `<span>`. On hover, the trigger and tooltip rectangles are measured and the tooltip receives a horizontal offset that clamps it to an 8px viewport gutter while preserving the existing vertical placement and `position` prop behavior. The correction is recalculated during viewport resize and captured scroll events, and reset on mouse leave.
 * - **Non-portal content sizing**: uses a maximum width of `calc(100vw - 16px)`, normal whitespace, and word breaking so long messages wrap within the viewport on narrow screens.
 * - **Portal mode**: attaches `onMouseEnter`/`onMouseLeave` listeners, measures the trigger rect via `getBoundingClientRect`, and renders a fixed `<span>` at those coordinates.
 * - `triggerClassName` is merged onto the trigger wrapper in both portal and non-portal modes without changing default inline-flex behavior.
 * - `portal` must be `true` when the tooltip is rendered inside any element with `overflow: hidden` (e.g. AG Grid rows).
 * - **`noTouch` mode**: in portal mode, attaches an `onTouchStart` handler that sets `isTouchingRef.current = true`. When `onMouseEnter` fires and `noTouch && isTouchingRef.current` is true (i.e., the enter was synthesized from a touch tap), the handler resets the flag and returns early without showing the tooltip. Plain mouse hovers are unaffected because no `touchstart` precedes them. `onMouseLeave` always resets the flag. `noTouch` does not apply `touch-action: none`, because doing so blocks native scroll and pan gestures on iOS Safari. Should be set on any portal `<Tooltip>` that wraps a clickable element (button, toggle, etc.).
 */
export function Tooltip({
  text,
  children,
  position = "top",
  portal = false,
  noTouch,
  triggerClassName,
}: TooltipProps) {
  /** Trigger geometry source used by both positioning modes. */
  const triggerRef = useRef<HTMLSpanElement>(null);
  /** Tooltip geometry source used for non-portal viewport correction. */
  const nonPortalTooltipRef = useRef<HTMLSpanElement>(null);
  /** Portal-mode visibility. */
  const [visible, setVisible] = useState(false);
  /** Portal-mode trigger coordinates. */
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  /** Whether the in-flow trigger is hovered and should be remeasured. */
  const [nonPortalHovered, setNonPortalHovered] = useState(false);
  /** Horizontal correction that keeps an in-flow tooltip inside the viewport. */
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const horizontalOffsetRef = useRef(0);
  /** Suppresses synthetic mouse events emitted after portal-mode touch input. */
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
