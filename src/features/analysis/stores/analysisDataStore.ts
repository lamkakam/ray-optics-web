/**
 * Zustand store for analysis results computed after each successful submit. Holds Seidel aberration data and first-order optical data returned by the Pyodide worker.
 *
 * @remarks
 * ## Dependencies
 *
 * - `create`, `StateCreator` from `zustand`.
 * - `SeidelData` from `@/features/lens-editor/types/seidelData`.
 */
import { type StateCreator } from "zustand";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";

export interface AnalysisDataState {
  /** Third-order Seidel aberration data from the latest successful submit, or `undefined` before submission or after clearing. Controls visibility of the Seidel and Zernike buttons. */
  seidelData: SeidelData | undefined;
  /** First-order optical data, such as EFL and f-number, from the latest successful submit, or `undefined` before submission or after clearing. */
  firstOrderData: Record<string, number> | undefined;

  /** Stores or clears the third-order Seidel aberration data returned by `proxy.get3rdOrderSeidelData`. */
  setSeidelData: (data: SeidelData | undefined) => void;
  /** Stores or clears the first-order optical data returned by `proxy.getFirstOrderData`. */
  setFirstOrderData: (data: Record<string, number> | undefined) => void;
}

export const createAnalysisDataSlice: StateCreator<AnalysisDataState> = (set) => ({
  seidelData: undefined,
  firstOrderData: undefined,

  setSeidelData: (data) => set({ seidelData: data }),
  setFirstOrderData: (data) => set({ firstOrderData: data }),
});
