"use client";
/**
 * Describes the Glass Scatter Plot module.
 *
 * @remarks
 * ## Implementation
 * - `@visx/responsive` `<ParentSize>` fills container; renders `InnerPlot` when width/height > 0
 * - `@visx/zoom` `<Zoom>` wraps SVG; `zoom.transformMatrix` drives zoom/pan
 * - `<Zoom>` uses a custom `pinchDelta` override so touch pinch updates apply damped `1.03` / `0.97` scale steps instead of the package default `1.1` / `0.9`, reducing pinch sensitivity on iPhone/mobile Safari
 * - The main `<svg>` is the gesture owner via `zoom.containerRef` and `touchAction="none"`, matching the official VisX pattern more closely and preventing mobile Safari from falling back to page pinch-zoom
 * - The plot-area interaction rect (`data-testid="glass-scatter-interaction-surface"`) is the single interaction target
 * - `@visx/zoom` / `@use-gesture` own wheel and pinch handling through the SVG container, while the inner rect still handles direct drag start/move/end events for panning
 * - Pan uses direct handlers on the interaction rect: mouse events always call `zoom.dragStart`, `zoom.dragMove`, and `zoom.dragEnd`, while touch events only forward single-touch gestures to drag handling
 * - When a second touch is added, the interaction rect ends any active drag immediately so pinch-zoom can start without the plot jumping from a stale pan translation
 * - `onMouseLeave` ends an active drag to avoid leaving the component stuck in a dragging state
 * - Circles are rendered at zoom-adjusted screen coordinates under the clip path, rather than inside a scaled parent `<g>`, so point positions follow zoom/pan while dot size stays constant on screen
 * - Axes (`@visx/axis` `<AxisBottom>` + `<AxisLeft>`) outside zoom group with derived visible domain from transform matrix; use `stroke="currentColor"`, `tickStroke="currentColor"`, and `tickLabelProps={{ fill: "currentColor" }}` for dark mode support
 * - Grid lines (`@visx/grid` `<GridRows>` + `<GridColumns>`) use `axisYScale`/`axisXScale` (zoom-aware), clipped to inner area, `stroke="currentColor"` with `strokeOpacity={0.12}`
 * - Hover tooltip via `@visx/tooltip` `useTooltip<PlotPoint>()`; shows glass name and catalog name with solid background card (CSS variables `--tooltip-bg`, `--tooltip-fg`, `--tooltip-border`, `--tooltip-shadow` defined in `globals.css` for light/dark mode)
 * - Touch tooltip via `onTouchStart` on circles; single-touch only, calls `showTooltip` and also fires `handlePointClick`
 * - Multi-touch `onTouchStart` on a point is ignored so pinch-zoom does not accidentally select a glass or show a tooltip
 * - Tooltip uses `position: fixed` (viewport-relative) to avoid container-offset issues from `<Zoom>`'s internal `<div class="visx-zoom-g">` wrapper
 * - Tooltip coordinates come from `e.currentTarget.getBoundingClientRect()` on the circle element: `left = rect.right + 8`, `top = rect.top`; this correctly accounts for SVG zoom transforms
 * - Touch interactions:
 * - single-finger drag pans the plot
 * - two-finger pinch zooms the plot
 * - transitioning from one finger to two fingers cancels the pan drag before pinch scaling begins
 * - single-touch tap on a point selects it and shows the tooltip
 * - Desktop interactions:
 * - mouse drag pans via `zoom.dragStart` / `zoom.dragMove` / `zoom.dragEnd`
 * - leaving the plot ends an active drag
 * - Crosshair lines: when `selectedGlass` is set and its matching `PlotPoint` is found in `points`, two dashed `<line>` elements are rendered inside the clip group at `axisXScale(point.x)` (vertical) and `axisYScale(point.y)` (horizontal); stroke uses CSS variable `--crosshair-stroke` (defined in `globals.css`)
 * - `data-testid="glass-point"` on each circle for test selection
 * - `data-testid="crosshair-h"` / `data-testid="crosshair-v"` on crosshair lines for test selection
 * - Circle radius: 4 (default), 6 + stroke (selected); during zoom, points are re-positioned in screen coordinates while radius and stroke width remain fixed so the apparent size stays constant
 * - x-axis domain reversed (high Abbe number on left, low on right — standard glass map convention)
 * - y-axis: lower position = lower value (standard orientation). `visYMin`/`visYMax` derived from zoom transform so that the axis labels track the zoom-transformed data range correctly.
 * - y-axis domain: data-driven by default; `yDomainMin`/`yDomainMax` props optionally enforce bounds (e.g. 1.4–2.0 for refractive index, omitted for partial dispersion where the tight data range should govern the axis)
 * - Margins: `{ top: 20, right: 20, bottom: 50, left: 60 }`
 *
 * ## Internal Helpers
 * - `computeRenderedCircleStyle()` converts base plot coordinates into zoomed screen coordinates while keeping the circle radius and selected stroke width fixed in screen space
 * - `computePinchDelta()` translates VisX pinch state into damped zoom scale factors for touch pinch gestures
 * - `isSingleTouchGesture()` centralizes the one-finger guard shared by point taps and plot pan touch handling
 *
 * ## Tooltip Theming
 * CSS variables in `globals.css`:
 * - `:root` → `--tooltip-bg: #ffffff`, `--tooltip-fg: #111827`, `--tooltip-border: #e5e7eb`, `--tooltip-shadow` (light drop shadow)
 * - `.dark` → `--tooltip-bg: #1f2937`, `--tooltip-fg: #f9fafb`, `--tooltip-border: #374151`, `--tooltip-shadow` (heavier dark drop shadow)
 *
 * ## Crosshair Theming
 * CSS variables in `globals.css`:
 * - `:root` → `--crosshair-stroke: #4b5563` (gray-600, visible on light backgrounds)
 * - `.dark` → `--crosshair-stroke: #9ca3af` (gray-400, visible on dark backgrounds)
 *
 * ## Key Notes
 * - `@visx/responsive` requires `ResizeObserver` — mocked in test environment via `jest.setup.ts`
 * - Module-level mock `src/__mocks__/@visx/responsive.tsx` provides fixed 800×600 size in tests
 * - `@visx/axis` uses `@visx/text`, which relies on SVG text measurement APIs such as `getComputedTextLength()` in tests
 * - Touch gesture behavior from `@use-gesture` is not modeled reliably in jsdom for SVG bubbling paths, so tests focus on the SVG gesture container contract rather than synthetic pinch execution
 * - Crosshair lines are not rendered when the selected glass is not found in the current `points` array (e.g. its catalog is disabled)
 */

