/**
 * Describes the Optimization Store module.
 *
 * @remarks
 * ## Internal Structure
 *
 * - `buildOptimizationConfig(catalogs)` is a thin coordinator that delegates optimizer parsing, surface variable/pickup extraction, asphere variable/pickup extraction, glass-pool validation, and merit-function operand assembly to file-local pure helpers in `optimizationStore.ts`.
 * - `buildOptimizationEvaluationConfig(catalogs)` projects a Glass Expert run into bounded `least_squares/trf` evaluation config while retaining the same numeric variables, pickups, and merit operands.
 * - Store-local optimizer and surface-mode helper types derive shared contract fields from `features/optimization/types/optimizationWorkerTypes.ts` via indexed-access / `Extract` types, so the worker-boundary kind unions stay defined in one place. Optimizer form state keeps the shared field names and maps only numeric values to input strings.
 * - Shared optimizer capability lookup stays centralized so radius, thickness, and asphere variable entries all switch between bounded and unbounded config shapes from the selected optimizer's rule set; Glass Expert requires bounds and enables the separate glass mode column.
 * - Every optimizer numeric-field default, label, and validation category is seeded from `features/optimization/lib/optimizerUiConfig.ts`.
 * - Shared validation for bounded variable ranges stays centralized so radius, thickness, and asphere variable entries continue to use the same `min < max` rule and error text when the active method requires bounds.
 * - Surface pickup source-index validation stays centralized so radius and thickness pickups continue to share the same same-surface and out-of-range checks.
 *
 * ## Validation Rules
 *
 * - `max_nfev` must be a positive integer.
 * - For least squares, `ftol`, `xtol`, and `gtol` must be finite positive values greater than `Number.EPSILON`, matching SciPy's double-precision machine-epsilon tolerance guard before the worker is called.
 * - For Differential Evolution, `tol` must be a positive non-zero number and `atol` must be a non-negative number.
 * - Operand `weight` must be a positive non-zero number.
 * - For bounded optimizers such as `trf`, `differential_evolution`, and `glass_expert`, variable `min` and `max` must be numeric, and `min < max`.
 * - For least-squares `lm`, the built config must provide at least as many non-zero-weight residual samples as optimization variables; otherwise `buildOptimizationConfig()` throws before the page tries to evaluate or optimize.
 * - Pickup `source_surface_index` must be in range and must not equal the target surface index.
 * - Asphere coefficient pickups require a coefficient `sourceTermKey`.
 * - Asphere coefficient pickup `source_coefficient_index` must be a non-negative integer so zero-based coefficient slot `0` is allowed.
 * - At least one operand is required before `buildOptimizationConfig()` succeeds.
 * - Each variable glass pool must contain at least one unique live candidate from the supplied catalog snapshot. Special is restricted to CaF2, Fused Silica, Water, and D263TECO.
 * - Non-ModelGlass incumbents must be selected in their own pool. Numeric ModelGlass incumbents retain the backend nearest-real-candidate exception.
 * - Air and `REFL` incumbents cannot be variable glass rows.
 * - `hasNonZeroOptimizationContribution(...)` treats missing `fields` or `wavelengths` as a neutral factor of `1`, and otherwise checks all operand/field/wavelength weight combinations for any product greater than `0`.
 *
 * ## Key Conventions
 *
 * - `surfaceIndex` matches the sequential-model indexing used by Python: first lens surface is `1`; radius modes include the image surface (`surfaces.length + 1`), while thickness modes stop at the last surface row.
 * - `initializeFromOpticalModel()` seeds field weights as `1` for field index `0` and `0` for every remaining field.
 * - `initializeFromOpticalModel()` seeds wavelength weights from `model.specs.wavelengths.weights[*][1]`, matching the editor-page wavelength weights.
 * - `syncFromOpticalModel()` resets field weights to the same `[1, 0, 0, ...]` default only when editor field specs changed since the last baseline.
 * - `syncFromOpticalModel()` resets wavelength weights from `model.specs.wavelengths.weights[*][1]` only when editor wavelength specs changed since the last baseline.
 * - Editor wide-angle mode changes update `optimizationModel.specs.field.isWideAngle` but do not count as field-spec changes for Optimization settings reset purposes.
 * - Editor reference wavelength changes update `optimizationModel.specs.wavelengths.referenceIndex` but do not count as wavelength-spec changes for Optimization settings reset purposes.
 * - `syncFromOpticalModel()` resets radius, thickness, glass, and asphere variable/pickup modes to constants when the computational editor prescription changed with the default `"resetOptimizationModes"` policy. Surface comments are excluded from that fingerprint, so comment-only edits merge into any unapplied local optimized model without replacing its computational values, resetting modes, or clearing result state.
 * - `syncFromOpticalModel()` updates `optimizationModel` and the baseline without clearing prescription modes when the editor prescription changed with `"preserveOptimizationModes"`.
 * - Algorithm settings and operand rows are never reset by editor sync.
 * - The store starts with no operand rows. `addOperand()` appends the default `focal_length` row with target `"100"` and weight `"1"`; switching that row to `opd_difference`, either axis-specific OPD Difference operand, `rms_spot_size`, or `rms_wavefront_error` resets the target to `"0"` without changing the weight.
 * - For preserved prescription sync, `syncFromOpticalModel()` reconciles radius modes, thickness modes, glass modes, and `asphereStates` by index so model-shape-compatible modes survive while new targets receive default constant modes.
 * - `buildOptimizationConfig()` appends asphere variables and pickups alongside radius/thickness entries, using `asphere_kind` plus zero-based `coefficient_index` / `source_coefficient_index` metadata for the Python optimizer.
 * - `buildOptimizationConfig()` emits `min` / `max` for bounded `trf`, `differential_evolution`, and `glass_expert`, and omits `min` / `max` for unbounded `lm` while preserving hidden bound strings in local Zustand state so switching least-squares methods does not discard prior inputs.
 * - Operand metadata is shared through `features/optimization/lib/operandMetadata.ts`, which defines the user label, default target behavior, default operand options, field/wavelength expansion, and nominal least-squares residual multiplicity for each operand kind.
 * - `buildOptimizationConfig()` omits `target` for target-less operands such as `ray_fan`, `ray_fan_tangential`, and `ray_fan_sagittal`.
 * - `buildOptimizationConfig()` also enforces the SciPy `lm` dimension rule using the same shared optimizer-capability helper and the nominal expanded merit-function sample count after combinations with an exactly zero operand, field, or wavelength weight are excluded. `ray_fan` contributes `num_rays * 2` residuals per retained field/wavelength pair, while axis-specific Ray Fan operands contribute `num_rays`; Differential Evolution does not use this least-squares residual-count rule.
 * - `applyOptimizationResult()` can create or update `surface.aspherical` and applies Glass Expert `final_glasses` to Object gap `0` or physical gaps `1..N`. Special results store an empty manufacturer; manufacturer and Custom results store their catalog name.
 * - `syncFromOpticalModel()` clears `hasUnappliedOptimizationResult` when a normal editor sync replaces the Optimization-local snapshot through field, wavelength, or reset-policy prescription changes.
 * - `syncFromOpticalModel()` preserves `hasUnappliedOptimizationResult` during Optimization-origin prescription syncs that use `prescriptionSyncPolicy: "preserveOptimizationModes"`; the apply path clears the marker explicitly after the editor has been updated.
 * - The non-zero contribution helper is intentionally shape-based and does not branch on specific operand kind names, so future operands inherit the check automatically if they use the same config contract.
 * - `RadiusMode`, `RadiusModeDraft`, `GlassMode`, `GlassModeDraft`, `AsphereMode`, `AsphereTermModeDraft`, and `AsphereOptimizationState` remain store-local because they represent UI draft/persisted form state rather than the shared optimization worker contract.
 */
