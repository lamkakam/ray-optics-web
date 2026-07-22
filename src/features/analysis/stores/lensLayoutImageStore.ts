/**
 * Zustand store for managing the lens layout image and its loading state. Holds the base64-encoded lens layout image and a loading flag, following the same pattern as `analysisPlotStore`.
 *
 * @remarks
 * ## State
 *
 * | Field | Type | Default |
 * |---|---|---|
 * | `layoutImage` | `string \| undefined` | `undefined` |
 * | `layoutLoading` | `boolean` | `false` |
 *
 * ## Actions
 *
 * - `setLayoutImage(image)` — sets or clears the base64 PNG/SVG lens layout image.
 * - `setLayoutLoading(loading)` — sets the loading flag.
 *
 * ## Dependencies
 *
 * - `StateCreator` from `zustand`.
 */
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
