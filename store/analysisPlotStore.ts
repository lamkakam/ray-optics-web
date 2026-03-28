import { create, type StateCreator } from "zustand";
import type { PlotType } from "@/components/composite/AnalysisPlotView";

export interface AnalysisPlotState {
  plotImage: string | undefined;
  plotLoading: boolean;
  selectedFieldIndex: number;
  selectedWavelengthIndex: number;
  selectedPlotType: PlotType;

  setPlotImage: (image: string | undefined) => void;
  setPlotLoading: (loading: boolean) => void;
  setSelectedFieldIndex: (index: number) => void;
  setSelectedWavelengthIndex: (index: number) => void;
  setSelectedPlotType: (plotType: PlotType) => void;
}

export const createAnalysisPlotSlice: StateCreator<AnalysisPlotState> = (set) => ({
  plotImage: undefined,
  plotLoading: false,
  selectedFieldIndex: 0,
  selectedWavelengthIndex: 0,
  selectedPlotType: "rayFan",

  setPlotImage: (image) => set({ plotImage: image }),
  setPlotLoading: (loading) => set({ plotLoading: loading }),
  setSelectedFieldIndex: (index) => set({ selectedFieldIndex: index }),
  setSelectedWavelengthIndex: (index) => set({ selectedWavelengthIndex: index }),
  setSelectedPlotType: (plotType) => set({ selectedPlotType: plotType }),
});

export const useAnalysisPlotStore = create<AnalysisPlotState>(createAnalysisPlotSlice);
