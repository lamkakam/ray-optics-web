/**
 * Zustand store for managing the lens layout image and its loading state. Holds the base64-encoded lens layout image and a loading flag, following the same pattern as `analysisPlotStore`.
 *
 * @remarks
 * ## Dependencies
 *
 * - `StateCreator` from `zustand`.
 */
import type { StateCreator } from "zustand";

export interface LensLayoutImageState {
  /** Base64-encoded PNG or SVG lens layout image, initially `undefined`. */
  layoutImage: string | undefined;
  /** Whether the lens layout image is loading. Defaults to `false`. */
  layoutLoading: boolean;
  /** Sets or clears the base64-encoded lens layout image. */
  setLayoutImage: (image: string | undefined) => void;
  /** Sets whether the lens layout image is loading. */
  setLayoutLoading: (loading: boolean) => void;
}

export const createLensLayoutImageSlice: StateCreator<LensLayoutImageState> = (set) => ({
  layoutImage: undefined,
  layoutLoading: false,
  setLayoutImage: (image) => set({ layoutImage: image }),
  setLayoutLoading: (loading) => set({ layoutLoading: loading }),
});
