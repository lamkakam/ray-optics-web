/**
 * Dependency-injected WebMCP descriptors for complete Lens Editor recomputation
 * and final-image-plane focusing. The descriptors delegate computation to the
 * same core operation and focusing helpers used by the visible editor.
 */
import type { StoreApi } from "zustand";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { PlotType } from "@/features/analysis/components";
import type { LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  buildDraftOpticalModel,
  computeOpticalSystem,
} from "@/features/lens-editor/lib/opticalSystemComputation";
import {
  applyFocusingDelta,
  dispatchFocusing,
  type FocusingChromaticity,
  type FocusingMetric,
} from "@/features/lens-editor/lib/focusing";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/features/lens-editor/lib/webMcpValidation";

/** Empty input schema for the complete recomputation tool. */
export const recomputeOpticalSystemInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

/** Strict focus selector schema; the field bound is checked against draft specs. */
export const focusOpticalSystemInputSchema = {
  type: "object",
  required: ["chromaticity", "metric", "fieldIndex"],
  additionalProperties: false,
  properties: {
    chromaticity: { type: "string", enum: ["mono", "poly"] },
    metric: { type: "string", enum: ["rmsSpot", "wavefront"] },
    fieldIndex: { type: "integer", minimum: 0 },
  },
} as const;

interface FocusInput {
  readonly chromaticity: FocusingChromaticity;
  readonly metric: FocusingMetric;
  readonly fieldIndex: number;
}

const validators = (() => {
  const ajv = createPrescriptionAjv();
  return {
    recompute: ajv.compile(recomputeOpticalSystemInputSchema),
    focus: ajv.compile<FocusInput>(focusOpticalSystemInputSchema),
  };
})();

/** Dependencies required by the two imperative optical-system descriptors. */
export interface OpticalSystemWebMcpDependencies {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
  readonly lookupMaps: GlassLookupMaps | undefined;
  /** Optional selector snapshots for dependency-injected tests/callers. */
  readonly selectedFieldIndex?: number;
  readonly selectedWavelengthIndex?: number;
  readonly selectedPlotType?: PlotType;
  readonly isDark: boolean;
  readonly imagePoint?: ImagePoint;
}

/** Named readonly handles for recomputation and focusing descriptors. */
export type OpticalSystemTools = Readonly<{
  readonly recomputeOpticalSystem: WebMCP.ModelContextTool;
  readonly focusOpticalSystem: WebMCP.ModelContextTool;
}>;

/** Creates the recomputation and focusing tools for one Lens Editor instance. */
export function createOpticalSystemTools(
  dependencies: OpticalSystemWebMcpDependencies,
): OpticalSystemTools {
  const {
    proxy,
    lensStore,
    specsStore,
    analysisPlotStore,
    analysisDataStore,
    lensLayoutImageStore,
    lookupMaps,
    selectedFieldIndex,
    selectedWavelengthIndex,
    selectedPlotType,
    isDark,
    imagePoint,
  } = dependencies;

  const currentComputation = (signal: AbortSignal) =>
    computeOpticalSystem({
      proxy,
      lensStore,
      specsStore,
      analysisPlotStore,
      analysisDataStore,
      lensLayoutImageStore,
      lookupMaps,
      selectedFieldIndex:
        selectedFieldIndex ?? analysisPlotStore.getState().selectedFieldIndex,
      selectedWavelengthIndex:
        selectedWavelengthIndex ??
        analysisPlotStore.getState().selectedWavelengthIndex,
      selectedPlotType:
        selectedPlotType ?? analysisPlotStore.getState().selectedPlotType,
      isDark,
      imagePoint,
      signal,
    });

  return {
    recomputeOpticalSystem: {
      name: "recompute_optical_system",
      description:
        "Recompute and commit the complete optical system, including glass validation, analyses, layout, selected-index clamping, and auto-aperture results.",
      inputSchema: recomputeOpticalSystemInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.recompute, input);
        assertWebMcpNotCancelled(signal);
        const result = await currentComputation(signal);
        return JSON.stringify({
          systemUpdated: true,
          surfaceCount: result.surfaceCount,
          specs: result.specs,
        });
      },
    },
    focusOpticalSystem: {
      name: "focus_optical_system",
      description:
        "Focus the current draft optical system using the selected chromaticity and metric, then recompute it. This focusing only changes the thickness of the space between the last optical surface and the image plane, so it is not suitable for all optical systems.",
      inputSchema: focusOpticalSystemInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.focus, input);
        assertWebMcpNotCancelled(signal);
        if (proxy === undefined) throw new Error("Pyodide not ready");

        const focusInput = input as FocusInput;
        const specs = specsStore.getState().toOpticalSpecs();
        if (focusInput.fieldIndex >= specs.field.fields.length) {
          throw new Error(
            `Invalid input at /fieldIndex: ${focusInput.fieldIndex} is outside the draft field range`,
          );
        }
        const draft = buildDraftOpticalModel(lensStore, specsStore);
        const focusResult = await dispatchFocusing(proxy, draft.model, {
          chromaticity: focusInput.chromaticity,
          metric: focusInput.metric,
          fieldIndex: focusInput.fieldIndex,
        });
        assertWebMcpNotCancelled(signal);
        const imageSpaceThickness = applyFocusingDelta(lensStore, focusResult);
        await currentComputation(signal);
        return JSON.stringify({
          delta_thi: focusResult.delta_thi,
          metric_value: focusResult.metric_value,
          imageSpaceThickness,
          systemUpdated: true,
        });
      },
    },
  };
}

/** Alias using the Lens Editor feature name for composition callers. */
export const createLensOpticalSystemTools = createOpticalSystemTools;
