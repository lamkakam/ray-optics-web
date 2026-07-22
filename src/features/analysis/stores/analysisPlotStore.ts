/**
# `features/analysis/stores/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds Ray-Fan data, OPD-fan data, spot-diagram data, field-curvature data, astigmatism-curve data, longitudinal-spherical-aberration data, geometric-PSF data, wavefront-map data, Strehl-vs-wavelength data, diffraction-PSF data, or diffraction-MTF data payload, plus the loading flag and selected field/wavelength indices that drive the `AnalysisPlotView` component.

## State

| Field | Type | Default |
|---|---|---|
| `rayFanData` | `RayFanData \| undefined` | `undefined` |
| `opdFanData` | `OpdFanData \| undefined` | `undefined` |
| `spotDiagramData` | `SpotDiagramData \| undefined` | `undefined` |
| `fieldCurvatureData` | `FieldCurveData \| undefined` | `undefined` |
| `astigmatismCurveData` | `AstigmatismCurveData \| undefined` | `undefined` |
| `longitudinalSphericalAberrationData` | `LongitudinalSphericalAberrationData \| undefined` | `undefined` |
| `geoPsfData` | `GeoPsfData \| undefined` | `undefined` |
| `diffractionPsfData` | `DiffractionPsfData \| undefined` | `undefined` |
| `diffractionMtfData` | `DiffractionMtfData \| undefined` | `undefined` |
| `wavefrontMapData` | `WavefrontMapData \| undefined` | `undefined` |
| `strehlVsWavelengthData` | `StrehlVsWavelengthData \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setRayFanData(data)` — sets or clears the Ray Fan ECharts payload and clears the other typed plot payloads.
- `setOpdFanData(data)` — sets or clears the OPD Fan ECharts payload and clears the other typed plot payloads.
- `setSpotDiagramData(data)` — sets or clears the ECharts Spot Diagram payload and clears the other typed plot payloads.
- `setFieldCurvatureData(data)` — sets or clears the field-curvature chart payload and clears the other typed plot payloads.
- `setAstigmatismCurveData(data)` — sets or clears the astigmatism-curve chart payload and clears the other typed plot payloads.
- `setLongitudinalSphericalAberrationData(data)` — sets or clears the longitudinal spherical aberration chart payload and clears the other typed plot payloads.
- `setGeoPsfData(data)` — sets or clears the geometric PSF chart payload and clears the other typed plot payloads.
- `setDiffractionPsfData(data)` — sets or clears the diffraction PSF chart payload and clears the other typed plot payloads.
- `setDiffractionMtfData(data)` — sets or clears the diffraction MTF chart payload and clears the other typed plot payloads.
- `setWavefrontMapData(data)` — sets or clears the wavefront-map chart payload and clears the other typed plot payloads.
- `setStrehlVsWavelengthData(data)` — sets or clears the Strehl-vs-wavelength chart payload and clears the other typed plot payloads.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/features/analysis/components`.
- `RayFanData`, `OpdFanData`, `SpotDiagramData`, `FieldCurveData`, `AstigmatismCurveData`, `LongitudinalSphericalAberrationData`, `GeoPsfData`, `DiffractionPsfData`, `DiffractionMtfData`, `StrehlVsWavelengthData`, and `WavefrontMapData` (type-only) from `@/features/analysis/types/plotData`.*/
import { type StateCreator } from "zustand";
import type { PlotType } from "@/features/analysis/components";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";

export interface AnalysisPlotState {
  rayFanData: RayFanData | undefined;
  opdFanData: OpdFanData | undefined;
  spotDiagramData: SpotDiagramData | undefined;
  fieldCurvatureData: FieldCurveData | undefined;
  astigmatismCurveData: AstigmatismCurveData | undefined;
  longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData | undefined;
  geoPsfData: GeoPsfData | undefined;
  diffractionPsfData: DiffractionPsfData | undefined;
  diffractionMtfData: DiffractionMtfData | undefined;
  wavefrontMapData: WavefrontMapData | undefined;
  strehlVsWavelengthData: StrehlVsWavelengthData | undefined;
  plotLoading: boolean;
  selectedFieldIndex: number;
  selectedWavelengthIndex: number;
  selectedPlotType: PlotType;

