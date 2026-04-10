import React from "react";
import { DiffractionPsfChart } from "@/features/analysis/components/diffraction-psf-chart/DiffractionPsfChart";
import { GeoPsfChart } from "@/features/analysis/components/geo-psf-chart/GeoPsfChart";
import { OpdFanChart } from "@/features/analysis/components/opd-fan-chart/OpdFanChart";
import { RayFanChart } from "@/features/analysis/components/ray-fan-chart/RayFanChart";
import { SpotDiagramChart } from "@/features/analysis/components/spot-diagram-chart/SpotDiagramChart";
import { SurfaceBySurface3rdOrderChart } from "@/features/analysis/components/surface-by-surface-3rd-order-chart/SurfaceBySurface3rdOrderChart";
import { WavefrontMapChart } from "@/features/analysis/components/wavefront-map-chart/WavefrontMapChart";
import { Label } from "@/shared/components/primitives/Label";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select, type SelectOption } from "@/shared/components/primitives/Select";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import type { DiffractionPsfData, GeoPsfData, OpdFanData, RayFanData, SeidelSurfaceBySurfaceData, SpotDiagramData, WavefrontMapData } from "@/shared/lib/types/opticalModel";

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
  readonly surfaceBySurface3rdOrderData?: SeidelSurfaceBySurfaceData;
  readonly rayFanData?: RayFanData;
  readonly opdFanData?: OpdFanData;
  readonly spotDiagramData?: SpotDiagramData;
  readonly geoPsfData?: GeoPsfData;
  readonly diffractionPsfData?: DiffractionPsfData;
  readonly wavefrontMapData?: WavefrontMapData;
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

type ChartRendererProps = AnalysisPlotViewProps;

interface PlotRendererConfig {
  readonly hasData: (props: ChartRendererProps) => boolean;
  readonly render: (props: ChartRendererProps) => React.ReactNode;
}

function hasDefinedData<TData>(data: TData | undefined): data is TData {
  return data !== undefined;
}

function createPlotRenderer<TData>(
  hasData: (props: ChartRendererProps) => boolean,
  getData: (props: ChartRendererProps) => TData | undefined,
  render: (props: ChartRendererProps, data: TData) => React.ReactNode,
): PlotRendererConfig {
  return {
    hasData,
    render: (props) => {
      const data = getData(props);

      if (!hasDefinedData(data)) {
        return undefined;
      }

      return render(props, data);
    },
  };
}

const PLOT_RENDERERS: Record<PlotType, PlotRendererConfig> = {
  rayFan: createPlotRenderer(
    (props) => props.rayFanData !== undefined,
    (props) => props.rayFanData,
    (props, rayFanData) => (
      <RayFanChart
        rayFanData={rayFanData}
        wavelengthLabels={props.wavelengthOptions.map((option) => option.label)}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  opdFan: createPlotRenderer(
    (props) => props.opdFanData !== undefined,
    (props) => props.opdFanData,
    (props, opdFanData) => (
      <OpdFanChart
        opdFanData={opdFanData}
        wavelengthLabels={props.wavelengthOptions.map((option) => option.label)}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  spotDiagram: createPlotRenderer(
    (props) => props.spotDiagramData !== undefined,
    (props) => props.spotDiagramData,
    (props, spotDiagramData) => (
      <SpotDiagramChart
        spotDiagramData={spotDiagramData}
        wavelengthLabels={props.wavelengthOptions.map((option) => option.label)}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  surfaceBySurface3rdOrder: createPlotRenderer(
    (props) => props.surfaceBySurface3rdOrderData !== undefined,
    (props) => props.surfaceBySurface3rdOrderData,
    (props, surfaceBySurface3rdOrderData) => (
      <SurfaceBySurface3rdOrderChart
        surfaceBySurface3rdOrderData={surfaceBySurface3rdOrderData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  wavefrontMap: createPlotRenderer(
    (props) => props.wavefrontMapData !== undefined,
    (props) => props.wavefrontMapData,
    (props, wavefrontMapData) => (
      <WavefrontMapChart
        wavefrontMapData={wavefrontMapData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  geoPSF: createPlotRenderer(
    (props) => props.geoPsfData !== undefined,
    (props) => props.geoPsfData,
    (props, geoPsfData) => (
      <GeoPsfChart
        geoPsfData={geoPsfData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  diffractionPSF: createPlotRenderer(
    (props) => props.diffractionPsfData !== undefined,
    (props) => props.diffractionPsfData,
    (props, diffractionPsfData) => (
      <DiffractionPsfChart
        diffractionPsfData={diffractionPsfData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
};

export function AnalysisPlotView(props: AnalysisPlotViewProps) {
  const {
    fieldOptions,
    wavelengthOptions,
    selectedFieldIndex,
    selectedWavelengthIndex,
    selectedPlotType,
    plotImageBase64,
    loading,
    onFieldChange,
    onWavelengthChange,
    onPlotTypeChange,
    autoHeight,
  } = props;
  const screenSize = useScreenBreakpoint();
  const selectType = screenSize === "screenSM" ? "compact" : "default";
  const fieldDisabled = !PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent;
  const selectedPlotRenderer = PLOT_RENDERERS[selectedPlotType];

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
        ) : selectedPlotRenderer.hasData(props) ? (
          selectedPlotRenderer.render(props)
        ) : plotImageBase64 ? (
          /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */
          <img
            src={`data:image/png;base64,${plotImageBase64}`}
            alt="Analysis plot"
            className={autoHeight ? "h-auto w-full" : "max-h-full max-w-full object-contain"}
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