import React, { useCallback } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows, GridColumns } from "@visx/grid";
import { Zoom } from "@visx/zoom";
import { Group } from "@visx/group";
import { useTooltip, Tooltip } from "@visx/tooltip";
import { CATALOG_COLOR_MAP } from "@/features/glass-map/lib/glassMap";
import type { PlotPoint, SelectedGlass } from "@/features/glass-map/types/glassMap";

interface GlassScatterPlotProps {
  /** Data points to render */
  readonly points: readonly PlotPoint[];
  /** Currently selected glass; rendered with larger radius, stroke, and crosshair lines */
  readonly selectedGlass: SelectedGlass | undefined;
  /** Label for x-axis (e.g. "Vd") */
  readonly xAxisLabel: string;
  /** Label for y-axis (e.g. "Nd") */
  readonly yAxisLabel: string;
  /** Called when a circle is clicked or touched */
  readonly onPointClick: (glass: SelectedGlass) => void;
  /** Optional forced minimum for y-axis domain (e.g. `1.4` for refractive index plots) */
  readonly yDomainMin?: number;
  /** Optional forced maximum for y-axis domain (e.g. `2.0` for refractive index plots) */
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

interface PinchDeltaState {
  readonly offset: readonly [number, number];
  readonly lastOffset: readonly [number, number];
}

const PINCH_ZOOM_IN_SCALE = 1.03;
const PINCH_ZOOM_OUT_SCALE = 0.97;

export function isSingleTouchGesture(touchCount: number): boolean {
  return touchCount === 1;
}

export function computePinchDelta({ offset, lastOffset }: PinchDeltaState) {
  const [currentScaleOffset] = offset;
  const [previousScaleOffset] = lastOffset;
  const pinchDirection = currentScaleOffset - previousScaleOffset;
  const scale = pinchDirection < 0 ? PINCH_ZOOM_OUT_SCALE : PINCH_ZOOM_IN_SCALE;

  return {
    scaleX: scale,
    scaleY: scale,
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Zoom<SVGSVGElement>
        // Use the plot-area rect as the gesture target so wheel/pinch coordinates are plot-local.
        // This keeps the existing zoom math aligned with the inner chart, not the outer SVG margin box.
        width={innerWidth}
        height={innerHeight}
        scaleXMin={0.2}
        scaleXMax={40}
        scaleYMin={0.2}
        scaleYMax={40}
        pinchDelta={computePinchDelta}
        initialTransformMatrix={initialTransform}
      >
        {(zoom) => {
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

          const handlePlotTouchStart = (event: React.TouchEvent<SVGRectElement>) => {
            if (isSingleTouchGesture(event.touches.length)) {
              zoom.dragStart(event);
              return;
            }

            if (zoom.isDragging) {
              zoom.dragEnd();
            }
          };

          const handlePlotTouchMove = (event: React.TouchEvent<SVGRectElement>) => {
            if (isSingleTouchGesture(event.touches.length)) {
              zoom.dragMove(event);
              return;
            }

            if (zoom.isDragging) {
              zoom.dragEnd();
            }
          };

          return (
            <svg
              width={width}
              height={height}
              ref={zoom.containerRef}
              style={{ touchAction: "none" }}
            >
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

                <rect
                  data-testid="glass-scatter-interaction-surface"
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  onTouchStart={handlePlotTouchStart}
                  onTouchMove={handlePlotTouchMove}
                  onTouchEnd={zoom.dragEnd}
                  onTouchCancel={zoom.dragEnd}
                  onMouseDown={zoom.dragStart}
                  onMouseMove={zoom.dragMove}
                  onMouseUp={zoom.dragEnd}
                  onMouseLeave={() => {
                    if (zoom.isDragging) {
                      zoom.dragEnd();
                    }
                  }}
                  style={{
                    cursor: zoom.isDragging ? "grabbing" : "grab",
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
                          if (!isSingleTouchGesture(e.touches.length)) {
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

/** Interactive zoomable scatter plot of glass data using `@visx` libraries. Renders all `PlotPoint` entries as colored circles, supports zoom/pan via mouse wheel, drag, and touch pinch, shows grid lines on both axes, shows a tooltip on hover (mouse) or single-touch tap, and draws crosshair lines for the selected glass. */
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
