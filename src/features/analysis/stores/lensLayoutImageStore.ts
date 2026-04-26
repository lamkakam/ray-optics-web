import type { StateCreator } from "zustand";

export interface LensLayoutImageState {
  layoutImage: string | undefined;
  layoutLoading: boolean;
  setLayoutImage: (image: string | undefined) => void;
  setLayoutLoading: (loading: boolean) => void;
}

export const createLensLayoutImageSlice: StateCreator<LensLayoutImageState> = (set) => ({
  layoutImage: undefined,
  layoutLoading: false,
  setLayoutImage: (image) => set({ layoutImage: image }),
  setLayoutLoading: (loading) => set({ layoutLoading: loading }),
});
