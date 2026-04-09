import { type StateCreator } from "zustand";
import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";
import type { DiffractionPsfData, GeoPsfData, SpotDiagramData, WavefrontMapData } from "@/shared/lib/types/opticalModel";

export interface AnalysisPlotState {
  plotImage: string | undefined;
  spotDiagramData: SpotDiagramData | undefined;
  geoPsfData: GeoPsfData | undefined;
  diffractionPsfData: DiffractionPsfData | undefined;
  wavefrontMapData: WavefrontMapData | undefined;
  plotLoading: boolean;
  selectedFieldIndex: number;
  selectedWavelengthIndex: number;
  selectedPlotType: PlotType;

  setPlotImage: (image: string | undefined) => void;
  setSpotDiagramData: (data: SpotDiagramData | undefined) => void;
  setGeoPsfData: (data: GeoPsfData | undefined) => void;
  setDiffractionPsfData: (data: DiffractionPsfData | undefined) => void;
  setWavefrontMapData: (data: WavefrontMapData | undefined) => void;
  setPlotLoading: (loading: boolean) => void;
  setSelectedFieldIndex: (index: number, maxCount?: number) => void;
  setSelectedWavelengthIndex: (index: number, maxCount?: number) => void;
  setSelectedPlotType: (plotType: PlotType) => void;
}

export const createAnalysisPlotSlice: StateCreator<AnalysisPlotState> = (set) => ({
  plotImage: undefined,
  spotDiagramData: undefined,
  geoPsfData: undefined,
  diffractionPsfData: undefined,
  wavefrontMapData: undefined,
  plotLoading: false,
  selectedFieldIndex: 0,
  selectedWavelengthIndex: 0,
  selectedPlotType: "rayFan",

  setPlotImage: (image) => set({
    plotImage: image,
    spotDiagramData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    wavefrontMapData: undefined,
  }),
  setSpotDiagramData: (data) => set({
    spotDiagramData: data,
    plotImage: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
    wavefrontMapData: undefined,
  }),
  setGeoPsfData: (data) => set({
    geoPsfData: data,
    plotImage: undefined,
    spotDiagramData: undefined,
    diffractionPsfData: undefined,
    wavefrontMapData: undefined,
  }),
  setDiffractionPsfData: (data) => set({
    diffractionPsfData: data,
    plotImage: undefined,
    spotDiagramData: undefined,
    geoPsfData: undefined,
    wavefrontMapData: undefined,
  }),
  setWavefrontMapData: (data) => set({
    wavefrontMapData: data,
    plotImage: undefined,
    spotDiagramData: undefined,
    geoPsfData: undefined,
    diffractionPsfData: undefined,
  }),
  setPlotLoading: (loading) => set({ plotLoading: loading }),
  setSelectedFieldIndex: (index, maxCount) =>
    set({ selectedFieldIndex: maxCount !== undefined ? Math.min(index, maxCount - 1) : index }),
  setSelectedWavelengthIndex: (index, maxCount) =>
    set({ selectedWavelengthIndex: maxCount !== undefined ? Math.min(index, maxCount - 1) : index }),
  setSelectedPlotType: (plotType) => set({ selectedPlotType: plotType }),
});