import { type StateCreator } from "zustand";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  GlassOptimizationConfig,
  OptimizationConfig,
  OptimizationAlgorithmConfig,
  GlassCandidateConfig,
  OptimizationOperandKind,
  OptimizationOperandConfig,
  OptimizationPickupConfig,
  OptimizationRunConfig,
  OptimizationRunReport,
  OptimizationValueEntry,
} from "@/features/optimization/types/optimizationWorkerTypes";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { getOptimizationAlgorithmCapabilities } from "@/features/optimization/lib/methodCapabilities";
import { formatOptimizerUiDefaultValue, OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import {
  ELIGIBLE_SPECIAL_GLASS_NAMES,
  getGlassCandidateIdentity,
  getIncumbentGlassCatalog,
  sortGlassCandidates,
} from "@/features/optimization/lib/glassCandidateSelection";
import type { OptimizerNumericFieldValidation } from "@/features/optimization/types/optimizationUiTypes";

type SharedOptimizerConfig = OptimizationAlgorithmConfig;
type SharedSurfaceVariableConfig = Extract<OptimizationConfig["variables"][number], { readonly kind: "radius" | "thickness" }>;
type SharedSurfacePickupConfig = Extract<OptimizationPickupConfig, { readonly kind: "radius" | "thickness" }>;
type OptimizerFormStateByConfig<TConfig extends SharedOptimizerConfig> = {
  readonly [TKey in keyof TConfig]: TConfig[TKey] extends number ? string : TConfig[TKey];
};
type OptimizationAlgorithmState<TConfig extends SharedOptimizerConfig = SharedOptimizerConfig> =
  TConfig extends SharedOptimizerConfig ? OptimizerFormStateByConfig<TConfig> : never;

export type OptimizationPrescriptionSyncPolicy = "resetOptimizationModes" | "preserveOptimizationModes";

interface OptimizationSyncOptions {
  readonly prescriptionSyncPolicy?: OptimizationPrescriptionSyncPolicy;
}

interface EditorSyncBaseline {
  readonly fieldSpecs: string;
  readonly wavelengthSpecs: string;
  readonly prescription: string;
}

export type RadiusMode =
  | { readonly surfaceIndex: number; readonly mode: "constant" }
  | {
      readonly surfaceIndex: number;
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly surfaceIndex: number;
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly scale: string;
      readonly offset: string;
    };

export type RadiusModeDraft =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly scale: string;
      readonly offset: string;
    };

/** Constant or explicit candidate-pool mode for one RayOptics gap index. */
export type GlassMode =
  | { readonly surfaceIndex: number; readonly mode: "constant" }
  | {
      readonly surfaceIndex: number;
      readonly mode: "variable";
      readonly candidates: ReadonlyArray<GlassCandidateConfig>;
    };

/** Modal-local glass mode without the target gap index. */
export type GlassModeDraft =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly candidates: ReadonlyArray<GlassCandidateConfig>;
    };

export type AsphereTermKey = "conic" | "toricSweep" | `coefficient:${number}`;

export type AsphereMode =
  | { readonly mode: "constant" }
  | {
      readonly mode: "variable";
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly sourceSurfaceIndex: string;
      readonly sourceTermKey?: AsphereTermKey;
      readonly scale: string;
      readonly offset: string;
    };

export type AsphereTermModeDraft =
  | {
      readonly mode: "constant";
      readonly coefficientIndex?: number;
    }
  | {
      readonly mode: "variable";
      readonly coefficientIndex?: number;
      readonly min: string;
      readonly max: string;
    }
  | {
      readonly mode: "pickup";
      readonly coefficientIndex?: number;
      readonly sourceSurfaceIndex: string;
      readonly sourceTermKey?: AsphereTermKey;
      readonly scale: string;
      readonly offset: string;
    };

export interface AsphereOptimizationState {
  readonly surfaceIndex: number;
  readonly type: AsphericalType | undefined;
  readonly lockedType: boolean;
  readonly conic: AsphereMode;
  readonly toricSweep: AsphereMode;
  readonly coefficients: ReadonlyArray<AsphereMode>;
}

export interface OptimizationOperandRow {
  readonly id: string;
  readonly kind: OptimizationOperandKind;
  readonly target?: string;
  readonly weight: string;
}

interface RadiusModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface ThicknessModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface AsphereModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

interface GlassModalState {
  readonly open: boolean;
  readonly surfaceIndex: number | undefined;
}

export interface OptimizationState {
  /** Active Optimization page tab. Defaults to `"algorithm"`. */
  activeTabId: string;
  /** Page-local optical-model snapshot seeded from the Editor, or `undefined` before initialization. */
  optimizationModel: OpticalModel | undefined;
  /** Fingerprints of the editor field, wavelength, and prescription state last synchronized into Optimization. */
  editorSyncBaseline: EditorSyncBaseline | undefined;
  /** Optimizer-specific form inputs, with numeric values stored as strings for direct form binding. Defaults to least-squares UI defaults. */
  optimizer: OptimizationAlgorithmState;
  /** Numeric field optimization weights. Initially empty, then seeded as `[1, 0, ...]` from the model. */
  fieldWeights: number[];
  /** Numeric wavelength optimization weights. Initially empty, then seeded from the model's wavelength weights. */
  wavelengthWeights: number[];
  /** Constant, variable, or pickup mode for every non-object radius target, including the image surface. */
  radiusModes: RadiusMode[];
  /** Constant, variable, or pickup mode for every surface-row thickness target. */
  thicknessModes: RadiusMode[];
  /** Constant or explicit candidate-pool mode for Object gap 0 and physical gaps 1..N. */
  glassModes: GlassMode[];
  /** Optimization asphere type and independent term modes for every real surface. */
  asphereStates: AsphereOptimizationState[];
  /** Merit-function operand rows. Defaults to an empty array; target-less kinds store `target: undefined`. */
  operands: OptimizationOperandRow[];
  /** Whether optimization is running and the page-blocking overlay should be shown. Defaults to `false`. */
  isOptimizing: boolean;
  /** Whether the page-local optimized model contains returned values not yet applied to the Editor. Defaults to `false`. */
  hasUnappliedOptimizationResult: boolean;
  /** Last successful continuous or Glass Expert worker report, or `undefined` before a report is applied. */
  lastOptimizationReport: OptimizationRunReport | undefined;
  /** Whether the apply-to-Editor confirmation modal is open. Defaults to `false`. */
  applyConfirmOpen: boolean;
  /** Radius variable/pickup modal state. Defaults to closed without a surface index. */
  radiusModal: RadiusModalState;
  /** Thickness variable/pickup modal state. Defaults to closed without a surface index. */
  thicknessModal: ThicknessModalState;
  /** Asphere variable/pickup modal state. Defaults to closed without a surface index. */
  asphereModal: AsphereModalState;
  /** Glass candidate-pool modal state. Defaults to closed without a gap index. */
  glassModal: GlassModalState;

