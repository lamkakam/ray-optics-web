import React from "react";
import { DiffractionPsfChart } from "@/features/analysis/components/DiffractionPsfChart";
import { GeoPsfChart } from "@/features/analysis/components/GeoPsfChart";
import { OpdFanChart } from "@/features/analysis/components/OpdFanChart";
import { RayFanChart } from "@/features/analysis/components/RayFanChart";
import { SpotDiagramChart } from "@/features/analysis/components/SpotDiagramChart";
import { SurfaceBySurface3rdOrderChart } from "@/features/analysis/components/SurfaceBySurface3rdOrderChart";
import { WavefrontMapChart } from "@/features/analysis/components/WavefrontMapChart";
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

export function AnalysisPlotView({
  fieldOptions,
  wavelengthOptions,
  selectedFieldIndex,
  selectedWavelengthIndex,
  selectedPlotType,
  plotImageBase64,
  surfaceBySurface3rdOrderData,
  rayFanData,
  opdFanData,
  spotDiagramData,
  geoPsfData,
  diffractionPsfData,
  wavefrontMapData,
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
        ) : selectedPlotType === "wavefrontMap" && wavefrontMapData ? (
          <WavefrontMapChart
            wavefrontMapData={wavefrontMapData}
            autoHeight={autoHeight}
          />
        ) : selectedPlotType === "geoPSF" && geoPsfData ? (
          <GeoPsfChart
            geoPsfData={geoPsfData}
            autoHeight={autoHeight}
          />
        ) : selectedPlotType === "surfaceBySurface3rdOrder" && surfaceBySurface3rdOrderData ? (
          <SurfaceBySurface3rdOrderChart
            surfaceBySurface3rdOrderData={surfaceBySurface3rdOrderData}
            autoHeight={autoHeight}
          />
        ) : selectedPlotType === "rayFan" && rayFanData ? (
          <RayFanChart
            rayFanData={rayFanData}
            wavelengthLabels={wavelengthOptions.map((option) => option.label)}
            autoHeight={autoHeight}
          />
        ) : selectedPlotType === "opdFan" && opdFanData ? (
          <OpdFanChart
            opdFanData={opdFanData}
            wavelengthLabels={wavelengthOptions.map((option) => option.label)}
            autoHeight={autoHeight}
          />
        ) : selectedPlotType === "spotDiagram" && spotDiagramData ? (
          <SpotDiagramChart
            spotDiagramData={spotDiagramData}
            wavelengthLabels={wavelengthOptions.map((option) => option.label)}
            autoHeight={autoHeight}
          />
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
