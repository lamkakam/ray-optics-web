"use client";

import { COORDINATE_SYSTEM, DeckGL, GridLayer, OrthographicView } from "deck.gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import {
  DIFFRACTION_PSF_LOG_FLOOR,
  buildDiffractionPsfBins,
  formatDiffractionPsfFluxLabel,
  type DiffractionPsfBin,
} from "./diffractionPsfDeckData";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

interface DiffractionPsfChartProps {
  readonly diffractionPsfData: DiffractionPsfData;
  readonly autoHeight?: boolean;
}

interface ChartSize {
  readonly width: number;
  readonly height: number;
}

interface OrthographicViewState {
  readonly target: [number, number, number];
  readonly zoom: number;
}

interface ViewStateOverride {
  readonly extentKey: string;
  readonly viewState: OrthographicViewState;
}

interface AxisDomain {
  readonly min: number;
  readonly max: number;
}

const PLOT_PADDING_FACTOR = 1.12;
const CHART_TOP = 16;
const CHART_BOTTOM = 56;
const CHART_LEFT = 72;
const CHART_RIGHT = 56;
const LEGEND_WIDTH = 80;
const COLOR_BAR_WIDTH = 16;
const TICK_COUNT = 5;
const DECK_VIEW_ID = "diffraction-psf-view";

function hexToRgb(hexColor: string): [number, number, number] {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  return [red, green, blue];
}

function getInitialZoom(plotSide: number, axisExtent: number): number {
  if (plotSide <= 0 || axisExtent <= 0) {
    return 0;
  }

  return Math.log2(plotSide / (2 * axisExtent * PLOT_PADDING_FACTOR));
}