  /** Seeds Optimization state and its sync baseline only when no local model exists; otherwise only backfills a missing baseline. */
  initializeFromOpticalModel: (model: OpticalModel) => void;
  /** Synchronizes the live Editor model using field, wavelength, and prescription fingerprints, resetting or reconciling dependent modes according to `options`. */
  syncFromOpticalModel: (model: OpticalModel, options?: OptimizationSyncOptions) => void;
  /** Sets the active Optimization page tab. */
  setActiveTabId: (tabId: string) => void;
  /** Normalizes and updates the field weight at `index`; an out-of-range index leaves the array unchanged. */
  setFieldWeight: (index: number, value: string | number) => void;
  /** Normalizes and updates the wavelength weight at `index`; an out-of-range index leaves the array unchanged. */
  setWavelengthWeight: (index: number, value: string | number) => void;
  /** Replaces the matching radius target's constant, variable, or pickup mode. */
  setRadiusMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  /** Replaces the matching thickness target's constant, variable, or pickup mode. */
  setThicknessMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  /** Replaces Object or a physical surface's constant/variable glass mode. */
  setGlassMode: (surfaceIndex: number, mode: GlassModeDraft) => void;
  /** Sets an optimization-only asphere type unless the surface's editor-defined type is locked. */
  setAsphereType: (surfaceIndex: number, type: AsphericalType) => void;
  /** Replaces a surface's full asphere state while preserving its index and any existing type lock. */
  replaceAsphereState: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  /** Replaces one conic, toric-sweep, or coefficient term mode; coefficient drafts default to slot `0` when no index is supplied. */
  setAsphereTermMode: (surfaceIndex: number, term: "conic" | "toricSweep" | "coefficient", mode: AsphereTermModeDraft) => void;
  /** Opens the radius modal for a surface. */
  openRadiusModal: (surfaceIndex: number) => void;
  /** Closes the radius modal and clears its surface index. */
  closeRadiusModal: () => void;
  /** Opens the thickness modal for a surface. */
  openThicknessModal: (surfaceIndex: number) => void;
  /** Closes the thickness modal and clears its surface index. */
  closeThicknessModal: () => void;
  /** Opens the asphere modal for a surface. */
  openAsphereModal: (surfaceIndex: number) => void;
  /** Closes the asphere modal and clears its surface index. */
  closeAsphereModal: () => void;
  /** Opens the glass candidate-pool modal for one gap index. */
  openGlassModal: (surfaceIndex: number) => void;
  /** Closes the glass candidate-pool modal and clears its gap index. */
  closeGlassModal: () => void;
  /** Appends a default focal-length operand with target `"100"` and weight `"1"`. */
  addOperand: () => void;
  /** Deletes the operand with `id`; an unknown ID leaves the rows unchanged. */
  deleteOperand: (id: string) => void;
  /** Patches an operand and applies the new kind's default target behavior when its kind changes. */
  updateOperand: (id: string, patch: Partial<Omit<OptimizationOperandRow, "id">>) => void;
  /** Replaces all operand rows. */
  replaceOperands: (rows: OptimizationOperandRow[]) => void;
  /** Opens the apply-to-Editor confirmation modal. */
  openApplyConfirm: () => void;
  /** Closes the apply-to-Editor confirmation modal. */
  closeApplyConfirm: () => void;
  /** Sets the page-blocking optimization loading flag. */
  setIsOptimizing: (value: boolean) => void;
  /** Clears the unapplied-result marker after the optimized model is applied to the Editor. */
  markOptimizationResultAppliedToEditor: () => void;
  /** Switches optimizer kind and resets all algorithm fields to that kind's UI defaults. */
  setOptimizerKind: (kind: OptimizationAlgorithmState["kind"]) => void;
  /** Validates current UI state and the supplied live catalogs, then builds a continuous or Glass Expert worker run config. */
  buildOptimizationConfig: (catalogs?: AllGlassCatalogsData) => OptimizationRunConfig;
  /** Builds live Operand Evaluation config, projecting Glass Expert to bounded least-squares/trf after the same validation. */
  buildOptimizationEvaluationConfig: (catalogs?: AllGlassCatalogsData) => OptimizationConfig;
  /** Applies returned numeric, pickup, and glass values to the local model, stores the report, and marks non-empty results as unapplied. */
  applyOptimizationResult: (report: OptimizationRunReport) => void;
}

let nextOperandId = 0;

type WeightedFactor = {
  readonly weight: number;
};

function getFactorWeights(factors?: ReadonlyArray<WeightedFactor>): number[] {
  if (factors === undefined || factors.length === 0) {
    return [1];
  }

  return factors.map((factor) => factor.weight);
}

/** Provider-backed Zustand slice for the optimization route. Owns page state including the page-local optical-model snapshot, algorithm inputs, field and wavelength weights, radius variable/pickup selections, operands, loading state, and store-backed modal state. */
export function hasNonZeroOptimizationContribution(
  config: { readonly merit_function: OptimizationConfig["merit_function"] },
): boolean {
  return config.merit_function.operands.some((operand) => {
    const fieldWeights = getFactorWeights(operand.fields);
    const wavelengthWeights = getFactorWeights(operand.wavelengths);

    return fieldWeights.some((fieldWeight) =>
      wavelengthWeights.some((wavelengthWeight) => operand.weight * fieldWeight * wavelengthWeight > 0),
    );
  });
}

function generateOperandId(): string {
  const id = nextOperandId;
  nextOperandId += 1;
  return `operand-${id}`;
}

