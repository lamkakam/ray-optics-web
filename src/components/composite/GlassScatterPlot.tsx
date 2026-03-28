"use client";

import React, { useCallback } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows, GridColumns } from "@visx/grid";
import { Zoom } from "@visx/zoom";
import { Group } from "@visx/group";
import { useTooltip, Tooltip } from "@visx/tooltip";
import { CATALOG_COLOR_MAP } from "@/lib/glassMap";
import type { PlotPoint, SelectedGlass } from "@/lib/glassMap";

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
    <div style={{ position: "relative" }}>
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
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  onWheel={zoom.handleWheel}
                  onMouseDown={zoom.dragStart}
                  onMouseMove={zoom.dragMove}
                  onMouseUp={zoom.dragEnd}
                  onMouseLeave={zoom.dragEnd}
                  style={{ cursor: zoom.isDragging ? "grabbing" : "grab" }}
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
                  <g transform={zoom.toString()}>
                    {points.map((point) => {
                      const cx = xScale(point.x);
                      const cy = yScale(point.y);
                      const isSelected =
                        selectedGlass?.glassName === point.glassName &&
                        selectedGlass?.catalogName === point.catalogName;
                      return (
                        <circle
                          key={`${point.catalogName}-${point.glassName}`}
                          data-testid="glass-point"
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 6 : 4}
                          fill={CATALOG_COLOR_MAP[point.catalogName]}
                          stroke={isSelected ? "#000" : "none"}
                          strokeWidth={isSelected ? 1.5 : 0}
                          opacity={0.8}
                          style={{ cursor: "pointer" }}
                          onClick={() => handlePointClick(point)}
                          onMouseEnter={(e) => {
                            showTooltip({
                              tooltipData: point,
                              tooltipLeft: e.clientX,
                              tooltipTop: e.clientY,
                            });
                          }}
                          onMouseLeave={hideTooltip}
                          onTouchStart={(e) => {
                            const touch = e.touches[0];
                            if (touch) {
                              showTooltip({
                                tooltipData: point,
                                tooltipLeft: touch.clientX,
                                tooltipTop: touch.clientY,
                              });
                            }
                            handlePointClick(point);
                          }}
                        />
                      );
                    })}
                  </g>

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
        <Tooltip left={tooltipLeft} top={tooltipTop} style={{ pointerEvents: "none" }}>
          <div className="text-xs">
            <div className="font-bold">{tooltipData.glassName}</div>
            <div className="text-gray-500">{tooltipData.catalogName}</div>
          </div>
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
