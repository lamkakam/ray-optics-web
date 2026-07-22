/**
 * Zustand store for managing the analysis plot panel state. Holds Ray-Fan data, OPD-fan data, spot-diagram data, field-curvature data, astigmatism-curve data, longitudinal-spherical-aberration data, geometric-PSF data, wavefront-map data, Strehl-vs-wavelength data, diffraction-PSF data, or diffraction-MTF data payload, plus the loading flag and selected field/wavelength indices that drive the `AnalysisPlotView` component.
 *
 * @remarks
 * ## Dependencies
 *
 * - `create`, `StateCreator` from `zustand`.
 * - `PlotType` (type-only) from `@/features/analysis/components`.
 * - `RayFanData`, `OpdFanData`, `SpotDiagramData`, `FieldCurveData`, `AstigmatismCurveData`, `LongitudinalSphericalAberrationData`, `GeoPsfData`, `DiffractionPsfData`, `DiffractionMtfData`, `StrehlVsWavelengthData`, and `WavefrontMapData` (type-only) from `@/features/analysis/types/plotData`.
 */
import { type StateCreator } from "zustand";
import type { PlotType } from "@/features/analysis/components";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";

export interface AnalysisPlotState {
  /** Ray Fan chart payload, initially `undefined`. */
  rayFanData: RayFanData | undefined;
  /** OPD Fan chart payload, initially `undefined`. */
  opdFanData: OpdFanData | undefined;
  /** Spot Diagram chart payload, initially `undefined`. */
  spotDiagramData: SpotDiagramData | undefined;
  /** Field-curvature chart payload, initially `undefined`. */
  fieldCurvatureData: FieldCurveData | undefined;
  /** Astigmatism-curve chart payload, initially `undefined`. */
  astigmatismCurveData: AstigmatismCurveData | undefined;
  /** Longitudinal spherical-aberration chart payload, initially `undefined`. */
  longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData | undefined;
  /** Geometric PSF chart payload, initially `undefined`. */
  geoPsfData: GeoPsfData | undefined;
  /** Diffraction PSF chart payload, initially `undefined`. */
  diffractionPsfData: DiffractionPsfData | undefined;
  /** Diffraction MTF chart payload, initially `undefined`. */
  diffractionMtfData: DiffractionMtfData | undefined;
  /** Wavefront-map chart payload, initially `undefined`. */
  wavefrontMapData: WavefrontMapData | undefined;
  /** Strehl-vs-wavelength chart payload, initially `undefined`. */
  strehlVsWavelengthData: StrehlVsWavelengthData | undefined;
  /** Whether plot data is loading. Defaults to `false`. */
  plotLoading: boolean;
  /** Active field index. Defaults to `0`. */
  selectedFieldIndex: number;
  /** Active wavelength index. Defaults to `0`. */
  selectedWavelengthIndex: number;
  /** Active plot type. Defaults to `"rayFan"`. */
  selectedPlotType: PlotType;

  /** Sets or clears the Ray Fan payload and clears every other typed plot payload. */
  setRayFanData: (data: RayFanData | undefined) => void;
  /** Sets or clears the OPD Fan payload and clears every other typed plot payload. */
  setOpdFanData: (data: OpdFanData | undefined) => void;
  /** Sets or clears the Spot Diagram payload and clears every other typed plot payload. */
  setSpotDiagramData: (data: SpotDiagramData | undefined) => void;
  /** Sets or clears the field-curvature payload and clears every other typed plot payload. */
  setFieldCurvatureData: (data: FieldCurveData | undefined) => void;
  /** Sets or clears the astigmatism-curve payload and clears every other typed plot payload. */
  setAstigmatismCurveData: (data: AstigmatismCurveData | undefined) => void;
  /** Sets or clears the longitudinal spherical-aberration payload and clears every other typed plot payload. */
  setLongitudinalSphericalAberrationData: (data: LongitudinalSphericalAberrationData | undefined) => void;
  /** Sets or clears the geometric PSF payload and clears every other typed plot payload. */
  setGeoPsfData: (data: GeoPsfData | undefined) => void;
  /** Sets or clears the diffraction PSF payload and clears every other typed plot payload. */
  setDiffractionPsfData: (data: DiffractionPsfData | undefined) => void;
  /** Sets or clears the diffraction MTF payload and clears every other typed plot payload. */
  setDiffractionMtfData: (data: DiffractionMtfData | undefined) => void;
  /** Sets or clears the wavefront-map payload and clears every other typed plot payload. */
  setWavefrontMapData: (data: WavefrontMapData | undefined) => void;
  /** Sets or clears the Strehl-vs-wavelength payload and clears every other typed plot payload. */
  setStrehlVsWavelengthData: (data: StrehlVsWavelengthData | undefined) => void;
  /** Sets whether plot data is loading. */
  setPlotLoading: (loading: boolean) => void;
  /** Sets the active field index, clamping only its upper bound to `maxCount - 1` when `maxCount` is provided. */
  setSelectedFieldIndex: (index: number, maxCount?: number) => void;
  /** Sets the active wavelength index, clamping only its upper bound to `maxCount - 1` when `maxCount` is provided. */
  setSelectedWavelengthIndex: (index: number, maxCount?: number) => void;
  /** Sets the active plot type. */
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