function getDefaultOperandTarget(kind: OptimizationOperandKind): string | undefined {
  return getOptimizationOperandMetadata(kind).defaultTarget;
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parsePositiveFloat(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive non-zero number.`);
  }
  return parsed;
}

function parseLeastSquaresTolerance(value: string, label: string): number {
  const parsed = parsePositiveFloat(value, label);
  if (parsed <= Number.EPSILON) {
    throw new Error(`${label} must be greater than machine epsilon (${Number.EPSILON}).`);
  }

  return parsed;
}

function parseNonNegativeFloat(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return parsed;
}

function parseOptimizerNumericField(
  value: string,
  label: string,
  validation: OptimizerNumericFieldValidation,
): number {
  switch (validation) {
    case "positiveInteger":
      return parsePositiveInteger(value, label);
    case "positiveFloat":
      return parsePositiveFloat(value, label);
    case "nonNegativeFloat":
      return parseNonNegativeFloat(value, label);
    case "leastSquaresTolerance":
      return parseLeastSquaresTolerance(value, label);
  }
}

function getParsedOptimizerNumericField(
  optimizer: OptimizationState["optimizer"],
  fieldKind: string,
): number {
  const field = OPTIMIZER_UI_CONFIG[optimizer.kind].numericFields.find(
    ({ kind }) => kind === fieldKind,
  );
  if (field === undefined) {
    throw new Error(`Optimizer kind "${optimizer.kind}" does not expose numeric field "${fieldKind}".`);
  }

  const value = (optimizer as unknown as Record<string, string>)[fieldKind];
  return parseOptimizerNumericField(value, field.label, field.validation);
}

function parseFloatValue(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

function normalizeWeight(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

type SurfaceModeKind = SharedSurfaceVariableConfig["kind"] | SharedSurfacePickupConfig["kind"];

type SurfaceModeEntry = RadiusMode & {
  readonly kind: SurfaceModeKind;
};

function parseVariableBounds(minValue: string, maxValue: string): { readonly min: number; readonly max: number } {
  const min = parseFloatValue(minValue, "Min.");
  const max = parseFloatValue(maxValue, "Max.");
  if (min >= max) {
    throw new Error("Variable minimum must be less than maximum.");
  }

  return { min, max };
}

function buildOptimizerConfig(
  optimizer: OptimizationState["optimizer"],
): OptimizationConfig["optimizer"] {
  if (optimizer.kind === "glass_expert") {
    throw new Error("Glass Expert does not use a continuous optimizer config.");
  }

  if (optimizer.kind === "differential_evolution") {
    return {
      kind: optimizer.kind,
      max_nfev: getParsedOptimizerNumericField(optimizer, "max_nfev"),
      tol: getParsedOptimizerNumericField(optimizer, "tol"),
      atol: getParsedOptimizerNumericField(optimizer, "atol"),
    };
  }

  return {
    kind: optimizer.kind,
    method: optimizer.method,
    max_nfev: getParsedOptimizerNumericField(optimizer, "max_nfev"),
    ftol: getParsedOptimizerNumericField(optimizer, "ftol"),
    xtol: getParsedOptimizerNumericField(optimizer, "xtol"),
    gtol: getParsedOptimizerNumericField(optimizer, "gtol"),
  };
}

function buildGlassOptimizerConfig(
  optimizer: Extract<OptimizationState["optimizer"], { readonly kind: "glass_expert" }>,
): NonNullable<GlassOptimizationConfig["glass_optimizer"]> {
  return {
    num_neighbours: getParsedOptimizerNumericField(optimizer, "num_neighbours"),
    maxiter: getParsedOptimizerNumericField(optimizer, "maxiter"),
    tol: getParsedOptimizerNumericField(optimizer, "tol"),
  };
}

function createSurfaceModeEntries(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
): SurfaceModeEntry[] {
  return [
    ...radiusModes.map((mode) => ({ ...mode, kind: "radius" as const })),
    ...thicknessModes.map((mode) => ({ ...mode, kind: "thickness" as const })),
  ];
}

function parseSurfacePickupSourceIndex(
  mode: Extract<SurfaceModeEntry, { mode: "pickup" }>,
  maxIndex: number,
): number {
  const sourceSurfaceIndex = parsePositiveInteger(mode.sourceSurfaceIndex, "Source surface index");
  if (sourceSurfaceIndex === mode.surfaceIndex) {
    throw new Error("Pickup source surface index must not equal the target surface index.");
  }
  if (sourceSurfaceIndex > maxIndex) {
    throw new Error("Pickup source surface index is out of range.");
  }

  return sourceSurfaceIndex;
}

function createVariableConfig(
  canUseBounds: boolean,
  baseVariable: OptimizationConfig["variables"][number],
  minValue: string,
  maxValue: string,
): OptimizationConfig["variables"][number] {
  if (!canUseBounds) {
    return baseVariable;
  }

  const { min, max } = parseVariableBounds(minValue, maxValue);
  return { ...baseVariable, min, max };
}

function buildSurfaceVariables(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
  canUseBounds: boolean,
): OptimizationConfig["variables"] {
  return createSurfaceModeEntries(radiusModes, thicknessModes)
    .filter(
      (
        mode,
      ): mode is Extract<SurfaceModeEntry, { mode: "variable" }> => mode.mode === "variable",
    )
    .map((mode) => createVariableConfig(
      canUseBounds,
      {
        kind: mode.kind,
        surface_index: mode.surfaceIndex,
      },
      mode.min,
      mode.max,
    ));
}

function buildSurfacePickups(
  radiusModes: ReadonlyArray<RadiusMode>,
  thicknessModes: ReadonlyArray<RadiusMode>,
): OptimizationConfig["pickups"] {
  return createSurfaceModeEntries(radiusModes, thicknessModes)
    .filter(
      (
        mode,
      ): mode is Extract<SurfaceModeEntry, { mode: "pickup" }> => mode.mode === "pickup",
    )
    .map((mode) => ({
      kind: mode.kind,
      surface_index: mode.surfaceIndex,
      source_surface_index: parseSurfacePickupSourceIndex(
        mode,
        mode.kind === "radius" ? radiusModes.length : thicknessModes.length,
      ),
      scale: parseFloatValue(mode.scale, "scale"),
      offset: parseFloatValue(mode.offset, "offset"),
    }));
}

function buildAsphereVariables(
  asphereStates: ReadonlyArray<AsphereOptimizationState>,
  canUseBounds: boolean,
): OptimizationConfig["variables"] {
  return asphereStates.flatMap((asphereState) => {
    const type = asphereState.type;
    if (type === undefined) {
      return [];
    }

    const variables: Array<OptimizationConfig["variables"][number]> = [];
    if (asphereState.conic.mode === "variable") {
      variables.push(createVariableConfig(canUseBounds, {
        kind: "asphere_conic_constant",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
      }, asphereState.conic.min, asphereState.conic.max));
    }

    asphereState.coefficients.forEach((coefficientMode, coefficientIndex) => {
      if (coefficientMode.mode !== "variable") {
        return;
      }

      variables.push(createVariableConfig(canUseBounds, {
        kind: "asphere_polynomial_coefficient",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        coefficient_index: coefficientIndex,
      }, coefficientMode.min, coefficientMode.max));
    });

    if ((type === "XToroid" || type === "YToroid") && asphereState.toricSweep.mode === "variable") {
      variables.push(createVariableConfig(canUseBounds, {
        kind: "asphere_toric_sweep_radius",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
      }, asphereState.toricSweep.min, asphereState.toricSweep.max));
    }

    return variables;
  });
}

function buildAspherePickups(
  asphereStates: ReadonlyArray<AsphereOptimizationState>,
): OptimizationConfig["pickups"] {
  return asphereStates.flatMap((asphereState) => {
    const type = asphereState.type;
    if (type === undefined) {
      return [];
    }

    const pickups: Array<OptimizationConfig["pickups"][number]> = [];
    if (asphereState.conic.mode === "pickup") {
      pickups.push({
        kind: "asphere_conic_constant",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        source_surface_index: parsePositiveInteger(asphereState.conic.sourceSurfaceIndex, "Source surface index"),
        scale: parseFloatValue(asphereState.conic.scale, "scale"),
        offset: parseFloatValue(asphereState.conic.offset, "offset"),
      });
    }

    asphereState.coefficients.forEach((coefficientMode, coefficientIndex) => {
      if (coefficientMode.mode !== "pickup") {
        return;
      }

      const sourceTermKey = coefficientMode.sourceTermKey;
      if (sourceTermKey === undefined || !sourceTermKey.startsWith("coefficient:")) {
        throw new Error("Asphere coefficient pickups require a source coefficient term.");
      }

      pickups.push({
        kind: "asphere_polynomial_coefficient",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        coefficient_index: coefficientIndex,
        source_surface_index: parsePositiveInteger(coefficientMode.sourceSurfaceIndex, "Source surface index"),
        source_coefficient_index: parseNonNegativeInteger(sourceTermKey.replace("coefficient:", ""), "Source coefficient index"),
        scale: parseFloatValue(coefficientMode.scale, "scale"),
        offset: parseFloatValue(coefficientMode.offset, "offset"),
      });
    });

    if ((type === "XToroid" || type === "YToroid") && asphereState.toricSweep.mode === "pickup") {
      pickups.push({
        kind: "asphere_toric_sweep_radius",
        surface_index: asphereState.surfaceIndex,
        asphere_kind: type,
        source_surface_index: parsePositiveInteger(asphereState.toricSweep.sourceSurfaceIndex, "Source surface index"),
        scale: parseFloatValue(asphereState.toricSweep.scale, "scale"),
        offset: parseFloatValue(asphereState.toricSweep.offset, "offset"),
      });
    }

    return pickups;
  });
}

function buildMeritFunctionOperands(
  operands: ReadonlyArray<OptimizationOperandRow>,
  fieldWeights: ReadonlyArray<number>,
  wavelengthWeights: ReadonlyArray<number>,
): OptimizationConfig["merit_function"]["operands"] {
  const configOperands: OptimizationOperandConfig[] = operands.map((operand) => {
    const metadata = getOptimizationOperandMetadata(operand.kind);
    const weight = parsePositiveFloat(operand.weight, "Weight");
    const base = metadata.expandsByFieldAndWavelength
      ? {
          kind: operand.kind,
          weight,
          fields: fieldWeights.map((currentWeight, index) => ({ index, weight: currentWeight })),
          wavelengths: wavelengthWeights.map((currentWeight, index) => ({ index, weight: currentWeight })),
          ...(metadata.defaultOptions !== undefined ? { options: metadata.defaultOptions } : {}),
        }
      : {
          kind: operand.kind,
          weight,
          ...(metadata.defaultOptions !== undefined ? { options: metadata.defaultOptions } : {}),
        };

    if (!metadata.requiresTarget) {
      return base;
    }

    return {
      ...base,
      target: parseFloatValue(operand.target ?? "", "Target"),
    };
  });

  if (configOperands.length === 0) {
    throw new Error("At least one operand is required.");
  }

  return configOperands;
}

const ELIGIBLE_SPECIAL_GLASS_NAME_SET = new Set<string>(ELIGIBLE_SPECIAL_GLASS_NAMES);

function getGlassTarget(
  model: OpticalModel,
  surfaceIndex: number,
): Pick<OpticalModel["object"], "medium" | "manufacturer"> {
  if (surfaceIndex === 0) {
    return model.object;
  }

  const surface = model.surfaces[surfaceIndex - 1];
  if (surface === undefined) {
    throw new Error(`Glass variable surface ${surfaceIndex} is out of range.`);
  }
  return surface;
}

function isNumericModelGlass(medium: string): boolean {
  return !Number.isNaN(Number.parseFloat(medium));
}

function buildGlassVariables(
  model: OpticalModel,
  modes: ReadonlyArray<GlassMode>,
  catalogs: AllGlassCatalogsData | undefined,
): GlassOptimizationConfig["glass_variables"] {
  return modes.flatMap((mode) => {
    if (mode.mode !== "variable") {
      return [];
    }
    if (mode.candidates.length === 0) {
      throw new Error(`Glass variable surface ${mode.surfaceIndex} must provide candidates.`);
    }
    if (catalogs === undefined) {
      throw new Error("Glass catalog data is not loaded.");
    }

    const candidates = sortGlassCandidates(mode.candidates);
    const seenCandidates = new Set<string>();
    for (const candidate of candidates) {
      const identity = getGlassCandidateIdentity(candidate);
      if (seenCandidates.has(identity)) {
        throw new Error(`Duplicate glass candidate "${candidate.catalog}: ${candidate.name}".`);
      }
      seenCandidates.add(identity);

      if (candidate.catalog === "Special" && !ELIGIBLE_SPECIAL_GLASS_NAME_SET.has(candidate.name)) {
        throw new Error(`Glass candidate "Special: ${candidate.name}" is not eligible.`);
      }
      if (!Object.prototype.hasOwnProperty.call(catalogs[candidate.catalog] ?? {}, candidate.name)) {
        throw new Error(`Glass candidate "${candidate.catalog}: ${candidate.name}" is unavailable.`);
      }
    }

    const incumbent = getGlassTarget(model, mode.surfaceIndex);
    const incumbentMedium = incumbent.medium.trim();
    if (incumbentMedium.toLowerCase() === "air" || incumbentMedium.toUpperCase() === "REFL") {
      throw new Error(`${incumbent.medium} cannot be optimized as a glass variable at surface ${mode.surfaceIndex}.`);
    }

    if (!isNumericModelGlass(incumbentMedium)) {
      const incumbentCatalog = getIncumbentGlassCatalog(model, mode.surfaceIndex, catalogs);
      if (incumbentCatalog === undefined) {
        throw new Error(
          `Unsupported current material at surface ${mode.surfaceIndex}: ${incumbent.medium}, ${incumbent.manufacturer}`,
        );
      }
      if (!seenCandidates.has(getGlassCandidateIdentity({
        catalog: incumbentCatalog,
        name: incumbent.medium,
      }))) {
        throw new Error(`Current glass must be included in candidates for surface ${mode.surfaceIndex}.`);
      }
    }

    return [{
      surface_index: mode.surfaceIndex,
      candidates,
    }];
  });
}

function countResidualSamples(
  operands: ReadonlyArray<OptimizationConfig["merit_function"]["operands"][number]>,
): number {
  return operands.reduce((count, operand) => {
    if (operand.weight === 0) {
      return count;
    }
    const fieldCount = operand.fields?.filter(({ weight }) => weight !== 0).length ?? 1;
    const wavelengthCount = operand.wavelengths?.filter(({ weight }) => weight !== 0).length ?? 1;
    const perSampleCount = getOptimizationOperandMetadata(operand.kind).getNominalResidualCountPerSample(operand.options);
    return count + (fieldCount * wavelengthCount * perSampleCount);
  }, 0);
}

function createDefaultOperand(): OptimizationOperandRow {
  return {
    id: generateOperandId(),
    kind: "focal_length",
    target: getDefaultOperandTarget("focal_length"),
    weight: "1",
  };
}

function createInitialFieldWeights(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index === 0 ? 1 : 0));
}

function createInitialWavelengthWeights(model: OpticalModel): number[] {
  return model.specs.wavelengths.weights.map(([, weight]) => weight);
}

function reconcileModes(previous: RadiusMode[], next: RadiusMode[]): RadiusMode[] {
  const previousBySurfaceIndex = new Map(
    previous.map((entry) => [entry.surfaceIndex, entry] as const),
  );

  return next.map((entry) => previousBySurfaceIndex.get(entry.surfaceIndex) ?? entry);
}

function createDefaultAsphereMode(): AsphereMode {
  return { mode: "constant" };
}

function padCoefficients(coefficients: number[]): number[] {
  const next = [...coefficients];
  while (next.length < 10) {
    next.push(0);
  }
  return next.slice(0, 10);
}

function trimTrailingZeroCoefficients(coefficients: number[]): number[] {
  let lastNonZero = -1;
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    if (coefficients[index] !== 0) {
      lastNonZero = index;
      break;
    }
  }

  return lastNonZero === -1 ? [] : coefficients.slice(0, lastNonZero + 1);
}

function createAsphereStates(model: OpticalModel): AsphereOptimizationState[] {
  return model.surfaces.map((surface, index) => ({
    surfaceIndex: index + 1,
    type: surface.aspherical?.kind,
    lockedType: surface.aspherical !== undefined,
    conic: createDefaultAsphereMode(),
    toricSweep: createDefaultAsphereMode(),
    coefficients: Array.from({ length: 10 }, createDefaultAsphereMode),
  }));
}

function reconcileAsphereStates(previous: AsphereOptimizationState[], model: OpticalModel): AsphereOptimizationState[] {
  const prevByIndex = new Map(previous.map((state) => [state.surfaceIndex, state] as const));
  return model.surfaces.map((surface, index) => {
    const surfaceIndex = index + 1;
    const prev = prevByIndex.get(surfaceIndex);
    const lockedType = surface.aspherical !== undefined;
    const nextType = lockedType ? surface.aspherical?.kind : prev?.type;
    return {
      surfaceIndex,
      type: nextType,
      lockedType,
      conic: prev?.conic ?? createDefaultAsphereMode(),
      toricSweep: prev?.toricSweep ?? createDefaultAsphereMode(),
      coefficients: prev?.coefficients ?? Array.from({ length: 10 }, createDefaultAsphereMode),
    };
  });
}

function createRadiusModes(model: OpticalModel): RadiusMode[] {
  return [
    ...model.surfaces.map((_, index) => ({
      surfaceIndex: index + 1,
      mode: "constant" as const,
    })),
    { surfaceIndex: model.surfaces.length + 1, mode: "constant" as const },
  ];
}

function createThicknessModes(model: OpticalModel): RadiusMode[] {
  return model.surfaces.map((_, index) => ({
    surfaceIndex: index + 1,
    mode: "constant" as const,
  }));
}

function createGlassModes(model: OpticalModel): GlassMode[] {
  return Array.from({ length: model.surfaces.length + 1 }, (_, surfaceIndex) => ({
    surfaceIndex,
    mode: "constant" as const,
  }));
}

function reconcileGlassModes(previous: GlassMode[], model: OpticalModel): GlassMode[] {
  const previousBySurfaceIndex = new Map(
    previous.map((entry) => [entry.surfaceIndex, entry] as const),
  );
  return createGlassModes(model).map(
    (entry) => previousBySurfaceIndex.get(entry.surfaceIndex) ?? entry,
  );
}

function fingerprintFieldSpecs(model: OpticalModel): string {
  const { isWideAngle: _isWideAngle, ...fieldSpecsAffectingOptimizationSettings } = model.specs.field;
  return JSON.stringify(fieldSpecsAffectingOptimizationSettings);
}

function fingerprintWavelengthSpecs(model: OpticalModel): string {
  const { referenceIndex: _referenceIndex, ...wavelengthSpecsAffectingOptimizationSettings } = model.specs.wavelengths;
  return JSON.stringify(wavelengthSpecsAffectingOptimizationSettings);
}

function fingerprintPrescription(model: OpticalModel): string {
  return JSON.stringify({
    object: model.object,
    image: model.image,
    surfaces: model.surfaces.map(({ comment: _comment, ...surface }) => surface),
  });
}

function mergeEditorCommentsIntoOptimizationModel(
  optimizationModel: OpticalModel,
  editorModel: OpticalModel,
): OpticalModel {
  return {
    ...optimizationModel,
    setAutoAperture: editorModel.setAutoAperture,
    specs: editorModel.specs,
    surfaces: optimizationModel.surfaces.map((surface, index) => {
      const { comment: _comment, ...surfaceWithoutComment } = surface;
      const editorComment = editorModel.surfaces[index]?.comment;
      return editorComment === undefined
        ? surfaceWithoutComment
        : { ...surfaceWithoutComment, comment: editorComment };
    }),
  };
}

function createEditorSyncBaseline(model: OpticalModel): EditorSyncBaseline {
  return {
    fieldSpecs: fingerprintFieldSpecs(model),
    wavelengthSpecs: fingerprintWavelengthSpecs(model),
    prescription: fingerprintPrescription(model),
  };
}

function createDefaultOptimizerState(
  kind: OptimizationAlgorithmState["kind"] = "least_squares",
): OptimizationState["optimizer"] {
  const metadata = OPTIMIZER_UI_CONFIG[kind];
  const numericValues = Object.fromEntries(
    metadata.numericFields.map((field) => [
      field.kind,
      field.validation === "positiveInteger"
        ? String(field.default)
        : formatOptimizerUiDefaultValue(field.default),
    ]),
  );

  if (kind === "glass_expert") {
    return {
      kind,
      num_neighbours: numericValues.num_neighbours,
      maxiter: numericValues.maxiter,
      tol: numericValues.tol,
    };
  }

  if (kind === "differential_evolution") {
    return {
      kind,
      max_nfev: numericValues.max_nfev,
      tol: numericValues.tol,
      atol: numericValues.atol,
    };
  }

  return {
    kind: "least_squares",
    method: OPTIMIZER_UI_CONFIG.least_squares.methods[0].kind,
    max_nfev: numericValues.max_nfev,
    ftol: numericValues.ftol,
    xtol: numericValues.xtol,
    gtol: numericValues.gtol,
  };
}

function ensureSurfaceAsphere(surface: OpticalModel["surfaces"][number], state: AsphereOptimizationState): NonNullable<OpticalModel["surfaces"][number]["aspherical"]> | undefined {
  const existing = surface.aspherical;
  const type = state.type ?? existing?.kind;
  if (type === undefined) {
    return existing;
  }

  if (type === "Conic") {
    return {
      kind: "Conic",
      conicConstant: existing?.conicConstant ?? 0,
    };
  }

  const coefficients = padCoefficients(
    existing !== undefined && "polynomialCoefficients" in existing
      ? existing.polynomialCoefficients
      : [],
  );

  if (type === "XToroid" || type === "YToroid") {
    return {
      kind: type,
      conicConstant: existing?.conicConstant ?? 0,
      toricSweepRadiusOfCurvature:
        existing !== undefined && "toricSweepRadiusOfCurvature" in existing
          ? existing.toricSweepRadiusOfCurvature
          : surface.curvatureRadius,
      polynomialCoefficients: coefficients,
    };
  }

  return {
    kind: type,
    conicConstant: existing?.conicConstant ?? 0,
    polynomialCoefficients: coefficients,
  };
}

function updateAsphereValue(
  surface: OpticalModel["surfaces"][number],
  state: AsphereOptimizationState | undefined,
  entry: OptimizationValueEntry | OptimizationPickupConfig,
  value: number,
): OpticalModel["surfaces"][number] {
  if (!entry.kind.startsWith("asphere_")) {
    return surface;
  }

  const effectiveState: AsphereOptimizationState = state ?? {
    surfaceIndex: 0,
    type: "EvenAspherical",
    lockedType: false,
    conic: createDefaultAsphereMode(),
    toricSweep: createDefaultAsphereMode(),
    coefficients: Array.from({ length: 10 }, createDefaultAsphereMode),
  };
  const baseAsphere = ensureSurfaceAsphere(surface, {
    ...effectiveState,
    type: "asphere_kind" in entry ? entry.asphere_kind : effectiveState.type,
  });

  if (baseAsphere === undefined) {
    return surface;
  }

  if (entry.kind === "asphere_conic_constant") {
    return { ...surface, aspherical: { ...baseAsphere, conicConstant: value } };
  }

  if (entry.kind === "asphere_toric_sweep_radius" && "toricSweepRadiusOfCurvature" in baseAsphere) {
    return { ...surface, aspherical: { ...baseAsphere, toricSweepRadiusOfCurvature: value } };
  }

  if (entry.kind === "asphere_polynomial_coefficient" && "polynomialCoefficients" in baseAsphere) {
    const coefficients = padCoefficients(baseAsphere.polynomialCoefficients);
    coefficients[entry.coefficient_index] = value;
    return {
      ...surface,
      aspherical: { ...baseAsphere, polynomialCoefficients: trimTrailingZeroCoefficients(coefficients) },
    };
  }

  return { ...surface, aspherical: baseAsphere };
}

function applyRadiusToModel(model: OpticalModel, surfaceIndex: number, value: number): OpticalModel {
  if (surfaceIndex === model.surfaces.length + 1) {
    return {
      ...model,
      image: {
        ...model.image,
        curvatureRadius: value,
      },
    };
  }

  const zeroBased = surfaceIndex - 1;
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === zeroBased
        ? { ...surface, curvatureRadius: value }
        : surface,
    ),
  };
}

function applyThicknessToModel(model: OpticalModel, surfaceIndex: number, value: number): OpticalModel {
  const zeroBased = surfaceIndex - 1;
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === zeroBased
        ? { ...surface, thickness: value }
        : surface,
    ),
  };
}

function applyGlassToModel(
  model: OpticalModel,
  entry: Extract<OptimizationRunReport, { readonly final_glasses: unknown }>["final_glasses"][number],
): OpticalModel {
  const manufacturer = entry.catalog === "Special" ? "" : entry.catalog;
  if (entry.surface_index === 0) {
    return {
      ...model,
      object: {
        ...model.object,
        medium: entry.name,
        manufacturer,
      },
    };
  }

  const zeroBased = entry.surface_index - 1;
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === zeroBased
        ? { ...surface, medium: entry.name, manufacturer }
        : surface,
    ),
  };
}

function hasGlassResults(
  report: OptimizationRunReport,
): report is Extract<OptimizationRunReport, { readonly final_glasses: unknown }> {
  return "final_glasses" in report;
}

export const createOptimizationSlice: StateCreator<OptimizationState> = (set, get) => ({
  activeTabId: "algorithm",
  optimizationModel: undefined,
  editorSyncBaseline: undefined,
  optimizer: createDefaultOptimizerState(),
  fieldWeights: [],
  wavelengthWeights: [],
  radiusModes: [],
  thicknessModes: [],
  glassModes: [],
  asphereStates: [],
  operands: [],
  isOptimizing: false,
  hasUnappliedOptimizationResult: false,
  lastOptimizationReport: undefined,
  applyConfirmOpen: false,
  radiusModal: { open: false, surfaceIndex: undefined },
  thicknessModal: { open: false, surfaceIndex: undefined },
  asphereModal: { open: false, surfaceIndex: undefined },
  glassModal: { open: false, surfaceIndex: undefined },

  initializeFromOpticalModel: (model) =>
    set((state) => {
      if (state.optimizationModel !== undefined) {
        return {
          editorSyncBaseline: state.editorSyncBaseline ?? createEditorSyncBaseline(state.optimizationModel),
        };
      }

      return {
        optimizationModel: model,
        editorSyncBaseline: createEditorSyncBaseline(model),
        fieldWeights: createInitialFieldWeights(model.specs.field.fields.length),
        wavelengthWeights: createInitialWavelengthWeights(model),
        radiusModes: createRadiusModes(model),
        thicknessModes: createThicknessModes(model),
        glassModes: createGlassModes(model),
        asphereStates: createAsphereStates(model),
        operands: [],
        lastOptimizationReport: undefined,
        hasUnappliedOptimizationResult: false,
      };
    }),

  syncFromOpticalModel: (model, options) =>
    set((state) => {
      if (state.optimizationModel === undefined) {
        return {
          optimizationModel: model,
          editorSyncBaseline: createEditorSyncBaseline(model),
          fieldWeights: createInitialFieldWeights(model.specs.field.fields.length),
          wavelengthWeights: createInitialWavelengthWeights(model),
          radiusModes: createRadiusModes(model),
          thicknessModes: createThicknessModes(model),
          glassModes: createGlassModes(model),
          asphereStates: createAsphereStates(model),
          operands: [],
          lastOptimizationReport: undefined,
          hasUnappliedOptimizationResult: false,
        };
      }

      const previousBaseline = state.editorSyncBaseline ?? createEditorSyncBaseline(state.optimizationModel);
      const nextBaseline = createEditorSyncBaseline(model);
      const fieldSpecsChanged = previousBaseline.fieldSpecs !== nextBaseline.fieldSpecs;
      const wavelengthSpecsChanged = previousBaseline.wavelengthSpecs !== nextBaseline.wavelengthSpecs;
      const prescriptionChanged = previousBaseline.prescription !== nextBaseline.prescription;
      const shouldResetPrescriptionModes = prescriptionChanged
        && (options?.prescriptionSyncPolicy ?? "resetOptimizationModes") === "resetOptimizationModes";
      const clearsUnappliedOptimizationResult =
        fieldSpecsChanged
        || wavelengthSpecsChanged
        || shouldResetPrescriptionModes;
      const nextOptimizationModel = state.hasUnappliedOptimizationResult
        && !clearsUnappliedOptimizationResult
        && !prescriptionChanged
        ? mergeEditorCommentsIntoOptimizationModel(state.optimizationModel, model)
        : model;

      return {
        optimizationModel: nextOptimizationModel,
        editorSyncBaseline: nextBaseline,
        hasUnappliedOptimizationResult: clearsUnappliedOptimizationResult
          ? false
          : state.hasUnappliedOptimizationResult,
        fieldWeights: fieldSpecsChanged
          ? createInitialFieldWeights(model.specs.field.fields.length)
          : state.fieldWeights,
        wavelengthWeights: wavelengthSpecsChanged
          ? createInitialWavelengthWeights(model)
          : state.wavelengthWeights,
        radiusModes: shouldResetPrescriptionModes
          ? createRadiusModes(model)
          : reconcileModes(state.radiusModes, createRadiusModes(model)),
        thicknessModes: shouldResetPrescriptionModes
          ? createThicknessModes(model)
          : reconcileModes(state.thicknessModes, createThicknessModes(model)),
        glassModes: shouldResetPrescriptionModes
          ? createGlassModes(model)
          : reconcileGlassModes(state.glassModes, model),
        asphereStates: shouldResetPrescriptionModes
          ? createAsphereStates(model)
          : reconcileAsphereStates(state.asphereStates, model),
      };
    }),

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  setFieldWeight: (index, value) =>
    set((state) => ({
      fieldWeights: state.fieldWeights.map((weight, currentIndex) =>
        currentIndex === index ? normalizeWeight(value) : weight,
      ),
    })),

  setWavelengthWeight: (index, value) =>
    set((state) => ({
      wavelengthWeights: state.wavelengthWeights.map((weight, currentIndex) =>
        currentIndex === index ? normalizeWeight(value) : weight,
      ),
    })),

  setRadiusMode: (surfaceIndex, mode) =>
    set((state) => ({
      radiusModes: state.radiusModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { surfaceIndex, ...mode } as RadiusMode
          : entry,
      ),
    })),

  setThicknessMode: (surfaceIndex, mode) =>
    set((state) => ({
      thicknessModes: state.thicknessModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { surfaceIndex, ...mode } as RadiusMode
          : entry,
      ),
    })),

  setGlassMode: (surfaceIndex, mode) =>
    set((state) => ({
      glassModes: state.glassModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { surfaceIndex, ...mode } as GlassMode
          : entry,
      ),
    })),

  setAsphereType: (surfaceIndex, type) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) =>
        entry.surfaceIndex !== surfaceIndex || entry.lockedType
          ? entry
          : { ...entry, type },
      ),
    })),

  replaceAsphereState: (surfaceIndex, nextState) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? { ...nextState, surfaceIndex, lockedType: entry.lockedType || nextState.lockedType }
          : entry,
      ),
    })),

  setAsphereTermMode: (surfaceIndex, term, mode) =>
    set((state) => ({
      asphereStates: state.asphereStates.map((entry) => {
        if (entry.surfaceIndex !== surfaceIndex) {
          return entry;
        }

        if (term === "conic") {
          return { ...entry, conic: mode as AsphereMode };
        }

        if (term === "toricSweep") {
          return { ...entry, toricSweep: mode as AsphereMode };
        }

        const coefficientIndex = mode.coefficientIndex ?? 0;
        return {
          ...entry,
          coefficients: entry.coefficients.map((coefficientMode, index) =>
            index === coefficientIndex ? mode as AsphereMode : coefficientMode,
          ),
        };
      }),
    })),

  openRadiusModal: (surfaceIndex) =>
    set({ radiusModal: { open: true, surfaceIndex } }),

  closeRadiusModal: () =>
    set({ radiusModal: { open: false, surfaceIndex: undefined } }),

  openThicknessModal: (surfaceIndex) =>
    set({ thicknessModal: { open: true, surfaceIndex } }),

  closeThicknessModal: () =>
    set({ thicknessModal: { open: false, surfaceIndex: undefined } }),

  openAsphereModal: (surfaceIndex) =>
    set({ asphereModal: { open: true, surfaceIndex } }),

  closeAsphereModal: () =>
    set({ asphereModal: { open: false, surfaceIndex: undefined } }),

  openGlassModal: (surfaceIndex) =>
    set({ glassModal: { open: true, surfaceIndex } }),

  closeGlassModal: () =>
    set({ glassModal: { open: false, surfaceIndex: undefined } }),

  addOperand: () =>
    set((state) => ({
      operands: [...state.operands, createDefaultOperand()],
    })),

  deleteOperand: (id) =>
    set((state) => ({
      operands: state.operands.filter((operand) => operand.id !== id),
    })),

  updateOperand: (id, patch) =>
    set((state) => ({
      operands: state.operands.map((operand) => {
        if (operand.id !== id) {
          return operand;
        }

        const nextKind = patch.kind ?? operand.kind;
        const nextMetadata = getOptimizationOperandMetadata(nextKind);
        return {
          ...operand,
          ...patch,
          kind: nextKind,
          target:
            patch.kind !== undefined && patch.target === undefined
              ? (nextMetadata.requiresTarget ? getDefaultOperandTarget(nextKind) : undefined)
              : patch.target ?? operand.target,
        };
      }),
    })),

  replaceOperands: (rows) => set({ operands: rows }),

  openApplyConfirm: () => set({ applyConfirmOpen: true }),
  closeApplyConfirm: () => set({ applyConfirmOpen: false }),
  setIsOptimizing: (value) => set({ isOptimizing: value }),
  markOptimizationResultAppliedToEditor: () => set({ hasUnappliedOptimizationResult: false }),
  setOptimizerKind: (kind) => set({ optimizer: createDefaultOptimizerState(kind) }),

  buildOptimizationConfig: (catalogs) => {
    const state = get();
    if (state.optimizationModel === undefined) {
      throw new Error("No optical model available for optimization.");
    }

    const meritOperands = buildMeritFunctionOperands(
      state.operands,
      state.fieldWeights,
      state.wavelengthWeights,
    );
    const capabilities = getOptimizationAlgorithmCapabilities(
      state.optimizer.kind === "least_squares"
        ? { kind: state.optimizer.kind, method: state.optimizer.method }
        : { kind: state.optimizer.kind },
    );
    const variables = [
      ...buildSurfaceVariables(state.radiusModes, state.thicknessModes, capabilities.canUseBounds),
      ...buildAsphereVariables(state.asphereStates, capabilities.canUseBounds),
    ];
    if (
      capabilities.requiresResidualCountAtLeastVariableCount
      && countResidualSamples(meritOperands) < variables.length
    ) {
      throw new Error("Levenberg-Marquardt requires at least as many residuals as variables.");
    }

    const pickups = [
      ...buildSurfacePickups(state.radiusModes, state.thicknessModes),
      ...buildAspherePickups(state.asphereStates),
    ];
    const merit_function = {
      operands: meritOperands,
    };

    if (state.optimizer.kind === "glass_expert") {
      return {
        glass_optimizer: buildGlassOptimizerConfig(state.optimizer),
        glass_variables: buildGlassVariables(
          state.optimizationModel,
          state.glassModes,
          catalogs,
        ),
        variables,
        pickups,
        merit_function,
      };
    }

    return {
      optimizer: buildOptimizerConfig(state.optimizer),
      variables,
      pickups,
      merit_function,
    };
  },

  buildOptimizationEvaluationConfig: (catalogs) => {
    const runConfig = get().buildOptimizationConfig(catalogs);
    if ("optimizer" in runConfig) {
      return runConfig;
    }

    const evaluationOptimizer = createDefaultOptimizerState("least_squares");
    if (evaluationOptimizer.kind !== "least_squares") {
      throw new Error("Unable to build the Glass Expert evaluation optimizer.");
    }
    return {
      optimizer: buildOptimizerConfig(evaluationOptimizer),
      variables: runConfig.variables,
      pickups: runConfig.pickups,
      merit_function: runConfig.merit_function,
    };
  },

  applyOptimizationResult: (report) =>
    set((state) => {
      if (state.optimizationModel === undefined) {
        return state;
      }

      let nextModel = state.optimizationModel;
      for (const entry of report.final_values) {
        if (entry.kind === "radius") {
          nextModel = applyRadiusToModel(nextModel, entry.surface_index, entry.value);
        } else if (entry.kind === "thickness") {
          nextModel = applyThicknessToModel(nextModel, entry.surface_index, entry.value);
        } else {
          const zeroBased = entry.surface_index - 1;
          nextModel = {
            ...nextModel,
            surfaces: nextModel.surfaces.map((surface, index) =>
              index === zeroBased
                ? updateAsphereValue(surface, state.asphereStates.find((asphereState) => asphereState.surfaceIndex === entry.surface_index), entry, entry.value)
                : surface,
            ),
          };
        }
      }
      for (const entry of report.pickups) {
        if (entry.kind === "radius") {
          nextModel = applyRadiusToModel(nextModel, entry.surface_index, entry.value);
        } else if (entry.kind === "thickness") {
          nextModel = applyThicknessToModel(nextModel, entry.surface_index, entry.value);
        } else {
          const zeroBased = entry.surface_index - 1;
          nextModel = {
            ...nextModel,
            surfaces: nextModel.surfaces.map((surface, index) =>
              index === zeroBased
                ? updateAsphereValue(surface, state.asphereStates.find((asphereState) => asphereState.surfaceIndex === entry.surface_index), entry, entry.value)
                : surface,
            ),
          };
        }
      }
      if (hasGlassResults(report)) {
        for (const entry of report.final_glasses) {
          nextModel = applyGlassToModel(nextModel, entry);
        }
      }

      return {
        optimizationModel: nextModel,
        lastOptimizationReport: report,
        hasUnappliedOptimizationResult:
          report.final_values.length > 0
          || report.pickups.length > 0
          || (hasGlassResults(report) && report.final_glasses.length > 0)
            ? true
            : state.hasUnappliedOptimizationResult,
      };
    }),
});
