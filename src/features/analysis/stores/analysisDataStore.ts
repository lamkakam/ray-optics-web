import { create, type StateCreator } from "zustand";
import type { SeidelData } from "@/shared/lib/types/opticalModel";

export interface AnalysisDataState {
  seidelData: SeidelData | undefined;
  firstOrderData: Record<string, number> | undefined;

  setSeidelData: (data: SeidelData | undefined) => void;
  setFirstOrderData: (data: Record<string, number> | undefined) => void;
}

export const createAnalysisDataSlice: StateCreator<AnalysisDataState> = (set) => ({
  seidelData: undefined,
  firstOrderData: undefined,

  setSeidelData: (data) => set({ seidelData: data }),
  setFirstOrderData: (data) => set({ firstOrderData: data }),
});

export const useAnalysisDataStore = create<AnalysisDataState>(createAnalysisDataSlice);
