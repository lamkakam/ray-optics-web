"use client";

import { COORDINATE_SYSTEM, DeckGL, OrthographicView, ScatterplotLayer } from "deck.gl";
import { useMemo, useState } from "react";
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
import { buildGeoPsfPoints, type GeoPsfPoint } from "./geoPsfDeckData";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

interface GeoPsfChartProps {
  readonly geoPsfData: GeoPsfData;
  readonly autoHeight?: boolean;
}

const DECK_VIEW_ID = "geo-psf-view";

/**
 * Renders the Geometric PSF analysis view as a deck.gl `ScatterplotLayer` inside an `OrthographicView` using Cartesian coordinates.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Measures the parent with `useMeasuredChartSize(...)` and preserves the square `autoHeight` sizing policy.
 * - Reuses the shared cartesian deck.gl layout, initial zoom, visible-domain, and tick helpers used by Diffraction PSF and Wavefront Map.
 * - Uses the stable deck.gl view id `geo-psf-view`.
 * - Keeps deck.gl view state controlled so pan and zoom updates drive live SVG tick labels.
 * - Renders PSF samples through `ScatterplotLayer` with `COORDINATE_SYSTEM.CARTESIAN`.
 * - Renders theme-aware SVG x/y axes, ticks, and axis labels without a color bar.
 * - Keeps `data-testid="geo-psf-chart"` and `aria-label="Geometric PSF plot"`.
 */
export function GeoPsfChart({
  geoPsfData,
  autoHeight,
}: GeoPsfChartProps) {
  const [containerRef, size] = useMeasuredChartSize(autoHeight);
  const preparedData = useMemo(
    () => buildGeoPsfPoints(geoPsfData),
    [geoPsfData],
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
  const layers = useMemo(() => [
    new ScatterplotLayer<GeoPsfPoint>({
      id: "geo-psf-points",
      data: preparedData.points,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: (point) => [point.x, point.y],
      getFillColor: [84, 112, 198, 166],
      getRadius: 1,
      radiusUnits: "pixels",
      pickable: false,
    }),
  ], [preparedData.points]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <div
        data-testid="geo-psf-chart"
        aria-label="Geometric PSF plot"
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
          xAxisLabel={geoPsfData.unitX ? `x (${geoPsfData.unitX})` : "x"}
          yAxisLabel={geoPsfData.unitY ? `y (${geoPsfData.unitY})` : "y"}
        />
      </div>
    </div>
  );
}
