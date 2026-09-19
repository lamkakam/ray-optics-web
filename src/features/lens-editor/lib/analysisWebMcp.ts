import type { StoreApi } from "zustand";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type {
  ZernikeOrdering,
  ZernikePupilSpace,
} from "@/features/lens-editor/types/zernikeData";
import { loadZernikeData } from "@/features/analysis/lib/plotFunctions";
import {
  classicalName,
  NUM_FRINGE_TERMS,
  NUM_NOLL_TERMS,
  zernikeTermsForOrdering,
} from "@/features/lens-editor/lib/zernikeData";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";

/** Explicit freshness contract shared by all committed analysis descriptions. */
const committedSystemDescription =
  "Reads the last successfully computed optical system. To include pending Lens Editor edits, call `recompute_optical_system` first.";

/** Stored analysis getters accept only an empty object. */
const emptyInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

/** Optional dialog selectors; bounds are checked against the committed model. */
const zernikeInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fieldIndex: {
      type: "integer",
      minimum: 0,
      description: "Zero-based committed field index; defaults to 0.",
    },
    wavelengthIndex: {
      type: "integer",
      minimum: 0,
      description:
        "Zero-based committed wavelength index; defaults to its reference wavelength.",
    },
    ordering: {
      type: "string",
      enum: ["fringe", "noll"],
      description: "Defaults to fringe (37 terms); noll uses 56 terms.",
    },
    pupilSpace: {
      type: "string",
      enum: ["entrance", "exit"],
      description: "Defaults to entrance; exit requires finite image space.",
    },
  },
} as const;

interface ZernikeInput {
  readonly fieldIndex?: number;
  readonly wavelengthIndex?: number;
  readonly ordering?: ZernikeOrdering;
  readonly pupilSpace?: ZernikePupilSpace;
}

const validators = (() => {
  const ajv = createPrescriptionAjv();
  return {
    empty: ajv.compile(emptyInputSchema),
    zernike: ajv.compile<ZernikeInput>(zernikeInputSchema),
  };
})();

/** Stores are read at invocation time; worker and image reference follow the current render. */
export interface AnalysisWebMcpDependencies {
  readonly lensStore: StoreApi<LensEditorState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly imagePoint?: ImagePoint;
}

/** Named handles for the three read-only, Lens Editor-scoped analysis tools. */
export interface AnalysisTools {
  readonly getParaxialData: WebMCP.ModelContextTool;
  readonly get3rdOrderSeidelData: WebMCP.ModelContextTool;
  readonly getZernikeTerms: WebMCP.ModelContextTool;
}

/**
 * Creates analysis descriptors for committed data only. Paraxial and complete
 * Seidel payloads are read directly from AnalysisDataStore without recomputing.
 * Zernike uses the exact committed model instance and the dialog's loader/cache,
 * including its failure eviction, in-flight coalescing, and LRU behavior.
 *
 * Zernike defaults are field 0, committed reference wavelength, 37 Fringe terms,
 * and entrance pupil; Noll requests use 56 terms. Exit pupil is rejected when
 * the final surface's image gap has abs(thickness) > 1e8, matching the dialog.
 * Its JSON result preserves every worker field and adds resolved fieldIndex,
 * wavelengthIndex, ordering, pupilSpace, imagePoint, and terms. Each term has
 * one-based j, n, m, name, coefficient, and rmsNormalizedCoefficient without
 * rounding. Cancellation is checked before loading and after awaiting; it does
 * not interrupt computation shared with the dialog or another tool caller.
 */
export function createAnalysisTools({
  lensStore,
  analysisDataStore,
  proxy,
  imagePoint = "chief_ray",
}: AnalysisWebMcpDependencies): AnalysisTools {
  return {
    getParaxialData: {
      name: "get_paraxial_data",
      description: `Read the complete first-order data shown by the Paraxial Data dialog. ${committedSystemDescription}`,
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { firstOrderData } = analysisDataStore.getState();
        if (firstOrderData === undefined)
          throw new Error(
            "No computed paraxial data. Call recompute_optical_system first.",
          );
        return JSON.stringify(firstOrderData);
      },
    },
    get3rdOrderSeidelData: {
      name: "get_3rd_order_seidel_data",
      description: `Read complete third-order Seidel surfaceBySurface, transverse, wavefront, and curvature data, including surface labels and totals. ${committedSystemDescription}`,
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { seidelData } = analysisDataStore.getState();
        if (seidelData === undefined)
          throw new Error(
            "No computed Seidel data. Call recompute_optical_system first.",
          );
        return JSON.stringify(seidelData);
      },
    },
    getZernikeTerms: {
      name: "get_zernike_terms",
      description: `Read complete Zernike data and labeled terms using the current app image reference. Defaults to field 0, committed reference wavelength, Fringe ordering (37 terms), and entrance pupil. Noll ordering uses 56 terms; exit pupil requires finite image space. ${committedSystemDescription}`,
      inputSchema: zernikeInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.zernike, input);
        assertWebMcpNotCancelled(signal);
        const model = lensStore.getState().committedOpticalModel;
        if (model === undefined)
          throw new Error(
            "No computed optical system. Call recompute_optical_system first.",
          );
        const {
          fieldIndex = 0,
          wavelengthIndex = model.specs.wavelengths.referenceIndex,
          ordering = "fringe",
          pupilSpace = "entrance",
        } = input as ZernikeInput;
        if (fieldIndex >= model.specs.field.fields.length) {
          throw new Error(
            `Invalid input at /fieldIndex: ${fieldIndex} is outside the committed field range`,
          );
        }
        if (wavelengthIndex >= model.specs.wavelengths.weights.length) {
          throw new Error(
            `Invalid input at /wavelengthIndex: ${wavelengthIndex} is outside the committed wavelength range`,
          );
        }
        if (
          pupilSpace === "exit" &&
          Math.abs(model.surfaces.at(-1)?.thickness ?? 0) > 1e8
        ) {
          throw new Error(
            "Invalid input at /pupilSpace: exit pupil requires finite image space. Use entrance for this committed optical system.",
          );
        }
        if (proxy === undefined)
          throw new Error(
            "Pyodide not ready. Wait for app initialization to finish, then retry get_zernike_terms.",
          );
        const numTerms =
          ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
        const data = await loadZernikeData({
          proxy,
          model,
          fieldIndex,
          wavelengthIndex,
          ordering,
          numTerms,
          pupilSpace,
          imagePoint,
        });
        assertWebMcpNotCancelled(signal);
        const terms = zernikeTermsForOrdering(ordering, numTerms).map(
          ([n, m], i) => ({
            j: i + 1,
            n,
            m,
            name: classicalName(n, m),
            coefficient: data.coefficients[i],
            rmsNormalizedCoefficient: data.rms_normalized_coefficients[i],
          }),
        );
        return JSON.stringify({
          ...data,
          fieldIndex,
          wavelengthIndex,
          ordering,
          pupilSpace,
          imagePoint,
          terms,
        });
      },
    },
  };
}
