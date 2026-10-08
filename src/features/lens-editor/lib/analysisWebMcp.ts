import type { StoreApi } from "zustand";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type {
  ZernikeOrdering,
  ZernikePupilSpace,
} from "@/features/lens-editor/types/zernikeData";
import {
  loadAnalysisPlot,
  loadZernikeData,
  type AnalysisPlotLoadResult,
} from "@/features/analysis/lib/plotFunctions";
import { ANALYSIS_RAY_COUNT_SETTINGS } from "@/features/analysis/lib/analysisRayCounts";
import { ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS } from "@/features/analysis/lib/analysisWavelengthSamples";
import { calculateSpotDiagramRadii } from "@/features/analysis/lib/calculateSpotDiagramRadii";
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
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";

/** Explicit freshness contract shared by all committed analysis descriptions. */
const committedSystemDescription =
  "Reads the current committed optical system. To include pending Lens Editor edits, call `recompute_optical_system` first.";

/** Stored payloads need ownership matching the committed model, including after Apply. */
const storedResultDescription =
  "Stored results must belong to that exact model; after optimization Apply, call `recompute_optical_system` if results are missing or stale.";

/** Typed failure for a tool that needs a committed optical system first. */
function noComputedSystem(): WebMcpToolError {
  return new WebMcpToolError(
    "precondition_failed",
    "No computed optical system. Call recompute_optical_system first.",
  );
}

/** Typed failure naming the tool to retry once Pyodide loads. */
function pyodideNotReady(tool: string): WebMcpToolError {
  return new WebMcpToolError(
    "not_ready",
    `Pyodide not ready. Wait for app initialization to finish, then retry ${tool}.`,
  );
}

/** Rejects a selector outside the committed model, naming its valid range. */
function assertCommittedIndex(
  selector: "fieldIndex" | "wavelengthIndex",
  index: number,
  count: number,
): void {
  if (index < count) return;
  const label = selector === "fieldIndex" ? "field" : "wavelength";
  throw new WebMcpToolError(
    "invalid_input",
    `Invalid input at /${selector}: ${index} is outside the committed ${label} range; valid ${label} indices are 0 to ${count - 1}`,
    { path: `/${selector}` },
  );
}

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

/** Plot tools expose only selectors relevant to their shared-loader cache key. */
const plotInputSchemas = {
  field: {
    ...emptyInputSchema,
    properties: { fieldIndex: zernikeInputSchema.properties.fieldIndex },
  },
  wavelength: {
    ...emptyInputSchema,
    properties: {
      wavelengthIndex: zernikeInputSchema.properties.wavelengthIndex,
    },
  },
  both: {
    ...emptyInputSchema,
    properties: {
      fieldIndex: zernikeInputSchema.properties.fieldIndex,
      wavelengthIndex: zernikeInputSchema.properties.wavelengthIndex,
    },
  },
  none: { ...emptyInputSchema, properties: {} },
  fieldSamples: {
    ...emptyInputSchema,
    properties: {
      fieldIndex: zernikeInputSchema.properties.fieldIndex,
      wavelengthSamples: {
        type: "integer",
        minimum: 2,
        maximum: 1000,
        description:
          "Number of uniformly spaced wavelength samples across the analysis range; defaults to the app's Settings value.",
      },
    },
  },
} as const;

/** Optional committed selectors; every plot's schema rejects unsupported keys. */
interface PlotInput {
  readonly fieldIndex?: number;
  readonly wavelengthIndex?: number;
  readonly wavelengthSamples?: number;
}

const validators = (() => {
  const ajv = createPrescriptionAjv();
  return {
    empty: ajv.compile(emptyInputSchema),
    zernike: ajv.compile<ZernikeInput>(zernikeInputSchema),
    plot: {
      field: ajv.compile<PlotInput>(plotInputSchemas.field),
      wavelength: ajv.compile<PlotInput>(plotInputSchemas.wavelength),
      both: ajv.compile<PlotInput>(plotInputSchemas.both),
      none: ajv.compile<PlotInput>(plotInputSchemas.none),
      fieldSamples: ajv.compile<PlotInput>(plotInputSchemas.fieldSamples),
    },
  };
})();

/** Stores are read at invocation time; worker and image reference follow the current render. */
export interface AnalysisWebMcpDependencies {
  readonly lensStore: StoreApi<LensEditorState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly imagePoint?: ImagePoint;
}