  setRayFanData: (data: RayFanData | undefined) => void;
  setOpdFanData: (data: OpdFanData | undefined) => void;
  setSpotDiagramData: (data: SpotDiagramData | undefined) => void;
  setFieldCurvatureData: (data: FieldCurveData | undefined) => void;
  setAstigmatismCurveData: (data: AstigmatismCurveData | undefined) => void;
  setLongitudinalSphericalAberrationData: (data: LongitudinalSphericalAberrationData | undefined) => void;
  setGeoPsfData: (data: GeoPsfData | undefined) => void;
  setDiffractionPsfData: (data: DiffractionPsfData | undefined) => void;
  setDiffractionMtfData: (data: DiffractionMtfData | undefined) => void;
  setWavefrontMapData: (data: WavefrontMapData | undefined) => void;
  setStrehlVsWavelengthData: (data: StrehlVsWavelengthData | undefined) => void;
  setPlotLoading: (loading: boolean) => void;
  setSelectedFieldIndex: (index: number, maxCount?: number) => void;
  setSelectedWavelengthIndex: (index: number, maxCount?: number) => void;
  setSelectedPlotType: (plotType: PlotType) => void;
}

export const createAnalysisPlotSlice: StateCreator<AnalysisPlotState> = (set) => ({
  rayFanData: undefined,
  opdFanData: undefined,
  spotDiagramData: undefined,
  fieldCurvatureData: undefined,
  astigmatismCurveData: undefined,
  longitudinalSphericalAberrationData: undefined,
  geoPsfData: undefined,
  diffractionPsfData: undefined,
  diffractionMtfData: undefined,
  wavefrontMapData: undefined,
  strehlVsWavelengthData: undefined,
  plotLoading: false,
  selectedFieldIndex: 0,
  selectedWavelengthIndex: 0,
  selectedPlotType: "rayFan",

  setRayFanData: (data) => set({
    rayFanData: data,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setOpdFanData: (data) => set({
    opdFanData: data,
    rayFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setSpotDiagramData: (data) => set({
    spotDiagramData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setFieldCurvatureData: (data) => set({
    fieldCurvatureData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setAstigmatismCurveData: (data) => set({
    astigmatismCurveData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setLongitudinalSphericalAberrationData: (data) => set({
    longitudinalSphericalAberrationData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setGeoPsfData: (data) => set({
    geoPsfData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setDiffractionPsfData: (data) => set({
    diffractionPsfData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setDiffractionMtfData: (data) => set({
    diffractionMtfData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    wavefrontMapData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setWavefrontMapData: (data) => set({
    wavefrontMapData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    strehlVsWavelengthData: undefined,
  }),
  setStrehlVsWavelengthData: (data) => set({
    strehlVsWavelengthData: data,
    rayFanData: undefined,
    opdFanData: undefined,
    spotDiagramData: undefined,
    fieldCurvatureData: undefined,
    astigmatismCurveData: undefined,
    longitudinalSphericalAberrationData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    diffractionMtfData: undefined,
    wavefrontMapData: undefined,
  }),
  setPlotLoading: (loading) => set({ plotLoading: loading }),
  setSelectedFieldIndex: (index, maxCount) =>
    set({ selectedFieldIndex: maxCount !== undefined ? Math.min(index, maxCount - 1) : index }),
  setSelectedWavelengthIndex: (index, maxCount) =>
    set({ selectedWavelengthIndex: maxCount !== undefined ? Math.min(index, maxCount - 1) : index }),
  setSelectedPlotType: (plotType) => set({ selectedPlotType: plotType }),
});
