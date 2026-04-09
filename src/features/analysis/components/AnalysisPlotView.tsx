import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Label } from "@/shared/components/primitives/Label";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select, type SelectOption } from "@/shared/components/primitives/Select";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import type { DiffractionPsfData } from "@/shared/lib/types/opticalModel";

echarts.use([ScatterChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const DIFFRACTION_PSF_COLOR_PALETTE = [
  "#313695",
  "#4575b4",
  "#74add1",
  "#abd9e9",
  "#e0f3f8",
  "#ffffbf",
  "#fee090",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026",
] as const;

const DIFFRACTION_PSF_MIN_INTENSITY = 5e-4;
const DIFFRACTION_PSF_DEBOUNCE_MS = 500;
const DIFFRACTION_GRID_TOP = 16;
const DIFFRACTION_GRID_BOTTOM = 56;
const DIFFRACTION_GRID_LEFT = 72;
const DIFFRACTION_GRID_RIGHT = 160;
const DIFFRACTION_VISUAL_MAP_WIDTH = 20;
const DIFFRACTION_RIGHT_PADDING = 16;
const PRECISION = 2;

function formatDiffractionPsfIntensity(log10Intensity: number): string {
  return Number(10 ** log10Intensity).toPrecision(PRECISION);
}

export type PlotType = "rayFan"
  | "opdFan"
  | "spotDiagram"
  | "surfaceBySurface3rdOrder"
  | "wavefrontMap"
  | "geoPSF"
  | "diffractionPSF";

type FieldOption = SelectOption & { readonly value: number };
type WavelengthOption = FieldOption;

interface AnalysisPlotViewProps {
  readonly fieldOptions: readonly FieldOption[];
  readonly wavelengthOptions: readonly WavelengthOption[];
  readonly selectedFieldIndex: number;
  readonly selectedWavelengthIndex: number;
  readonly selectedPlotType: PlotType;
  readonly plotImageBase64?: string;
  readonly diffractionPsfData?: DiffractionPsfData;
  readonly loading?: boolean;
  readonly onFieldChange: (fieldIndex: number) => void;
  readonly onWavelengthChange: (wavelengthIndex: number) => void;
  readonly onPlotTypeChange: (plotType: PlotType) => void;
  readonly autoHeight?: boolean;
}

export interface PlotTypeConfig {
  readonly label: string;
  readonly fieldDependent: boolean;
  readonly wavelengthDependent?: boolean;
}

export const PLOT_TYPE_CONFIG: Record<PlotType, PlotTypeConfig> = {
  rayFan: {
    label: "Ray Fan",
    fieldDependent: true,
    wavelengthDependent: false,
  },
  opdFan: {
    label: "OPD Fan",
    fieldDependent: true,
    wavelengthDependent: false,
  },
  spotDiagram: {
    label: "Spot Diagram",
    fieldDependent: true,
    wavelengthDependent: false,
  },
  surfaceBySurface3rdOrder: {
    label: "Surface by Surface 3rd Order Aberr.",
    fieldDependent: false,
    wavelengthDependent: false,
  },
  wavefrontMap: {
    label: "Wavefront Map",
    fieldDependent: true,
    wavelengthDependent: true,
  },
  geoPSF: {
    label: "Geometric PSF",
    fieldDependent: true,
    wavelengthDependent: true,
  },
  diffractionPSF: {
    label: "Diffraction PSF",
    fieldDependent: true,
    wavelengthDependent: true,
  },
};

const PLOT_TYPE_OPTIONS: SelectOption[] = (Object.keys(PLOT_TYPE_CONFIG) as PlotType[]).map(
  (key) => ({ value: key, label: PLOT_TYPE_CONFIG[key].label }),
);

function buildDiffractionPsfOption(
  diffractionPsfData: DiffractionPsfData,
  chartWidth: number,
  chartHeight: number,
) {
  let axisExtent = 0;
  let maxClippedIntensity = DIFFRACTION_PSF_MIN_INTENSITY;
  const scatterData: number[][] = [];

  for (let xIndex = 0; xIndex < diffractionPsfData.x.length; xIndex += 1) {
    const x = diffractionPsfData.x[xIndex];
    axisExtent = Math.max(axisExtent, Math.abs(x));
    for (let yIndex = 0; yIndex < diffractionPsfData.y.length; yIndex += 1) {
      const y = diffractionPsfData.y[yIndex];
      const clippedIntensity = Math.max(
        diffractionPsfData.z[xIndex]?.[yIndex] ?? 0,
        DIFFRACTION_PSF_MIN_INTENSITY,
      );
      axisExtent = Math.max(axisExtent, Math.abs(y));
      maxClippedIntensity = Math.max(maxClippedIntensity, clippedIntensity);
      scatterData.push([x, y, Math.log10(clippedIntensity)]);
    }
  }

  const normalizedAxisExtent = axisExtent > 0 ? axisExtent : 1;
  const visualMapMin = Math.log10(DIFFRACTION_PSF_MIN_INTENSITY);
  const visualMapMax = Math.max(visualMapMin, Math.log10(maxClippedIntensity));
  const maxPlotWidth = chartWidth
    - DIFFRACTION_GRID_LEFT
    - DIFFRACTION_GRID_RIGHT;
  const maxPlotHeight = chartHeight - DIFFRACTION_GRID_TOP - DIFFRACTION_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    grid: {
      left: DIFFRACTION_GRID_LEFT + extraHorizontalSpace / 2,
      right: DIFFRACTION_GRID_RIGHT - extraHorizontalSpace / 2,
      top: DIFFRACTION_GRID_TOP,
      width: plotSide,
      height: plotSide,
    },
    xAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: diffractionPsfData.unitX ? `x (${diffractionPsfData.unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: diffractionPsfData.unitY ? `y (${diffractionPsfData.unitY})` : "y",
      nameLocation: "middle",
      nameGap: 36,
    },
    visualMap: {
      type: "continuous",
      dimension: 2,
      min: visualMapMin,
      max: visualMapMax,
      calculable: false,
      orient: "vertical",
      right: DIFFRACTION_RIGHT_PADDING,
      top: "middle",
      itemWidth: DIFFRACTION_VISUAL_MAP_WIDTH,
      itemHeight: 152,
      formatter: formatDiffractionPsfIntensity,
      inRange: {
        color: DIFFRACTION_PSF_COLOR_PALETTE,
      },
    },
    series: [
      {
        type: "scatter",
        data: scatterData,
        symbolSize: 6,
        progressive: 4096,
      },
    ],
  };
}

function DiffractionPsfChart({
  diffractionPsfData,
  autoHeight,
}: {
  readonly diffractionPsfData: DiffractionPsfData;
  readonly autoHeight?: boolean;
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const chartOption = useMemo(
    () => chartDimensions === undefined
      ? undefined
      : buildDiffractionPsfOption(diffractionPsfData, chartDimensions.width, chartDimensions.height),
    [chartDimensions, diffractionPsfData],
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return undefined;

    const updateChartDimensions = () => {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      const nextChartHeight = autoHeight || nextHeight <= 0
        ? nextWidth
        : Math.min(nextWidth, nextHeight);

      if (nextWidth > 0 && nextChartHeight > 0) {
        setChartDimensions({
          width: nextWidth,
          height: nextChartHeight,
        });
      }
    };

    updateChartDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateChartDimensions();
    });
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoHeight]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || chartOption === undefined) return undefined;

    const timeoutId = window.setTimeout(() => {
      if (!chartRef.current) {
        chartRef.current = echarts.init(container, undefined, { renderer: "canvas" });
      }
      chartRef.current.setOption(chartOption, true);
      chartRef.current.resize();
    }, DIFFRACTION_PSF_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chartOption]);

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.dispose();
      chartRef.current = undefined;
    };
  }, []);

  return (
    <div
      ref={chartContainerRef}
      data-testid="diffraction-psf-chart"
      aria-label="Diffraction PSF plot"
      className={autoHeight ? "max-w-full shrink-0" : "max-w-full shrink-0"}
      style={chartDimensions === undefined
        ? undefined
        : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
    />
  );
}

export function AnalysisPlotView({
  fieldOptions,
  wavelengthOptions,
  selectedFieldIndex,
  selectedWavelengthIndex,
  selectedPlotType,
  plotImageBase64,
  diffractionPsfData,
  loading,
  onFieldChange,
  onWavelengthChange,
  onPlotTypeChange,
  autoHeight,
}: AnalysisPlotViewProps) {
  const screenSize = useScreenBreakpoint();
  const selectType = screenSize === "screenSM" ? "compact" : "default";
  const fieldDisabled = !PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent;

  return (
    <div className={`flex ${autoHeight ? "" : "h-full "}min-h-0 flex-col gap-3`}>
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="analysis-field-select">
            Field
          </Label>
          <Select
            id="analysis-field-select"
            aria-label="Field"
            options={fieldOptions}
            value={selectedFieldIndex}
            disabled={fieldDisabled}
            type={selectType}
            onChange={(e) => onFieldChange(Number(e.target.value))}
          />
        </div>
        {PLOT_TYPE_CONFIG[selectedPlotType].wavelengthDependent && (
          <div className="flex-1">
            <Label htmlFor="analysis-wavelength-select">
              Wavelength
            </Label>
            <Select
              id="analysis-wavelength-select"
              aria-label="Wavelength"
              options={wavelengthOptions}
              value={selectedWavelengthIndex}
              type={selectType}
              onChange={(e) => onWavelengthChange(Number(e.target.value))}
            />
          </div>
        )}
        <div className="flex-1">
          <Label htmlFor="analysis-plot-type-select">
            Plot type
          </Label>
          <Select
            id="analysis-plot-type-select"
            aria-label="Plot type"
            options={PLOT_TYPE_OPTIONS}
            value={selectedPlotType}
            type={selectType}
            onChange={(e) => onPlotTypeChange(e.target.value as PlotType)}
          />
        </div>
      </div>

      <div className={autoHeight ? "flex items-center justify-center" : "flex min-h-0 flex-1 items-center justify-center"}>
        {loading ? (
          <Paragraph variant="placeholder">
            Loading plot...
          </Paragraph>
        ) : selectedPlotType === "diffractionPSF" && diffractionPsfData ? (
          <DiffractionPsfChart
            diffractionPsfData={diffractionPsfData}
            autoHeight={autoHeight}
          />
        ) : plotImageBase64 ? (
          /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */
          <img
            src={`data:image/png;base64,${plotImageBase64}`}
            alt="Analysis plot"
            className={autoHeight ? "w-full h-auto" : "max-h-full max-w-full object-contain"}
          />
        ) : (
          <Paragraph variant="placeholder">
            No plot available
          </Paragraph>
        )}
      </div>
    </div>
  );
}
