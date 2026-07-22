"use client";

import { BitmapLayer, COORDINATE_SYSTEM, DeckGL, OrthographicView } from "deck.gl";
import { useMemo, useState } from "react";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import {
  CartesianSvgOverlay,
  buildCartesianTicks,
  getCartesianPlotLayout,
  getInitialOrthographicZoom,
  getVisibleAxisDomains,
  useMeasuredChartSize,
  type OrthographicViewState,
  type ViewStateOverride,
} from "@/features/analysis/components/cartesianPlotDeckHelpers";
import { buildWavefrontMapBitmap } from "./wavefrontMapDeckData";
import type { WavefrontMapData } from "@/features/analysis/types/plotData";

interface WavefrontMapChartProps {
  readonly wavefrontMapData: WavefrontMapData;
  readonly autoHeight?: boolean;
}

const DECK_VIEW_ID = "wavefront-map-view";

/**
 * Renders the Wavefront Map analysis view as a deck.gl `BitmapLayer` inside an `OrthographicView`, with SVG chart chrome for axes, ticks, labels, and the wavefront color bar.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Measures its parent with `ResizeObserver`.
 * - Uses the parent width as the chart width.
 * - Applies a sizing policy where `autoHeight` uses a square chart and fixed-height mode clamps to `min(parentWidth, parentHeight)` while allowing collapse to `0px`.
 * - Converts `WavefrontMapData` to raw RGBA bytes through `buildWavefrontMapBitmap(...)`, then wraps those bytes in browser `ImageData` for deck.gl texture upload.
 * - Uses `BitmapLayer` with Cartesian coordinates and bounds from the physical x/y coordinate extents.
 * - Uses `OrthographicView({ id: "wavefront-map-view", flipY: false, controller: true })`.
 * - Stores controlled deck.gl view state keyed by the stable wavefront map view id.
 * - Resets the controlled view state when the prepared extent or plot side changes.
 * - Computes initial zoom as `log2(plotSide / (2 * axisExtent * 1.12))` so the full wavefront extent fits in the square viewport.
 * - Draws x-axis, y-axis, tick labels, axis labels, and a vertical color bar as an SVG overlay aligned to the deck.gl viewport.
 * - Computes SVG x/y tick labels from the currently controlled orthographic viewport, so pan and zoom keep axes on the frame while labels reflect the visible physical coordinate range.
 * - Uses `currentColor` for SVG strokes and text fills so chart chrome inherits the chart container's theme-aware text color.
 * - Labels the color bar with `unitZ` when provided, falling back to `waves`, with endpoint labels from finite min/max wavefront samples.
 * - Keeps `data-testid="wavefront-map-chart"` and `aria-label="Wavefront Map plot"`.
 */
export function WavefrontMapChart({
  wavefrontMapData,
  autoHeight,
}: WavefrontMapChartProps) {
  const [containerRef, size] = useMeasuredChartSize(autoHeight);
  const preparedData = useMemo(
    () => buildWavefrontMapBitmap(wavefrontMapData),
    [wavefrontMapData],
  );
  const layout = getCartesianPlotLayout(size);
  const extentKey = `${preparedData.axisExtent}:${layout.plotSide}`;
  const initialViewState = useMemo<OrthographicViewState>(() => ({
    target: [0, 0, 0],
    zoom: getInitialOrthographicZoom(layout.plotSide, preparedData.axisExtent),
  }), [layout.plotSide, preparedData.axisExtent]);
  const [viewStateOverride, setViewStateOverride] = useState<ViewStateOverride | undefined>(undefined);
  const viewState = viewStateOverride?.extentKey === extentKey
    ? viewStateOverride.viewState
    : initialViewState;
  const axisDomains = useMemo(() => getVisibleAxisDomains(layout.plotSide, viewState), [layout.plotSide, viewState]);
  const xAxisTicks = useMemo(() => buildCartesianTicks(axisDomains.x), [axisDomains.x]);
  const yAxisTicks = useMemo(() => buildCartesianTicks(axisDomains.y), [axisDomains.y]);
  const bitmapImage = useMemo(
    () => new ImageData(
      preparedData.image.data,
      preparedData.image.width,
      preparedData.image.height,
    ),
    [preparedData.image],
  );
  const layers = useMemo(() => [
    new BitmapLayer({
      id: "wavefront-map-bitmap",
      image: bitmapImage,
      bounds: preparedData.bounds,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      pickable: false,
    }),
  ], [bitmapImage, preparedData.bounds]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <div
        data-testid="wavefront-map-chart"
        aria-label="Wavefront Map plot"
        className="relative overflow-hidden text-zinc-700 dark:text-zinc-200"
        style={{ width: `${size.width}px`, height: `${size.height}px` }}
      >
        {layout.plotSide > 0 ? (
          <div
            className="absolute"
            style={{
              left: `${layout.plotLeft}px`,
              top: `${layout.plotTop}px`,
              width: `${layout.plotSide}px`,
              height: `${layout.plotSide}px`,
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
              width={layout.plotSide}
              height={layout.plotSide}
              controller
            />
          </div>
        ) : undefined}
        <CartesianSvgOverlay
          height={size.height}
          layout={layout}
          xAxisTicks={xAxisTicks}
          yAxisTicks={yAxisTicks}
          xAxisLabel={wavefrontMapData.unitX ? `x (${wavefrontMapData.unitX})` : "x"}
          yAxisLabel={wavefrontMapData.unitY ? `y (${wavefrontMapData.unitY})` : "y"}
          colorBarId="wavefront-map-color-bar"
          palette={ANALYSIS_HEATMAP_COLOR_PALETTE}
          colorBarTopLabel={formatPlotValue(preparedData.maxValue)}
          colorBarBottomLabel={formatPlotValue(preparedData.minValue)}
          colorBarTitle={wavefrontMapData.unitZ || "waves"}
        />
      </div>
    </div>
  );
}
