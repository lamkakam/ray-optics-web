"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows, GridColumns } from "@visx/grid";
import { Zoom } from "@visx/zoom";
import { Group } from "@visx/group";
import { useTooltip, Tooltip } from "@visx/tooltip";
import { CATALOG_COLOR_MAP } from "@/shared/lib/types/glassMap";
import type { PlotPoint, SelectedGlass } from "@/shared/lib/types/glassMap";

interface GlassScatterPlotProps {
  readonly points: readonly PlotPoint[];
  readonly selectedGlass: SelectedGlass | undefined;
  readonly xAxisLabel: string;
  readonly yAxisLabel: string;
  readonly onPointClick: (glass: SelectedGlass) => void;
  readonly yDomainMin?: number;
  readonly yDomainMax?: number;
}

const MARGIN = { top: 20, right: 20, bottom: 50, left: 60 };
const DEFAULT_POINT_RADIUS = 4;
const SELECTED_POINT_RADIUS = 6;
const SELECTED_POINT_STROKE_WIDTH = 1.5;

interface ZoomTransformMatrix {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly translateX: number;
  readonly translateY: number;
}

interface ComputeRenderedCircleStyleArgs {
  readonly cx: number;
  readonly cy: number;
  readonly isSelected: boolean;
  readonly transformMatrix: ZoomTransformMatrix;
}

interface RenderedCircleStyle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly strokeWidth: number;
}

function isSingleTouchEvent(event: React.TouchEvent<SVGCircleElement>): boolean {
  return event.touches.length === 1;
}

interface ClientTouchPoint {
  readonly clientX: number;
  readonly clientY: number;
}

interface PlotBounds {
  readonly left: number;
  readonly top: number;
}

interface PanTouchState {
  readonly mode: "pan";
  readonly startPoint: {
    readonly x: number;
    readonly y: number;
  };
  readonly startTranslate: {
    readonly translateX: number;
    readonly translateY: number;
  };
}

interface PinchTouchState {
  readonly mode: "pinch";
  readonly lastDistance: number;
}

type TouchGestureState = PanTouchState | PinchTouchState;

export function getTouchDistance(touches: readonly [ClientTouchPoint, ClientTouchPoint]): number {
  const [firstTouch, secondTouch] = touches;
  return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
}

