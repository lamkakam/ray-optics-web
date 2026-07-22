import React from "react";
import { AstigmatismChart } from "@/features/analysis/components/AstigmatismChart";
import { DiffractionMtfChart } from "@/features/analysis/components/DiffractionMtfChart";
import { DiffractionPsfChart } from "@/features/analysis/components/DiffractionPsfChart";
import { FieldCurveChart } from "@/features/analysis/components/FieldCurveChart";
import { GeoPsfChart } from "@/features/analysis/components/GeoPsfChart";
import { LongitudinalSphericalAberrationChart } from "@/features/analysis/components/LongitudinalSphericalAberrationChart";
import { OpdFanChart } from "@/features/analysis/components/OpdFanChart";
import { RayFanChart } from "@/features/analysis/components/RayFanChart";
import { SpotDiagramChart } from "@/features/analysis/components/SpotDiagramChart";
import { StrehlVsWavelengthChart } from "@/features/analysis/components/StrehlVsWavelengthChart";
import { SurfaceBySurface3rdOrderChart } from "@/features/analysis/components/SurfaceBySurface3rdOrderChart";
import { WavefrontMapChart } from "@/features/analysis/components/WavefrontMapChart";
import { Label } from "@/shared/components/primitives/Label";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select, type SelectOption } from "@/shared/components/primitives/Select";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";

/** Supported analysis plot discriminator. */
export type PlotType = "rayFan"
  | "opdFan"
  | "spotDiagram"
  | "fieldCurvature"
  | "astigmatismCurve"
  | "longitudinalSphericalAberration"
  | "surfaceBySurface3rdOrder"
  | "strehlVsWavelength"
  | "wavefrontMap"
  | "geoPSF"
  | "diffractionPSF"
  | "diffractionMTF";

type FieldOption = SelectOption & { readonly value: number };
type WavelengthOption = FieldOption;

interface AnalysisPlotViewProps {
  /** Selectable field points for the Half-Field dropdown */
  readonly fieldOptions: readonly FieldOption[];
  /** Selectable wavelengths for the wavelength dropdown */
  readonly wavelengthOptions: readonly WavelengthOption[];
  /** Currently selected field index */
  readonly selectedFieldIndex: number;
  /** Currently selected wavelength index */
  readonly selectedWavelengthIndex: number;
  /** Currently selected plot type */
  readonly selectedPlotType: PlotType;
  /** Per-surface Seidel aberration matrix used only when `selectedPlotType === "surfaceBySurface3rdOrder"` */
  readonly surfaceBySurface3rdOrderData?: SeidelSurfaceBySurfaceData;
  /** Per-wavelength ray-fan series used only when `selectedPlotType === "rayFan"` */
  readonly rayFanData?: RayFanData;
  /** Per-wavelength OPD fan series used only when `selectedPlotType === "opdFan"` */
  readonly opdFanData?: OpdFanData;
  /** Per-wavelength spot-diagram point clouds used only when `selectedPlotType === "spotDiagram"` */
  readonly spotDiagramData?: SpotDiagramData;
  /** Wavelength-specific field-curvature data used only when `selectedPlotType === "fieldCurvature"` */
  readonly fieldCurvatureData?: FieldCurveData;
  /** Wavelength-specific astigmatism curve data used only when `selectedPlotType === "astigmatismCurve"` */
  readonly astigmatismCurveData?: AstigmatismCurveData;
  /** Per-wavelength LSA curves used only when `selectedPlotType === "longitudinalSphericalAberration"` */
  readonly longitudinalSphericalAberrationData?: LongitudinalSphericalAberrationData;
  /** Geometric PSF point-cloud data used only when `selectedPlotType === "geoPSF"` */
  readonly geoPsfData?: GeoPsfData;
  /** Diffraction PSF axis/intensity data used only when `selectedPlotType === "diffractionPSF"` */
  readonly diffractionPsfData?: DiffractionPsfData;
  /** Diffraction MTF line data used only when `selectedPlotType === "diffractionMTF"` */
  readonly diffractionMtfData?: DiffractionMtfData;
  /** Wavefront-map axis/OPD data used only when `selectedPlotType === "wavefrontMap"` */
  readonly wavefrontMapData?: WavefrontMapData;
  /** Strehl ratio vs wavelength line data used only when `selectedPlotType === "strehlVsWavelength"` */
  readonly strehlVsWavelengthData?: StrehlVsWavelengthData;
  /** Shows "Loading plot..." placeholder when `true` */
  readonly loading?: boolean;
  /** Called with the new field index */
  readonly onFieldChange: (fieldIndex: number) => void;
  /** Called with the new wavelength index */
  readonly onWavelengthChange: (wavelengthIndex: number) => void;
  /** Called with the new plot type */
  readonly onPlotTypeChange: (plotType: PlotType) => void;
  /** When `true`, the outer container avoids the fixed-height panel layout so chart components can size to their content */
  readonly autoHeight?: boolean;
}