function useMeasuredSize(autoHeight: boolean | undefined): [React.RefObject<HTMLDivElement | null>, ChartSize] {
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

function getVisibleAxisDomains(plotSide: number, viewState: OrthographicViewState): {
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

function buildTicks(axisDomain: AxisDomain): readonly number[] {
  const ticks: number[] = [];
  for (let index = 0; index < TICK_COUNT; index += 1) {
    const ratio = index / (TICK_COUNT - 1);
    ticks.push(axisDomain.min + ((axisDomain.max - axisDomain.min) * ratio));
  }
  return ticks;
}

export function DiffractionPsfChart({
  diffractionPsfData,
  autoHeight,
}: DiffractionPsfChartProps) {
  const [containerRef, size] = useMeasuredSize(autoHeight);
  const preparedData = useMemo(
    () => buildDiffractionPsfBins(diffractionPsfData),
    [diffractionPsfData],
  );
  const plotSide = Math.max(
    0,
    Math.min(size.width - CHART_LEFT - CHART_RIGHT - LEGEND_WIDTH, size.height - CHART_TOP - CHART_BOTTOM),
  );
  const plotLeft = CHART_LEFT + Math.max(0, size.width - CHART_LEFT - CHART_RIGHT - LEGEND_WIDTH - plotSide) / 2;
  const yAxisLabelX = plotLeft - 54;
  const plotTop = CHART_TOP;
  const colorRange = useMemo(
    () => ANALYSIS_HEATMAP_COLOR_PALETTE.map((color) => hexToRgb(color)),
    [],
  );
  const extentKey = `${preparedData.axisExtent}:${plotSide}`;
  const initialViewState = useMemo<OrthographicViewState>(() => ({
    target: [0, 0, 0],
    zoom: getInitialZoom(plotSide, preparedData.axisExtent),
  }), [plotSide, preparedData.axisExtent]);
  const [viewStateOverride, setViewStateOverride] = useState<ViewStateOverride | undefined>(undefined);
  const viewState = viewStateOverride?.extentKey === extentKey
    ? viewStateOverride.viewState
    : initialViewState;
  const axisDomains = useMemo(() => getVisibleAxisDomains(plotSide, viewState), [plotSide, viewState]);
  const xAxisTicks = useMemo(() => buildTicks(axisDomains.x), [axisDomains.x]);
  const yAxisTicks = useMemo(() => buildTicks(axisDomains.y), [axisDomains.y]);

  const layers = useMemo(() => [
    new GridLayer<DiffractionPsfBin>({
      id: "diffraction-psf-grid",
      data: preparedData.bins,
      gpuAggregation: true,
      colorAggregation: "SUM",
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      cellSize: preparedData.cellSize,
      getPosition: (bin) => [bin.x, bin.y],
      getColorWeight: (bin) => bin.logScaledFlux,
      colorDomain: [Math.min(DIFFRACTION_PSF_LOG_FLOOR, preparedData.minLogFlux), preparedData.maxLogFlux],
      colorRange,
      extruded: false,
      pickable: false,
    }),
  ], [colorRange, preparedData]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <div
        data-testid="diffraction-psf-chart"
        aria-label="Diffraction PSF plot"
        className="relative overflow-hidden text-zinc-700 dark:text-zinc-200"
        style={{ width: `${size.width}px`, height: `${size.height}px` }}
      >
        {plotSide > 0 ? (
          <div
            className="absolute"
            style={{
              left: `${plotLeft}px`,
              top: `${plotTop}px`,
              width: `${plotSide}px`,
              height: `${plotSide}px`,
            }}
          >
            <DeckGL
              views={[new OrthographicView({ id: DECK_VIEW_ID, flipY: false, controller: true })]}
              viewState={{ [DECK_VIEW_ID]: viewState }}
              onViewStateChange={({ viewState: nextViewState }) => {
                const nextZoom = typeof nextViewState.zoom === "number" ? nextViewState.zoom : viewState.zoom;
                setViewStateOverride({
                  extentKey,
                  viewState: {
                    target: nextViewState.target as [number, number, number],
                    zoom: nextZoom,
                  },
                });
              }}
              layers={layers}
              width={plotSide}
              height={plotSide}
              controller
            />
          </div>
        ) : undefined}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" role="presentation">
          <line
            x1={plotLeft}
            y1={plotTop + plotSide}
            x2={plotLeft + plotSide}
            y2={plotTop + plotSide}
            stroke="currentColor"
          />
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotTop + plotSide} stroke="currentColor" />
          {xAxisTicks.map((tick, index) => {
            const offset = (index / (TICK_COUNT - 1)) * plotSide;
            return (
              <g key={`x-${index}`}>
                <line
                  x1={plotLeft + offset}
                  y1={plotTop + plotSide}
                  x2={plotLeft + offset}
                  y2={plotTop + plotSide + 4}
                  stroke="currentColor"
                />
                <text
                  x={plotLeft + offset}
                  y={plotTop + plotSide + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                >
                  {formatPlotValue(tick)}
                </text>
              </g>
            );
          })}
          {yAxisTicks.map((tick, index) => {
            const offset = (1 - (index / (TICK_COUNT - 1))) * plotSide;
            return (
              <g key={`y-${index}`}>
                <line x1={plotLeft - 4} y1={plotTop + offset} x2={plotLeft} y2={plotTop + offset} stroke="currentColor" />
                <text
                  x={plotLeft - 10}
                  y={plotTop + offset + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="currentColor"
                >
                  {formatPlotValue(tick)}
                </text>
              </g>
            );
          })}
          <text
            x={plotLeft + plotSide / 2}
            y={size.height - 12}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            {diffractionPsfData.unitX ? `x (${diffractionPsfData.unitX})` : "x"}
          </text>
          <text
            x={yAxisLabelX}
            y={plotTop + plotSide / 2}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            transform={`rotate(-90 ${yAxisLabelX} ${plotTop + plotSide / 2})`}
          >
            {diffractionPsfData.unitY ? `y (${diffractionPsfData.unitY})` : "y"}
          </text>
          <defs>
            <linearGradient id="diffraction-psf-color-bar" x1="0" x2="0" y1="1" y2="0">
              {ANALYSIS_HEATMAP_COLOR_PALETTE.map((color, index) => (
                <stop
                  key={color}
                  offset={`${(index / (ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
          <rect
            x={plotLeft + plotSide + 24}
            y={plotTop}
            width={COLOR_BAR_WIDTH}
            height={Math.min(152, plotSide)}
            fill="url(#diffraction-psf-color-bar)"
          />
          <text x={plotLeft + plotSide + 46} y={plotTop + 10} fontSize="11" fill="currentColor">
            {formatDiffractionPsfFluxLabel(preparedData.maxLogFlux)}
          </text>
          <text
            x={plotLeft + plotSide + 46}
            y={plotTop + Math.min(152, plotSide)}
            fontSize="11"
            fill="currentColor"
          >
            {formatDiffractionPsfFluxLabel(Math.min(DIFFRACTION_PSF_LOG_FLOOR, preparedData.minLogFlux))}
          </text>
          <text
            x={plotLeft + plotSide + 66}
            y={plotTop + Math.min(152, plotSide) / 2}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            transform={`rotate(-90 ${plotLeft + plotSide + 66} ${plotTop + Math.min(152, plotSide) / 2})`}
          >
            Normalized flux/bin
          </text>
        </svg>
      </div>
    </div>
  );
}