export function getTouchMidpoint(
  touches: readonly [ClientTouchPoint, ClientTouchPoint]
): ClientTouchPoint {
  const [firstTouch, secondTouch] = touches;
  return {
    clientX: (firstTouch.clientX + secondTouch.clientX) / 2,
    clientY: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

export function getPlotRelativePoint(
  point: ClientTouchPoint,
  bounds: PlotBounds
): { x: number; y: number } {
  return {
    x: point.clientX - bounds.left - MARGIN.left,
    y: point.clientY - bounds.top - MARGIN.top,
  };
}

export function computeRenderedCircleStyle({
  cx,
  cy,
  isSelected,
  transformMatrix,
}: ComputeRenderedCircleStyleArgs): RenderedCircleStyle {
  const baseRadius = isSelected ? SELECTED_POINT_RADIUS : DEFAULT_POINT_RADIUS;
  const baseStrokeWidth = isSelected ? SELECTED_POINT_STROKE_WIDTH : 0;

  return {
    cx: cx * transformMatrix.scaleX + transformMatrix.translateX,
    cy: cy * transformMatrix.scaleY + transformMatrix.translateY,
    r: baseRadius,
    strokeWidth: baseStrokeWidth,
  };
}

interface InnerPlotProps extends GlassScatterPlotProps {
  readonly width: number;
  readonly height: number;
}

function InnerPlot({
  points,
  selectedGlass,
  xAxisLabel,
  yAxisLabel,
  onPointClick,
  yDomainMin,
  yDomainMax,
  width,
  height,
}: InnerPlotProps) {
  const touchSurfaceRef = useRef<HTMLDivElement | null>(null);
  const touchGestureRef = useRef<TouchGestureState | undefined>(undefined);
  const activePointerIdRef = useRef<number | undefined>(undefined);
  const previousUserSelectRef = useRef<string>("");
  const [isDesktopDragging, setIsDesktopDragging] = useState(false);
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<PlotPoint>();

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 100);
  const yMin = yDomainMin !== undefined ? Math.min(...yValues, yDomainMin) : Math.min(...yValues);
  const yMax = yDomainMax !== undefined ? Math.max(...yValues, yDomainMax) : Math.max(...yValues);
  const xPad = (xMax - xMin) * 0.05;
  const yPad = (yMax - yMin) * 0.05;

  const xScale = scaleLinear<number>({
    domain: [xMax + xPad, xMin - xPad], // reversed: high Abbe left
    range: [0, innerWidth],
  });

  const yScale = scaleLinear<number>({
    domain: [yMin - yPad, yMax + yPad],
    range: [innerHeight, 0],
  });

  const initialTransform = {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    skewX: 0,
    skewY: 0,
  };

  const handlePointClick = useCallback(
    (point: PlotPoint) => {
      onPointClick({ catalogName: point.catalogName, glassName: point.glassName, data: point.data });
    },
    [onPointClick]
  );

  const clipId = "glass-scatter-clip";

  const getSurfaceBounds = useCallback((): PlotBounds | undefined => {
    const rect = touchSurfaceRef.current?.getBoundingClientRect();
    if (rect === undefined) {
      return undefined;
    }

    return { left: rect.left, top: rect.top };
  }, []);

  useEffect(() => {
    if (isDesktopDragging) {
      previousUserSelectRef.current = document.body.style.userSelect;
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = previousUserSelectRef.current;
    }

    return () => {
      document.body.style.userSelect = previousUserSelectRef.current;
    };
  }, [isDesktopDragging]);

  useEffect(() => {
    if (!isDesktopDragging) {
      return undefined;
    }

    const handleSelectStart = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("selectstart", handleSelectStart, true);

    return () => {
      document.removeEventListener("selectstart", handleSelectStart, true);
    };
  }, [isDesktopDragging]);

  return (
    <div
      ref={touchSurfaceRef}
      data-testid="glass-scatter-touch-surface"
      style={{ position: "relative", width: "100%", height: "100%", touchAction: "none" }}
    >
      <Zoom
        width={innerWidth}
        height={innerHeight}
        scaleXMin={0.2}
        scaleXMax={40}
        scaleYMin={0.2}
        scaleYMax={40}
        initialTransformMatrix={initialTransform}
      >
        {(zoom) => {
          const endDesktopDrag = (
            event?: React.PointerEvent<SVGRectElement> | React.SyntheticEvent<SVGRectElement>
          ) => {
            const currentTarget = event?.currentTarget;

            if (
              currentTarget !== undefined &&
              activePointerIdRef.current !== undefined &&
              typeof currentTarget.releasePointerCapture === "function"
            ) {
              try {
                currentTarget.releasePointerCapture(activePointerIdRef.current);
              } catch {
                // Ignore release errors if capture has already been cleared by the browser.
              }
            }

            activePointerIdRef.current = undefined;
            setIsDesktopDragging(false);
            zoom.dragEnd();
          };

          const handlePointerDown = (event: React.PointerEvent<SVGRectElement>) => {
            if (event.pointerType === "touch") {
              return;
            }

            event.preventDefault();
            activePointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDesktopDragging(true);
            zoom.dragStart(event);
          };

          const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
            if (
              activePointerIdRef.current === undefined ||
              activePointerIdRef.current !== event.pointerId
            ) {
              return;
            }

            zoom.dragMove(event);
          };

          const handlePointerUp = (event: React.PointerEvent<SVGRectElement>) => {
            if (activePointerIdRef.current !== event.pointerId) {
              return;
            }

            endDesktopDrag(event);
          };

          const handlePointerCancel = (event: React.PointerEvent<SVGRectElement>) => {
            if (activePointerIdRef.current !== event.pointerId) {
              return;
            }

            endDesktopDrag(event);
          };

          const handleLostPointerCapture = (event: React.PointerEvent<SVGRectElement>) => {
            if (activePointerIdRef.current !== event.pointerId) {
              return;
            }

            endDesktopDrag(event);
          };
          const beginPanTouch = (touch: ClientTouchPoint) => {
            const bounds = getSurfaceBounds();
            if (bounds === undefined) {
              return;
            }

            touchGestureRef.current = {
              mode: "pan",
              startPoint: getPlotRelativePoint(touch, bounds),
              startTranslate: {
                translateX: zoom.transformMatrix.translateX,
                translateY: zoom.transformMatrix.translateY,
              },
            };
          };

          const beginPinchTouch = (touches: readonly [ClientTouchPoint, ClientTouchPoint]) => {
            touchGestureRef.current = {
              mode: "pinch",
              lastDistance: getTouchDistance(touches),
            };
          };

          const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
            if (event.touches.length >= 2) {
              beginPinchTouch([event.touches[0], event.touches[1]]);
              return;
            }

            if (event.touches.length === 1) {
              beginPanTouch(event.touches[0]);
            }
          };

          const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
            const bounds = getSurfaceBounds();
            if (bounds === undefined) {
              return;
            }

            if (event.touches.length >= 2) {
              event.preventDefault();
              const touches = [event.touches[0], event.touches[1]] as const;
              const midpoint = getPlotRelativePoint(getTouchMidpoint(touches), bounds);
              const distance = getTouchDistance(touches);
              const previousDistance =
                touchGestureRef.current?.mode === "pinch"
                  ? touchGestureRef.current.lastDistance
                  : distance;
              const scaleDelta = previousDistance === 0 ? 1 : distance / previousDistance;

              if (scaleDelta !== 1) {
                zoom.scale({ scaleX: scaleDelta, scaleY: scaleDelta, point: midpoint });
              }

              touchGestureRef.current = {
                mode: "pinch",
                lastDistance: distance,
              };
              return;
            }

            if (event.touches.length !== 1 || touchGestureRef.current?.mode !== "pan") {
              return;
            }

            event.preventDefault();
            const currentPoint = getPlotRelativePoint(event.touches[0], bounds);
            zoom.setTranslate({
              translateX:
                touchGestureRef.current.startTranslate.translateX +
                (currentPoint.x - touchGestureRef.current.startPoint.x),
              translateY:
                touchGestureRef.current.startTranslate.translateY +
                (currentPoint.y - touchGestureRef.current.startPoint.y),
            });
          };

          const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
            if (event.touches.length >= 2) {
              beginPinchTouch([event.touches[0], event.touches[1]]);
              return;
            }

            if (event.touches.length === 1) {
              beginPanTouch(event.touches[0]);
              return;
            }

            touchGestureRef.current = undefined;
          };

          // Derive visible axis domain from zoom transform
          const tx = zoom.transformMatrix.translateX;
          const ty = zoom.transformMatrix.translateY;
          const sx = zoom.transformMatrix.scaleX;
          const sy = zoom.transformMatrix.scaleY;

          const xDomainReversed = [xMax + xPad, xMin - xPad];
          const xRange = xDomainReversed[1] - xDomainReversed[0]; // negative for reversed
          const visXMin = xDomainReversed[0] - tx / sx / innerWidth * xRange;
          const visXMax = xDomainReversed[0] - (tx / sx - innerWidth / sx) / innerWidth * xRange;

          const yDomain = [yMin - yPad, yMax + yPad];
          const yRange = yDomain[1] - yDomain[0];
          const visYMax = yDomain[1] + ty / sy / innerHeight * yRange;
          const visYMin = yDomain[1] - (innerHeight / sy - ty / sy) / innerHeight * yRange;

          const axisXScale = scaleLinear<number>({
            domain: [visXMin, visXMax],
            range: [0, innerWidth],
          });
          const axisYScale = scaleLinear<number>({
            domain: [visYMin, visYMax],
            range: [innerHeight, 0],
          });

          // Crosshair: find selected point in points array
          const selectedPoint = selectedGlass
            ? points.find(
                (p) =>
                  p.glassName === selectedGlass.glassName &&
                  p.catalogName === selectedGlass.catalogName
              )
            : undefined;
          const crosshairX = selectedPoint !== undefined ? axisXScale(selectedPoint.x) : undefined;
          const crosshairY = selectedPoint !== undefined ? axisYScale(selectedPoint.y) : undefined;

          return (
            <div
              style={{ width: "100%", height: "100%" }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <svg width={width} height={height}>
                <defs>
                  <clipPath id={clipId}>
                    <rect x={0} y={0} width={innerWidth} height={innerHeight} />
                  </clipPath>
                </defs>
                <Group left={MARGIN.left} top={MARGIN.top}>
                  {/* Axis labels */}
                  <text
                    x={innerWidth / 2}
                    y={innerHeight + MARGIN.bottom - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fill="currentColor"
                  >
                    {xAxisLabel}
                  </text>
                  <text
                    x={-(innerHeight / 2)}
                    y={-MARGIN.left + 14}
                    textAnchor="middle"
                    fontSize={12}
                    fill="currentColor"
                    transform="rotate(-90)"
                  >
                    {yAxisLabel}
                  </text>

                  {/* Zoom interaction rect */}
                  <rect
                    data-testid="glass-scatter-interaction-surface"
                    width={innerWidth}
                    height={innerHeight}
                    fill="transparent"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onLostPointerCapture={handleLostPointerCapture}
                    onWheel={zoom.handleWheel}
                    style={{
                      cursor: isDesktopDragging ? "grabbing" : "grab",
                      touchAction: "none",
                    }}
                  />

                  {/* Grid lines and data points (clipped) */}
                  <g clipPath={`url(#${clipId})`}>
                    {/* Grid lines – use axis scales so they align with ticks */}
                    <GridRows
                      scale={axisYScale}
                      width={innerWidth}
                      numTicks={6}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                    />
                    <GridColumns
                      scale={axisXScale}
                      height={innerHeight}
                      numTicks={8}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                    />

                    {/* Data points */}
                    {points.map((point) => {
                      const isSelected =
                        selectedGlass?.glassName === point.glassName &&
                        selectedGlass?.catalogName === point.catalogName;
                      const circleStyle = computeRenderedCircleStyle({
                        cx: xScale(point.x),
                        cy: yScale(point.y),
                        isSelected,
                        transformMatrix: {
                          scaleX: sx,
                          scaleY: sy,
                          translateX: tx,
                          translateY: ty,
                        },
                      });

                      return (
                        <circle
                          key={`${point.catalogName}-${point.glassName}`}
                          data-testid="glass-point"
                          cx={circleStyle.cx}
                          cy={circleStyle.cy}
                          r={circleStyle.r}
                          fill={CATALOG_COLOR_MAP[point.catalogName]}
                          stroke={isSelected ? "#000" : "none"}
                          strokeWidth={circleStyle.strokeWidth}
                          opacity={0.8}
                          style={{ cursor: "pointer" }}
                          onClick={() => handlePointClick(point)}
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                            showTooltip({
                              tooltipData: point,
                              tooltipLeft: rect.right + 8,
                              tooltipTop: rect.top,
                            });
                          }}
                          onMouseLeave={hideTooltip}
                          onTouchStart={(e) => {
                            if (!isSingleTouchEvent(e)) {
                              return;
                            }
                            const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                            showTooltip({
                              tooltipData: point,
                              tooltipLeft: rect.right + 8,
                              tooltipTop: rect.top,
                            });
                            handlePointClick(point);
                          }}
                        />
                      );
                    })}

                    {/* Crosshair lines for selected glass */}
                    {crosshairX !== undefined && crosshairY !== undefined && (
                      <>
                        <line
                          data-testid="crosshair-h"
                          x1={0}
                          x2={innerWidth}
                          y1={crosshairY}
                          y2={crosshairY}
                          stroke="var(--crosshair-stroke)"
                          strokeWidth={1}
                          strokeDasharray="5 4"
                          pointerEvents="none"
                        />
                        <line
                          data-testid="crosshair-v"
                          x1={crosshairX}
                          x2={crosshairX}
                          y1={0}
                          y2={innerHeight}
                          stroke="var(--crosshair-stroke)"
                          strokeWidth={1}
                          strokeDasharray="5 4"
                          pointerEvents="none"
                        />
                      </>
                    )}
                  </g>

                  {/* Axes (outside zoom group for fixed positioning) */}
                  <AxisBottom
                    top={innerHeight}
                    scale={axisXScale}
                    numTicks={8}
                    stroke="currentColor"
                    tickStroke="currentColor"
                    tickLabelProps={{ fill: "currentColor", fontSize: 10, textAnchor: "middle" }}
                  />
                  <AxisLeft
                    scale={axisYScale}
                    numTicks={6}
                    stroke="currentColor"
                    tickStroke="currentColor"
                    tickLabelProps={{ fill: "currentColor", fontSize: 10, textAnchor: "end" }}
                  />
                </Group>
              </svg>
            </div>
          );
        }}
      </Zoom>
      {tooltipOpen && tooltipData && (
        <Tooltip
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            pointerEvents: "none",
            position: "fixed",
            zIndex: 1000,
            backgroundColor: "var(--tooltip-bg)",
            color: "var(--tooltip-fg)",
            border: "1px solid var(--tooltip-border)",
            borderRadius: "6px",
            padding: "6px 10px",
            boxShadow: "var(--tooltip-shadow)",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
        >
          <div className="font-semibold">{tooltipData.glassName}</div>
          <div style={{ color: "var(--tooltip-fg)", opacity: 0.6 }}>{tooltipData.catalogName}</div>
        </Tooltip>
      )}
    </div>
  );
}

export function GlassScatterPlot(props: GlassScatterPlotProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ParentSize>
        {({ width, height }) =>
          width > 0 && height > 0 ? (
            <InnerPlot {...props} width={width} height={height} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}