/** Named handles for fourteen read-only, Lens Editor-scoped analysis tools. */
export interface AnalysisTools {
  readonly getParaxialData: WebMCP.ModelContextTool;
  readonly get3rdOrderSeidelData: WebMCP.ModelContextTool;
  readonly getZernikeTerms: WebMCP.ModelContextTool;
  readonly getRayFanData: WebMCP.ModelContextTool;
  readonly getOpdFanData: WebMCP.ModelContextTool;
  readonly getSpotDiagramData: WebMCP.ModelContextTool;
  readonly getFieldCurvatureData: WebMCP.ModelContextTool;
  readonly getAstigmatismData: WebMCP.ModelContextTool;
  readonly getLongitudinalSphericalAberrationData: WebMCP.ModelContextTool;
  readonly getStrehlVsWavelengthData: WebMCP.ModelContextTool;
  readonly getChromaticFocalShiftData: WebMCP.ModelContextTool;
  readonly getWavefrontMapData: WebMCP.ModelContextTool;
  readonly getDiffractionPsfData: WebMCP.ModelContextTool;
  readonly getDiffractionMtfData: WebMCP.ModelContextTool;
}

/** Cached plot kinds exposed by dedicated tools; Seidel retains its stored getter. */
type ToolPlotKind = Exclude<
  AnalysisPlotLoadResult["kind"],
  "surfaceBySurface3rdOrder" | "geoPSF"
>;

/** Associates each plot with its strict selectors and complete, typed worker payload. */
interface PlotToolDefinition<K extends ToolPlotKind> {
  readonly name: string;
  readonly description: string;
  readonly plotType: K;
  readonly selectors: keyof typeof plotInputSchemas;
  readonly data: (
    result: Extract<AnalysisPlotLoadResult, { kind: K }>,
  ) => unknown;
}

/**
 * Creates analysis descriptors for committed data only. Paraxial and complete
 * Seidel payloads are read directly from AnalysisDataStore without recomputing,
 * only when their source is the current, defined committed model instance.
 * Missing data or ownership, including stale results after optimization Apply,
 * requires `recompute_optical_system`. Draft edits do not affect this check.
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
 *
 * Eleven plot tools use loadAnalysisPlot and its unchanged model-identity/image-point
 * LRU, selector/sampling/FFT keys, shared promises, and failure eviction. Each call
 * snapshots the committed model, app ray counts, and current image reference;
 * defaults are field 0 and the committed reference wavelength, never UI selection.
 * Only relevant selectors are accepted as nonnegative integers in committed bounds.
 * Results contain the complete unrounded worker `data`, applicable resolved
 * selectors, imagePoint, and numRays for configurable plots. Fans, spots, and LSA
 * retain every wavelength. Strehl and chromatic focal shift use the app's wavelength sample count and echo
 * it as wavelengthSamples; chromatic focal shift also accepts an optional integer
 * wavelengthSamples in [2, 1000] that overrides it and joins its cache key.
 * Spot results also include unrounded GEO/RMS `radii` from all positive committed
 * spectral weights about the supplied reference origin, in µm or afocal arcsec.
 * Unavailable radii are omitted without discarding point data. Tools never commit
 * chart data, selections, loading flags, or preferences; pending edits require
 * explicit recomputation. Cancellation only rejects the requesting caller.
 *
 * Failures throw `WebMcpToolError`: a missing committed model or stale stored
 * data is `precondition_failed` (call `recompute_optical_system`), selectors
 * outside the committed model are `invalid_input` naming the valid index range,
 * an unloaded worker is `not_ready`, and a mismatched loader result is
 * `internal_error`. Worker failures propagate unchanged.
 */