/** User-facing label and selector dependencies for one plot type. */
export interface PlotTypeConfig {
  readonly label: string;
  readonly fieldDependent: boolean;
  readonly wavelengthDependent?: boolean;
}

/**
 *
 * @remarks
 * ## PLOT_TYPE_CONFIG
 *
 * Exported config record mapping each `PlotType` to `{ label, fieldDependent, wavelengthDependent? }`:
 *
 * | PlotType | label | fieldDependent | wavelengthDependent |
 * |---|---|---|---|
 * | `rayFan` | "Ray Fan" | true | false |
 * | `opdFan` | "OPD Fan" | true | false |
 * | `spotDiagram` | "Spot Diagram" | true | false |
 * | `fieldCurvature` | "Field Curvature" | false | true |
 * | `astigmatismCurve` | "Astigmatism Curve" | false | true |
 * | `longitudinalSphericalAberration` | "Longitudinal Spherical Aberration" | false | false |
 * | `surfaceBySurface3rdOrder` | "Surface by Surface 3rd Order Aberr." | false | false |
 * | `strehlVsWavelength` | "Strehl vs Wavelength" | true | false |
 * | `wavefrontMap` | "Wavefront Map" | true | true |
 * | `geoPSF` | "Geometric PSF" | true | true |
 * | `diffractionPSF` | "Diffraction PSF" | true | true |
 * | `diffractionMTF` | "Diffraction MTF" | true | true |
 */
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
  fieldCurvature: {
    label: "Field Curvature",
    fieldDependent: false,
    wavelengthDependent: true,
  },
  astigmatismCurve: {
    label: "Astigmatism Curve",
    fieldDependent: false,
    wavelengthDependent: true,
  },
  longitudinalSphericalAberration: {
    label: "Longitudinal Spherical Aberration",
    fieldDependent: false,
    wavelengthDependent: false,
  },
  surfaceBySurface3rdOrder: {
    label: "Surface by Surface 3rd Order Aberr.",
    fieldDependent: false,
    wavelengthDependent: false,
  },
  strehlVsWavelength: {
    label: "Strehl vs Wavelength",
    fieldDependent: true,
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
  diffractionMTF: {
    label: "Diffraction MTF",
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
  fieldCurvature: createPlotRenderer(
    (props) => props.fieldCurvatureData !== undefined,
    (props) => props.fieldCurvatureData,
    (props, fieldCurvatureData) => (
      <FieldCurveChart
        fieldCurveData={fieldCurvatureData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  astigmatismCurve: createPlotRenderer(
    (props) => props.astigmatismCurveData !== undefined,
    (props) => props.astigmatismCurveData,
    (props, astigmatismCurveData) => (
      <AstigmatismChart
        astigmatismCurveData={astigmatismCurveData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
  longitudinalSphericalAberration: createPlotRenderer(
    (props) => props.longitudinalSphericalAberrationData !== undefined,
    (props) => props.longitudinalSphericalAberrationData,
    (props, longitudinalSphericalAberrationData) => (
      <LongitudinalSphericalAberrationChart
        longitudinalSphericalAberrationData={longitudinalSphericalAberrationData}
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
  strehlVsWavelength: createPlotRenderer(
    (props) => props.strehlVsWavelengthData !== undefined,
    (props) => props.strehlVsWavelengthData,
    (props, strehlVsWavelengthData) => (
      <StrehlVsWavelengthChart
        strehlVsWavelengthData={strehlVsWavelengthData}
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
  diffractionMTF: createPlotRenderer(
    (props) => props.diffractionMtfData !== undefined,
    (props) => props.diffractionMtfData,
    (props, diffractionMtfData) => (
      <DiffractionMtfChart
        diffractionMtfData={diffractionMtfData}
        autoHeight={props.autoHeight}
      />
    ),
  ),
};

/**
 * Displays an analysis plot alongside plot-type, Half-Field, and wavelength selectors. All supported analysis plot types delegate to dedicated ECharts chart components that render typed data.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - `PLOT_TYPE_CONFIG` (exported) declares which plot types are field-dependent; the Half-Field dropdown is hidden for non-field-dependent types.
 * - The wavelength selector is only rendered when `PLOT_TYPE_CONFIG[selectedPlotType].wavelengthDependent` is `true`.
 * - Uses `useScreenBreakpoint` to switch between `compact` and `default` Select variants on small screens.
 * - `PLOT_RENDERERS` (module-local) maps each `PlotType` to a typed renderer config with:
 * - `hasData(props)`, which checks whether the corresponding chart data is defined
 * - `render(props)`, which renders the matching chart component for that plot type
 * - `AnalysisPlotView` generalizes typed-chart availability by looking up `PLOT_RENDERERS[selectedPlotType]` and rendering the chart only when `hasData(props)` is `true`.
 * - `surfaceBySurface3rdOrder` renders `SurfaceBySurface3rdOrderChart` only when `surfaceBySurface3rdOrderData` is present. The chart uses the Seidel `surfaceBySurface` payload already fetched from the worker instead of the old PNG.
 * - `rayFan` renders `RayFanChart` only when `rayFanData` is present, passing wavelength labels from `wavelengthOptions` so each wavelength line pair is named by the actual wavelength rather than the wavelength index.
 * - `opdFan` renders `OpdFanChart` only when `opdFanData` is present, passing wavelength labels from `wavelengthOptions` so each wavelength line pair is named by the actual wavelength rather than the wavelength index.
 * - `spotDiagram` renders `SpotDiagramChart` only when `spotDiagramData` is present, passing wavelength labels from `wavelengthOptions` so each series is named by the actual wavelength rather than the wavelength index.
 * - `fieldCurvature` renders `FieldCurveChart` only when `fieldCurvatureData` is present and shows the wavelength selector without a Half-Field selector.
 * - `astigmatismCurve` renders `AstigmatismChart` only when `astigmatismCurveData` is present and shows the wavelength selector without a Half-Field selector.
 * - `longitudinalSphericalAberration` renders `LongitudinalSphericalAberrationChart` only when `longitudinalSphericalAberrationData` is present, passes wavelength labels to name each series, and hides both field and wavelength selectors because the worker always traces field 0 for all wavelengths.
 * - `strehlVsWavelength` renders `StrehlVsWavelengthChart` only when `strehlVsWavelengthData` is present. It is field-dependent and does not render the wavelength selector because the worker samples wavelengths internally.
 * - `wavefrontMap` renders `WavefrontMapChart` only when `wavefrontMapData` is present.
 * - `geoPSF` renders `GeoPsfChart` only when `geoPsfData` is present.
 * - `diffractionPSF` renders `DiffractionPsfChart` only when `diffractionPsfData` is present.
 * - `diffractionMTF` renders `DiffractionMtfChart` only when `diffractionMtfData` is present.
 * - `AnalysisPlotView` never imports Apache ECharts directly; chart-specific measurement, debounce, and option-building logic live in dedicated feature-local modules.
 */
export function AnalysisPlotView(props: AnalysisPlotViewProps) {
  const {
    fieldOptions,
    wavelengthOptions,
    selectedFieldIndex,
    selectedWavelengthIndex,
    selectedPlotType,
    loading,
    onFieldChange,
    onWavelengthChange,
    onPlotTypeChange,
    autoHeight,
  } = props;
  const fieldDisabled = !PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent;
  const fieldVisible = PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent;
  const selectedPlotRenderer = PLOT_RENDERERS[selectedPlotType];

  return (
    <div className={`flex ${autoHeight ? "" : "h-full "}min-h-0 flex-col gap-3`}>
      <div className="flex gap-3">
        {fieldVisible && (
          <div className="flex-1">
            <Label htmlFor="analysis-field-select">
              Half-Field
            </Label>
            <Select
              id="analysis-field-select"
              aria-label="Half-Field"
              options={fieldOptions}
              value={selectedFieldIndex}
              disabled={fieldDisabled}
              onChange={(e) => onFieldChange(Number(e.target.value))}
            />
          </div>
        )}
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
        ) : (
          <Paragraph variant="placeholder">
            No plot available
          </Paragraph>
        )}
      </div>
    </div>
  );
}
