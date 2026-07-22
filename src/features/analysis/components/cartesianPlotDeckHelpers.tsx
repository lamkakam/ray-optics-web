/**
 * Provides shared deck.gl cartesian plot layout and SVG overlay helpers for analysis charts that render square orthographic plots with axis chrome and optional vertical color bars.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Measures a chart parent with `ResizeObserver` and applies the shared analysis sizing policy.
 * - Computes the square plot viewport layout, preserving the PSF axis/color-bar spacing and y-axis label alignment.
 * - Computes initial orthographic zoom as `log2(plotSide / (2 * axisExtent * 1.12))`.
 * - Derives visible x/y domains from controlled orthographic view state and the square plot size.
 * - Produces five evenly spaced axis ticks for each visible domain.
 * - Converts hex palette colors to RGB tuples for deck.gl layer color ranges.
 * - Renders theme-aware SVG axes, tick labels, axis labels, and optional vertical palette color bars using `currentColor`.
 *
 * ## Consumers
 *
 * - `GeoPsfChart`
 * - `DiffractionPsfChart`
 * - `WavefrontMapChart`
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";

export interface ChartSize {
  readonly width: number;
  readonly height: number;
}

export interface OrthographicViewState {
  readonly target: [number, number, number];
  readonly zoom: number;
}

export interface ViewStateOverride {
  readonly extentKey: string;
  readonly viewState: OrthographicViewState;
}

export interface AxisDomain {
  readonly min: number;
  readonly max: number;
}

export interface CartesianPlotLayout {
  readonly plotSide: number;
  readonly plotLeft: number;
  readonly plotTop: number;
  readonly yAxisLabelX: number;
}

export const CARTESIAN_PLOT_PADDING_FACTOR = 1.12;
export const CARTESIAN_CHART_TOP = 16;
export const CARTESIAN_CHART_BOTTOM = 56;
export const CARTESIAN_CHART_LEFT = 72;
export const CARTESIAN_CHART_RIGHT = 56;
export const CARTESIAN_LEGEND_WIDTH = 80;
export const CARTESIAN_COLOR_BAR_WIDTH = 16;
export const CARTESIAN_TICK_COUNT = 5;

export function hexToRgb(hexColor: string): [number, number, number] {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return [red, green, blue];
}

export function getInitialOrthographicZoom(plotSide: number, axisExtent: number): number {
  if (plotSide <= 0 || axisExtent <= 0) {
    return 0;
  }

  return Math.log2(plotSide / (2 * axisExtent * CARTESIAN_PLOT_PADDING_FACTOR));
}

export function useMeasuredChartSize(autoHeight: boolean | undefined): [React.RefObject<HTMLDivElement | null>, ChartSize] {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const measure = () => {
      const width = Math.max(0, element.clientWidth);
      const parentHeight = Math.max(0, element.clientHeight);
      setSize({
        width,
        height: autoHeight ? width : Math.min(width, parentHeight),
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoHeight]);

  return [containerRef, size];
}

export function getCartesianPlotLayout(size: ChartSize): CartesianPlotLayout {
  const plotSide = Math.max(
    0,
    Math.min(
      size.width - CARTESIAN_CHART_LEFT - CARTESIAN_CHART_RIGHT - CARTESIAN_LEGEND_WIDTH,
      size.height - CARTESIAN_CHART_TOP - CARTESIAN_CHART_BOTTOM,
    ),
  );
  const plotLeft = CARTESIAN_CHART_LEFT
    + Math.max(0, size.width - CARTESIAN_CHART_LEFT - CARTESIAN_CHART_RIGHT - CARTESIAN_LEGEND_WIDTH - plotSide) / 2;

  return {
    plotSide,
    plotLeft,
    plotTop: CARTESIAN_CHART_TOP,
    yAxisLabelX: plotLeft - 54,
  };
}

export function getVisibleAxisDomains(plotSide: number, viewState: OrthographicViewState): {
  readonly x: AxisDomain;
  readonly y: AxisDomain;
} {
  const scale = 2 ** viewState.zoom;
  const visibleHalfRange = scale > 0 ? plotSide / (2 * scale) : 0;

  return {
    x: {
      min: viewState.target[0] - visibleHalfRange,
      max: viewState.target[0] + visibleHalfRange,
    },
    y: {
      min: viewState.target[1] - visibleHalfRange,
      max: viewState.target[1] + visibleHalfRange,
    },
  };
}

export function buildCartesianTicks(axisDomain: AxisDomain): readonly number[] {
  const ticks: number[] = [];
  for (let index = 0; index < CARTESIAN_TICK_COUNT; index += 1) {
    const ratio = index / (CARTESIAN_TICK_COUNT - 1);
    ticks.push(axisDomain.min + ((axisDomain.max - axisDomain.min) * ratio));
  }
  return ticks;
}

interface CartesianSvgOverlayProps {
  readonly height: number;
  readonly layout: CartesianPlotLayout;
  readonly xAxisTicks: readonly number[];
  readonly yAxisTicks: readonly number[];
  readonly xAxisLabel: string;
  readonly yAxisLabel: string;
  readonly colorBarId?: string;
  readonly palette?: readonly string[];
  readonly colorBarTopLabel?: string;
  readonly colorBarBottomLabel?: string;
  readonly colorBarTitle?: string;
}

export function CartesianSvgOverlay({
  height,
  layout,
  xAxisTicks,
  yAxisTicks,
  xAxisLabel,
  yAxisLabel,
  colorBarId,
  palette,
  colorBarTopLabel,
  colorBarBottomLabel,
  colorBarTitle,
}: CartesianSvgOverlayProps) {
  const hasColorBar = colorBarId !== undefined
    && palette !== undefined
    && palette.length > 1
    && colorBarTopLabel !== undefined
    && colorBarBottomLabel !== undefined
    && colorBarTitle !== undefined;
  const colorBarHeight = Math.min(152, layout.plotSide);
  const colorBarLabelX = layout.plotLeft + layout.plotSide + 46;
  const colorBarTitleX = layout.plotLeft + layout.plotSide + 66;
  const colorBarTitleY = layout.plotTop + colorBarHeight / 2;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" role="presentation">
      <line
        x1={layout.plotLeft}
        y1={layout.plotTop + layout.plotSide}
        x2={layout.plotLeft + layout.plotSide}
        y2={layout.plotTop + layout.plotSide}
        stroke="currentColor"
      />
      <line x1={layout.plotLeft} y1={layout.plotTop} x2={layout.plotLeft} y2={layout.plotTop + layout.plotSide} stroke="currentColor" />
      {xAxisTicks.map((tick, index) => {
        const offset = (index / (CARTESIAN_TICK_COUNT - 1)) * layout.plotSide;
        return (
          <g key={`x-${index}`}>
            <line
              x1={layout.plotLeft + offset}
              y1={layout.plotTop + layout.plotSide}
              x2={layout.plotLeft + offset}
              y2={layout.plotTop + layout.plotSide + 4}
              stroke="currentColor"
            />
            <text x={layout.plotLeft + offset} y={layout.plotTop + layout.plotSide + 18} textAnchor="middle" fontSize="11" fill="currentColor">
              {formatPlotValue(tick)}
            </text>
          </g>
        );
      })}
      {yAxisTicks.map((tick, index) => {
        const offset = (1 - (index / (CARTESIAN_TICK_COUNT - 1))) * layout.plotSide;
        return (
          <g key={`y-${index}`}>
            <line x1={layout.plotLeft - 4} y1={layout.plotTop + offset} x2={layout.plotLeft} y2={layout.plotTop + offset} stroke="currentColor" />
            <text x={layout.plotLeft - 10} y={layout.plotTop + offset + 4} textAnchor="end" fontSize="11" fill="currentColor">
              {formatPlotValue(tick)}
            </text>
          </g>
        );
      })}
      <text x={layout.plotLeft + layout.plotSide / 2} y={height - 12} textAnchor="middle" fontSize="12" fill="currentColor">
        {xAxisLabel}
      </text>
      <text
        x={layout.yAxisLabelX}
        y={layout.plotTop + layout.plotSide / 2}
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
        transform={`rotate(-90 ${layout.yAxisLabelX} ${layout.plotTop + layout.plotSide / 2})`}
      >
        {yAxisLabel}
      </text>
      {hasColorBar ? (
        <>
          <defs>
            <linearGradient id={colorBarId} x1="0" x2="0" y1="1" y2="0">
              {palette.map((color, index) => (
                <stop key={color} offset={`${(index / (palette.length - 1)) * 100}%`} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <rect
            x={layout.plotLeft + layout.plotSide + 24}
            y={layout.plotTop}
            width={CARTESIAN_COLOR_BAR_WIDTH}
            height={colorBarHeight}
            fill={`url(#${colorBarId})`}
          />
          <text x={colorBarLabelX} y={layout.plotTop + 10} fontSize="11" fill="currentColor">
            {colorBarTopLabel}
          </text>
          <text x={colorBarLabelX} y={layout.plotTop + colorBarHeight} fontSize="11" fill="currentColor">
            {colorBarBottomLabel}
          </text>
          <text
            x={colorBarTitleX}
            y={colorBarTitleY}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            transform={`rotate(-90 ${colorBarTitleX} ${colorBarTitleY})`}
          >
            {colorBarTitle}
          </text>
        </>
      ) : undefined}
    </svg>
  );
}
