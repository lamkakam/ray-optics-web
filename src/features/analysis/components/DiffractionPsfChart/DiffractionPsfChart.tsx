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
