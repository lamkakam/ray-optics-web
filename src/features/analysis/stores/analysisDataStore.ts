/**
 * Zustand store for successful Seidel and first-order worker results and their
 * exact source-model instances. Ownership permits consumers to detect stale
 * results when the committed model changes without recomputing analyses.
 *
 * @remarks
 * ## Dependencies
 *
 * - `create`, `StateCreator` from `zustand`.
 * - `SeidelData` from `@/features/lens-editor/types/seidelData`.
 */
import type { StateCreator } from "zustand";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

export interface AnalysisDataState {
  /** Complete third-order Seidel payload from the latest successful computation, or `undefined` before computation or after clearing. Controls visibility of the Seidel button. */
  seidelData: SeidelData | undefined;
  /** Exact source instance for `seidelData`, or `undefined` when cleared or stored without a source. */
  seidelDataModel: OpticalModel | undefined;
  /** First-order optical data, such as EFL and f-number, from the latest successful submit, or `undefined` before submission or after clearing. */
  firstOrderData: Record<string, number> | undefined;
  /** Exact source instance for `firstOrderData`, or `undefined` when cleared or stored without a source. */
  firstOrderDataModel: OpticalModel | undefined;

  /** Stores the complete Seidel payload and its source together. Clearing data or omitting the source clears ownership. */
  setSeidelData: (data: SeidelData | undefined, model?: OpticalModel) => void;
  /** Stores first-order data and its source together. Clearing data or omitting the source clears ownership. */
  setFirstOrderData: (
    data: Record<string, number> | undefined,
    model?: OpticalModel,
  ) => void;
}

export const createAnalysisDataSlice: StateCreator<AnalysisDataState> = (
  set,
) => ({
  seidelData: undefined,
  seidelDataModel: undefined,
  firstOrderData: undefined,
  firstOrderDataModel: undefined,

  setSeidelData: (data, model) =>
    set({
      seidelData: data,
      seidelDataModel: data === undefined ? undefined : model,
    }),
  setFirstOrderData: (data, model) =>
    set({
      firstOrderData: data,
      firstOrderDataModel: data === undefined ? undefined : model,
    }),
});