export function createAnalysisTools({
  lensStore,
  analysisDataStore,
  analysisPlotStore,
  proxy,
  imagePoint = "chief_ray",
}: AnalysisWebMcpDependencies): AnalysisTools {
  /** Builds read-only descriptors whose invocation snapshots survive shared async loading. */
  function createPlotTool<K extends ToolPlotKind>({
    name,
    description,
    plotType,
    selectors,
    data: readData,
  }: PlotToolDefinition<K>): WebMCP.ModelContextTool {
    const hasField =
      selectors === "field" ||
      selectors === "both" ||
      selectors === "fieldSamples";
    const hasSamples = selectors === "fieldSamples";
    const sampled = ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS.find(
      (entry) => entry.plotType === plotType,
    )?.plotType;
    const hasWavelength = selectors === "wavelength" || selectors === "both";
    const setting = ANALYSIS_RAY_COUNT_SETTINGS.find(
      (entry) => entry.plotType === plotType,
    );
    return {
      name,
      description: `${description} Uses the current app image reference and sampling settings. Optional selectors default to field 0 and the committed reference wavelength where applicable. ${committedSystemDescription}`,
      inputSchema: plotInputSchemas[selectors],
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.plot[selectors], input);
        assertWebMcpNotCancelled(signal);
        const model = lensStore.getState().committedOpticalModel;
        if (model === undefined) throw noComputedSystem();
        const {
          fieldIndex = 0,
          wavelengthIndex = model.specs.wavelengths.referenceIndex,
          wavelengthSamples: requestedSamples,
        } = input as PlotInput;
        if (hasField)
          assertCommittedIndex(
            "fieldIndex",
            fieldIndex,
            model.specs.field.fields.length,
          );
        if (hasWavelength)
          assertCommittedIndex(
            "wavelengthIndex",
            wavelengthIndex,
            model.specs.wavelengths.weights.length,
          );
        if (proxy === undefined) throw pyodideNotReady(name);
        const { rayCounts, wavelengthSampleCounts: preferredSamples } =
          analysisPlotStore.getState();
        const wavelengthSampleCounts =
          hasSamples && sampled !== undefined && requestedSamples !== undefined
            ? { ...preferredSamples, [sampled]: requestedSamples }
            : preferredSamples;
        const wavelengthSamples =
          sampled === undefined ? undefined : wavelengthSampleCounts[sampled];
        const numRays =
          setting === undefined ? undefined : rayCounts[setting.plotType];
        const wavelengthWeights = model.specs.wavelengths.weights.map(
          ([, weight]) => weight,
        );
        const result = await loadAnalysisPlot({
          proxy,
          model,
          plotType,
          fieldIndex,
          wavelengthIndex,
          imagePoint,
          rayCounts,
          wavelengthSampleCounts,
        });
        assertWebMcpNotCancelled(signal);
        if (result?.kind !== plotType)
          throw new WebMcpToolError(
            "internal_error",
            `No ${plotType} data returned for the committed optical system.`,
          );
        return JSON.stringify({
          // The loader's discriminant is checked above before narrowing the generic result.
          data: readData(
            result as Extract<AnalysisPlotLoadResult, { kind: K }>,
          ),
          ...(hasField ? { fieldIndex } : {}),
          ...(hasWavelength ? { wavelengthIndex } : {}),
          imagePoint,
          numRays,
          ...(wavelengthSamples === undefined ? {} : { wavelengthSamples }),
          ...(result.kind === "spotDiagram"
            ? {
                radii: calculateSpotDiagramRadii(
                  result.spotDiagramData,
                  wavelengthWeights,
                ),
              }
            : {}),
        });
      },
    };
  }

  return {
    getRayFanData: createPlotTool({
      name: "get_ray_fan_data",
      description: "Read complete Ray Fan data for all wavelengths.",
      plotType: "rayFan",
      selectors: "field",
      data: (result) => result.rayFanData,
    }),
    getOpdFanData: createPlotTool({
      name: "get_opd_fan_data",
      description: "Read complete OPD Fan data for all wavelengths.",
      plotType: "opdFan",
      selectors: "field",
      data: (result) => result.opdFanData,
    }),
    getSpotDiagramData: createPlotTool({
      name: "get_spot_diagram_data",
      description:
        "Read complete Spot Diagram points for all wavelengths and unrounded GEO/RMS radii in µm or afocal arcsec using positive committed spectral weights. Radii are omitted when unavailable; point data is preserved.",
      plotType: "spotDiagram",
      selectors: "field",
      data: (result) => result.spotDiagramData,
    }),
    getFieldCurvatureData: createPlotTool({
      name: "get_field_curvature_data",
      description:
        "Read complete sagittal and tangential Field Curvature data.",
      plotType: "fieldCurvature",
      selectors: "wavelength",
      data: (result) => result.fieldCurvatureData,
    }),
    getAstigmatismData: createPlotTool({
      name: "get_astigmatism_data",
      description: "Read complete Astigmatism data across the field.",
      plotType: "astigmatismCurve",
      selectors: "wavelength",
      data: (result) => result.astigmatismCurveData,
    }),
    getLongitudinalSphericalAberrationData: createPlotTool({
      name: "get_longitudinal_spherical_aberration_data",
      description:
        "Read complete Longitudinal Spherical Aberration data for all wavelengths.",
      plotType: "longitudinalSphericalAberration",
      selectors: "none",
      data: (result) => result.longitudinalSphericalAberrationData,
    }),
    getStrehlVsWavelengthData: createPlotTool({
      name: "get_strehl_vs_wavelength_data",
      description:
        "Read complete Strehl vs Wavelength data using the app's Settings wavelength sample count, echoed as wavelengthSamples.",
      plotType: "strehlVsWavelength",
      selectors: "field",
      data: (result) => result.strehlVsWavelengthData,
    }),
    getChromaticFocalShiftData: createPlotTool({
      name: "get_chromatic_focal_shift_data",
      description:
        "Read complete Chromatic Focal Shift data: the real-ray best-focus shift (RMS wavefront) for one field at uniformly sampled wavelengths, relative to the committed reference wavelength, in system length units or diopters of output vergence for afocal image space. The wavelength range matches Strehl vs Wavelength. Failed samples are null.",
      plotType: "chromaticFocalShift",
      selectors: "fieldSamples",
      data: (result) => result.chromaticFocalShiftData,
    }),
    getWavefrontMapData: createPlotTool({
      name: "get_wavefront_map_data",
      description: "Read the complete Wavefront Map grid and units.",
      plotType: "wavefrontMap",
      selectors: "both",
      data: (result) => result.wavefrontMapData,
    }),
    getDiffractionPsfData: createPlotTool({
      name: "get_diffraction_psf_data",
      description: "Read the complete Diffraction PSF grid and units.",
      plotType: "diffractionPSF",
      selectors: "both",
      data: (result) => result.diffractionPsfData,
    }),
    getDiffractionMtfData: createPlotTool({
      name: "get_diffraction_mtf_data",
      description:
        "Read complete measured and ideal Diffraction MTF series, cutoffs, scaling metadata, and units.",
      plotType: "diffractionMTF",
      selectors: "both",
      data: (result) => result.diffractionMtfData,
    }),
    getParaxialData: {
      name: "get_paraxial_data",
      description: `Read the complete first-order data shown by the Paraxial Data dialog. ${committedSystemDescription} ${storedResultDescription}`,
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { firstOrderData, firstOrderDataModel } =
          analysisDataStore.getState();
        const model = lensStore.getState().committedOpticalModel;
        if (
          firstOrderData === undefined ||
          model === undefined ||
          firstOrderDataModel !== model
        )
          throw new WebMcpToolError(
            "precondition_failed",
            "Paraxial data is missing or stale for the current committed optical system. Call recompute_optical_system first.",
          );
        return JSON.stringify(firstOrderData);
      },
    },
    get3rdOrderSeidelData: {
      name: "get_3rd_order_seidel_data",
      description: `Read complete third-order Seidel surfaceBySurface, transverse, wavefront, and curvature data, including surface labels and totals. ${committedSystemDescription} ${storedResultDescription}`,
      inputSchema: emptyInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { seidelData, seidelDataModel } = analysisDataStore.getState();
        const model = lensStore.getState().committedOpticalModel;
        if (
          seidelData === undefined ||
          model === undefined ||
          seidelDataModel !== model
        )
          throw new WebMcpToolError(
            "precondition_failed",
            "Seidel data is missing or stale for the current committed optical system. Call recompute_optical_system first.",
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
        if (model === undefined) throw noComputedSystem();
        const {
          fieldIndex = 0,
          wavelengthIndex = model.specs.wavelengths.referenceIndex,
          ordering = "fringe",
          pupilSpace = "entrance",
        } = input as ZernikeInput;
        assertCommittedIndex(
          "fieldIndex",
          fieldIndex,
          model.specs.field.fields.length,
        );
        assertCommittedIndex(
          "wavelengthIndex",
          wavelengthIndex,
          model.specs.wavelengths.weights.length,
        );
        if (
          pupilSpace === "exit" &&
          Math.abs(model.surfaces.at(-1)?.thickness ?? 0) > 1e8
        ) {
          throw new WebMcpToolError(
            "invalid_input",
            "Invalid input at /pupilSpace: exit pupil requires finite image space. Use entrance for this committed optical system.",
            { path: "/pupilSpace" },
          );
        }
        if (proxy === undefined) throw pyodideNotReady("get_zernike_terms");
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
