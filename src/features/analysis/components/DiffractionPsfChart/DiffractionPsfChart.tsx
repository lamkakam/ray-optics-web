/**
 * Describes the Diffraction Psf Chart module.
 *
 * @remarks
 * ## Axis Tick Calculation Flow
 *
 * - `buildDiffractionPsfBitmap(...)` derives `axisExtent` from the maximum absolute physical coordinate across `diffractionPsfData.x` and `diffractionPsfData.y`, falling back to `1` when no positive extent is available.
 * - The initial controlled orthographic view state uses `target: [0, 0, 0]` and `zoom = log2(plotSide / (2 * axisExtent * 1.12))`, so the full symmetric prepared extent fits inside the square plot with padding.
 * - The visible physical domains are derived from the controlled view state: `scale = 2 ** zoom`, `visibleHalfRange = plotSide / (2 * scale)`, x uses `target[0] +/- visibleHalfRange`, and y uses `target[1] +/- visibleHalfRange`.
 * - `TICK_COUNT = 5`; each tick value is linearly interpolated from the visible domain minimum to maximum.
 * - X ticks render left-to-right in domain order.
 * - Y ticks render bottom-to-top in value order. The SVG offset is inverted from the interpolation index so larger y values appear higher on screen.
 * - Tick labels are formatted with `formatPlotValue(...)`.
 * - Pan and zoom updates replace the controlled view state, so tick labels follow the currently visible physical coordinate range rather than fixed raw PSF array indices.
 *
 * ## Dependencies
 *
 * - `DiffractionPsfData` from `features/analysis/types/plotData`
 * - `DeckGL`, `BitmapLayer`, and `OrthographicView` from `deck.gl`
 * - Shared layout, view-state, tick, palette, and SVG overlay helpers from `cartesianPlotDeckHelpers.tsx`
 * - `buildDiffractionPsfBitmap(...)` and `formatDiffractionPsfFluxLabel(...)` from `diffractionPsfDeckData.ts`
 * - `ANALYSIS_HEATMAP_COLOR_PALETTE` from `features/analysis/lib/analysisChartPalette`
 */
"use client";

import { BitmapLayer, COORDINATE_SYSTEM, DeckGL, OrthographicView } from "deck.gl";
import { useMemo, useState } from "react";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
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
import {
  DIFFRACTION_PSF_LOG_FLOOR,
  buildDiffractionPsfBitmap,
  formatDiffractionPsfFluxLabel,
} from "./diffractionPsfDeckData";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

interface DiffractionPsfChartProps {
  readonly diffractionPsfData: DiffractionPsfData;
  readonly autoHeight?: boolean;
}

const DECK_VIEW_ID = "diffraction-psf-view";

/**
 * Renders the Diffraction PSF analysis view as a deck.gl `BitmapLayer` inside an `OrthographicView`, with SVG chart chrome for axes, ticks, labels, and the normalized-flux color bar.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Measures its parent with the shared cartesian deck plot helper.
 * - Uses the parent width as the chart width.
 * - Applies a sizing policy where `autoHeight` uses a square chart and fixed-height mode clamps to `min(parentWidth, parentHeight)` while allowing collapse to `0px`.
 * - Converts `DiffractionPsfData` to raw RGBA bitmap bytes through `buildDiffractionPsfBitmap(...)`, then wraps them in browser `ImageData`.
 * - Uses `BitmapLayer` with Cartesian coordinates, physical rectangular bounds, nearest texture sampling, and `pickable: false`.
 * - Uses `OrthographicView({ id: "diffraction-psf-view", flipY: false, controller: true })`.
 * - Stores controlled deck.gl view state keyed by the orthographic view id.
 * - Resets the controlled view state to `target: [0, 0, 0]` when the PSF extent or plot side changes.
 * - Computes initial zoom as `log2(plotSide / (2 * axisExtent * 1.12))` so the full symmetric PSF extent fits in the square viewport.
 * - Draws x-axis, y-axis, tick labels, axis labels, and a vertical color bar through the shared SVG overlay aligned to the deck.gl viewport.
 * - Computes SVG x/y tick labels from the currently controlled orthographic viewport, so pan and zoom keep the axes on the plot frame while labels reflect the visible physical coordinate range.
 * - Positions the y-axis label relative to the centered plot viewport (`plotLeft - 54`) so it stays adjacent to the plotted y-axis when the chart container is wider than the square plot.
 * - Uses `currentColor` for SVG strokes and text fills so axis chrome, tick labels, axis labels, and color-bar labels inherit the chart container's theme-aware text color.
 * - Labels the color bar in normalized flux per physical bin, with the lower label coming from the shared `DIFFRACTION_PSF_LOG_FLOOR` (`5e-4`).
 * - Keeps `data-testid="diffraction-psf-chart"` and `aria-label="Diffraction PSF plot"`.
 */
export function DiffractionPsfChart({
  diffractionPsfData,
  autoHeight,
}: DiffractionPsfChartProps) {
  const [containerRef, size] = useMeasuredChartSize(autoHeight);
  const preparedData = useMemo(
    () => buildDiffractionPsfBitmap(diffractionPsfData),
    [diffractionPsfData],
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
      id: "diffraction-psf-bitmap",
      image: bitmapImage,
      bounds: preparedData.bounds,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      pickable: false,
      textureParameters: {
        minFilter: "nearest",
        magFilter: "nearest",
      },
    }),
  ], [bitmapImage, preparedData.bounds]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <div
        data-testid="diffraction-psf-chart"
        aria-label="Diffraction PSF plot"
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
          xAxisLabel={diffractionPsfData.unitX ? `x (${diffractionPsfData.unitX})` : "x"}
          yAxisLabel={diffractionPsfData.unitY ? `y (${diffractionPsfData.unitY})` : "y"}
          colorBarId="diffraction-psf-color-bar"
          palette={ANALYSIS_HEATMAP_COLOR_PALETTE}
          colorBarTopLabel={formatDiffractionPsfFluxLabel(preparedData.maxLogFlux)}
          colorBarBottomLabel={formatDiffractionPsfFluxLabel(Math.min(DIFFRACTION_PSF_LOG_FLOOR, preparedData.minLogFlux))}
          colorBarTitle="Normalized flux/bin"
        />
      </div>
    </div>
  );
}
