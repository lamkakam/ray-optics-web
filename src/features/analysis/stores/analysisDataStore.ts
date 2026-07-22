/**
 * Zustand store for analysis results computed after each successful submit. Holds Seidel aberration data and first-order optical data returned by the Pyodide worker.
 *
 * @remarks
 * ## State
 *
 * | Field | Type | Default |
 * |---|---|---|
 * | `seidelData` | `SeidelData \| undefined` | `undefined` |
 * | `firstOrderData` | `Record<string, number> \| undefined` | `undefined` |
 *
 * ## Actions
 *
 * - `setSeidelData(data)` — stores or clears the 3rd-order Seidel aberration data returned by `proxy.get3rdOrderSeidelData`. Populated after each successful submit; controls visibility of the Seidel and Zernike buttons.
 * - `setFirstOrderData(data)` — stores or clears the first-order optical data (e.g. EFL, f-number) returned by `proxy.getFirstOrderData`. Populated after each successful submit.
 *
 * ## Dependencies
 *
 * - `create`, `StateCreator` from `zustand`.
 * - `SeidelData` from `@/features/lens-editor/types/seidelData`.
 */
import { type StateCreator } from "zustand";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";

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

