/**
 * Describes the Optimization Store module.
 *
 * @remarks
 * ## Internal Structure
 *
 * - `buildOptimizationConfig(catalogs)` is a thin coordinator that delegates optimizer parsing, glass-pool validation, and merit-function operand assembly to file-local pure helpers, and constructional-parameter variables/pickups to the generic `buildParameterVariables` / `buildParameterPickups` over `parameterStates`.
 * - `buildOptimizationEvaluationConfig(catalogs)` projects a Glass Expert run into bounded `least_squares/trf` evaluation config while retaining the same numeric variables, pickups, and merit operands.
 * - Store-local optimizer and surface-mode helper types derive shared contract fields from `features/optimization/types/optimizationWorkerTypes.ts` via indexed-access / `Extract` types, so the worker-boundary kind unions stay defined in one place. Optimizer form state keeps the shared field names and maps only numeric values to input strings.
 * - Shared optimizer capability lookup stays centralized so every parameter group's variable entries switch between bounded and unbounded config shapes from the selected optimizer's rule set; Glass Expert requires bounds and enables the separate glass mode column.
 * - Every optimizer numeric-field default, label, and validation category is seeded from `features/optimization/lib/optimizerUiConfig.ts`.
 * - Shared validation for bounded variable ranges stays centralized so every parameter group's variable entries continue to use the same `min < max` rule and error text when the active method requires bounds.
 * - Pickup source validation follows each parameter group's `pickupSourceRule`: radius, thickness, and tilt/decenter reject same-surface and out-of-range sources, while asphere pickups require a positive source index (coefficients may pick up another coefficient on the same surface). Tilt/decenter pickups carry their coordinate strategy in every worker entry.
 *
 * ## Validation Rules
 *
 * - `max_nfev` must be a positive integer.
 * - For least squares, `ftol`, `xtol`, and `gtol` must be finite positive values greater than `Number.EPSILON`, matching SciPy's double-precision machine-epsilon tolerance guard before the worker is called.
 * - For Differential Evolution, `tol` must be a positive non-zero number and `atol` must be a non-negative number.
 * - Operand `weight` must be a positive non-zero number.
 * - Range operands need at least one non-blank bound (a blank `min` / `max` means unbounded on that side) and `min <= max`; positive-bound kinds such as Edge Thickness also require every supplied bound to be a positive number. Range error messages are prefixed with the operand label, e.g. `Edge Thickness: Min must be a positive number.`
 * - Surface-only operands such as Edge Thickness require an integer `surfaceIndex` from `1` to the model's real surface count (object and image excluded): `Edge Thickness: Surface Index is required.` / `Edge Thickness: Surface Index must be an integer from 1 to N.` System-or-surface operands (the third-order aberrations) treat an undefined `surfaceIndex` as the System scope and validate a supplied one the same way, e.g. `3rd-Order Coma (W131): Surface Index must be an integer from 1 to N.`
 * - For bounded optimizers such as `trf`, `differential_evolution`, and `glass_expert`, variable `min` and `max` must be numeric, and `min < max`.
 * - For least-squares `lm`, the built config must provide at least as many non-zero-weight residual samples as optimization variables; otherwise `buildOptimizationConfig()` throws before the page tries to evaluate or optimize.
 * - For least-squares `lm` with at least one variable, `max_nfev` must be at least 2, because MINPACK always evaluates one trial step after the initial point; otherwise `buildOptimizationConfig()` throws before the worker is called.
 * - For Differential Evolution with at least one variable, `max_nfev` must cover one full SciPy population, `max(5, 15 * variableCount)`, because SciPy always evaluates the whole initial population; otherwise `buildOptimizationConfig()` throws before the worker is called.
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
 * - The store starts with no operand rows. `addOperand()` appends the default `focal_length` row with target `"100"` and weight `"1"`; switching that row to `opd_difference`, either axis-specific OPD Difference operand, `rms_spot_size`, or `rms_wavefront_error` resets the target to `"0"` without changing the weight. Any kind change resets `target` to the new kind's default target and `min` / `max` to its default range, leaving them `undefined` when the new kind has none, and clears `surfaceIndex` unless the same patch supplies one, so a row switched to Edge Thickness starts with `min: "3"`, no `max`, and no surface index, and a row switched to a third-order aberration kind starts with target `"0"` at the System scope. A patch without a kind change may set or clear (`undefined`) `surfaceIndex`.
 * - For preserved prescription sync, `syncFromOpticalModel()` reconciles radius, thickness, glass, asphere, and tilt/decenter modes by index so model-shape-compatible modes survive while new targets receive default constant modes.
 * - `buildOptimizationConfig()` appends asphere variables and pickups alongside radius/thickness entries, using `asphere_kind` plus zero-based `coefficient_index` / `source_coefficient_index` metadata for the Python optimizer.
 * - `buildOptimizationConfig()` emits `min` / `max` for bounded `trf`, `differential_evolution`, and `glass_expert`, and omits `min` / `max` for unbounded `lm` while preserving hidden bound strings in local Zustand state so switching least-squares methods does not discard prior inputs.
 * - Operand metadata is shared through `features/optimization/lib/operandMetadata.ts`, which defines the user label, target mode (`goal`) with its default target or default range, default operand options, field/wavelength expansion, and nominal least-squares residual multiplicity for each operand kind.
 * - `buildOptimizationConfig()` narrows each row by kind group: adjustable-target kinds emit a parsed `target`; fixed-target operands such as `ray_fan`, `ray_fan_tangential`, and `ray_fan_sagittal` omit their implicit zero target; range kinds emit the non-blank `min` / `max` bounds and reject rows with no bound or `min > max`; surface-range kinds such as `edge_thickness` additionally emit their validated `surface_index` and, because they do not expand by field or wavelength, no `fields` / `wavelengths`; system-or-surface adjustable-target kinds such as `third_order_coma` emit a validated `surface_index` only when the row selects a surface, and none at the System scope. The exhaustive fallback fails compilation if a new target mode is added without a builder branch.
 * - `buildOptimizationConfig()` also enforces the SciPy `lm` dimension rule using the same shared optimizer-capability helper and the nominal expanded merit-function sample count after combinations with an exactly zero operand, field, or wavelength weight are excluded. `ray_fan` contributes `num_rays * 2` residuals per retained field/wavelength pair, while axis-specific Ray Fan operands contribute `num_rays`; Differential Evolution does not use this least-squares residual-count rule.
 * - `setOptimizationConfig()` atomically adapts a strict worker config into the string-backed form state, normalizes shared field/wavelength vectors, preserves operand options, and leaves the page-local model, sync baseline, prior report, and unapplied-result marker untouched.
 * - `applyOptimizationResult()` writes every final value and then every pickup value through `applyParameterValue` (the owning constructional-parameter shape), which can create or update `surface.aspherical` and surface/Image `decenter` while preserving untouched tilt/decenter components; it then applies Glass Expert `final_glasses` to Object gap `0` or physical gaps `1..N`.
 * - Coefficient modes on a `Conic` asphere state are ignored when building variables and pickups, because a Conic asphere carries no polynomial coefficients.
 * - `syncFromOpticalModel()` clears `hasUnappliedOptimizationResult` when a normal editor sync replaces the Optimization-local snapshot through field, wavelength, or reset-policy prescription changes.
 * - `syncFromOpticalModel()` preserves `hasUnappliedOptimizationResult` during Optimization-origin prescription syncs that use `prescriptionSyncPolicy: "preserveOptimizationModes"`; the apply path clears the marker explicitly after the editor has been updated.
 * - `discardOptimizationResult(editorModel)` replaces the page-local model and sync baseline with the supplied Editor model, clears the unapplied marker and last report, and reconciles prescription modes by index like a preserved sync. Algorithm settings, weights, and operands are unchanged, and the Editor itself is never mutated.
 * - The non-zero contribution helper is intentionally shape-based and does not branch on specific operand kind names, so future operands inherit the check automatically if they use the same config contract.
 * - `GlassMode` and `GlassModeDraft` remain store-local UI form state. Constructional-parameter modes live in `parameterStates` (`lib/parameters/parameterStates.ts`): one `ParameterGroupState` per surface and group with a qualifier (asphere kind or decenter strategy), its editor lock, and a `ParameterMode` per component key. One `parameterModal` tracks the open radius, thickness, asphere, or tilt/decenter variable/pickup modal.
 */
import type { StateCreator } from "zustand";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import type {
  GlassOptimizationConfig,
  OptimizationConfig,
  OptimizationAlgorithmConfig,
  GlassCandidateConfig,
  OptimizationOperandKind,
  OptimizationOperandConfig,
  OptimizationOperandRange,
  OptimizationRunConfig,
  OptimizationRunReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import { applyParameterValue } from "@/shared/lib/optical-model/surface-properties/parameters";
import type { OptimizationOperandOptions } from "@/features/optimization/types/optimizationOperandTypes";
import { adaptOptimizationRunConfigToGuiState } from "@/features/optimization/lib/optimizationConfigAdapter";
import {
  parseFloatValue,
  parsePositiveInteger,
} from "@/features/optimization/lib/formParsing";
import {
  buildParameterPickups,
  buildParameterVariables,
} from "@/features/optimization/lib/parameters/buildParameterConfigs";
import type {
  ParameterGroupKey,
  ParameterQualifierByGroup,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  createParameterStates,
  EMPTY_PARAMETER_STATES,
  reconcileParameterStates,
  withParameterMode,
  type ParameterGroupState,
  type ParameterMode,
  type ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";

export type {
  ParameterGroupState,
  ParameterMode,
  ParameterStates,
} from "@/features/optimization/lib/parameters/parameterStates";
import {
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
  isOptimizationSurfaceRangeOperandKind,
  isOptimizationSystemOrSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";
import { getOptimizationAlgorithmCapabilities } from "@/features/optimization/lib/methodCapabilities";
import {
  formatOptimizerUiDefaultValue,
  OPTIMIZER_UI_CONFIG,
} from "@/features/optimization/lib/optimizerUiConfig";
import {
  ELIGIBLE_SPECIAL_GLASS_NAMES,
  getGlassCandidateIdentity,
  getIncumbentGlassCatalog,
  sortGlassCandidates,
} from "@/features/optimization/lib/glassCandidateSelection";
import type { OptimizerNumericFieldValidation } from "@/features/optimization/types/optimizationUiTypes";

type SharedOptimizerConfig = OptimizationAlgorithmConfig;
type OptimizerFormStateByConfig<TConfig extends SharedOptimizerConfig> = {
  readonly [TKey in keyof TConfig]: TConfig[TKey] extends number
    ? string
    : TConfig[TKey];
};
type OptimizationAlgorithmState<
  TConfig extends SharedOptimizerConfig = SharedOptimizerConfig,
> = TConfig extends SharedOptimizerConfig
  ? OptimizerFormStateByConfig<TConfig>
  : never;

export type OptimizationPrescriptionSyncPolicy =
  | "resetOptimizationModes"
  | "preserveOptimizationModes";

interface OptimizationSyncOptions {
  readonly prescriptionSyncPolicy?: OptimizationPrescriptionSyncPolicy;
}

interface EditorSyncBaseline {
  readonly fieldSpecs: string;
  readonly wavelengthSpecs: string;
  readonly prescription: string;
}

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

/** String-backed operand form row; which target fields apply is decided by the kind's metadata `goal`. */
export interface OptimizationOperandRow {
  readonly id: string;
  readonly kind: OptimizationOperandKind;
  /** User-supplied target; set only for adjustable-target kinds. */
  readonly target?: string;
  /** Inclusive lower bound text for range kinds; blank or absent means unbounded below. */
  readonly min?: string;
  /** Inclusive upper bound text for range kinds; blank or absent means unbounded above. */
  readonly max?: string;
  /** 1-based surface index (object and image excluded); used only by kinds accepting a surface, where `undefined` means the System scope for system-or-surface kinds and unset for surface-only kinds. */
  readonly surfaceIndex?: number;
  readonly weight: string;
  /** Optional public worker sampling settings, including non-default Ray Fan counts. */
  readonly options?: OptimizationOperandOptions;
}

/** Which parameter group's constant/variable/pickup modal is open, and for which surface. */
interface ParameterModalState {
  readonly open: boolean;
  readonly group: ParameterGroupKey | undefined;
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
  /** Constant, variable, or pickup modes of every constructional parameter, per group and surface (radius and tilt/decenter include the image plane). */
  parameterStates: ParameterStates;
  /** Constant or explicit candidate-pool mode for Object gap 0 and physical gaps 1..N. */
  glassModes: GlassMode[];
  /** Merit-function operand rows. Defaults to an empty array; fixed-target and range kinds store `target: undefined`, and only range kinds store `min` / `max`. */
  operands: OptimizationOperandRow[];
  /** Whether optimization is running and the page-blocking overlay should be shown. Defaults to `false`. */
  isOptimizing: boolean;
  /** Whether the page-local optimized model contains returned values not yet applied to the Editor. Defaults to `false`. */
  hasUnappliedOptimizationResult: boolean;
  /** Last successful continuous or Glass Expert worker report, or `undefined` before a report is applied. */
  lastOptimizationReport: OptimizationRunReport | undefined;
  /** Whether the apply-to-Editor confirmation modal is open. Defaults to `false`. */
  applyConfirmOpen: boolean;
  /** Whether the discard-optimization-result confirmation modal is open. Defaults to `false`. */
  discardConfirmOpen: boolean;
  /** Parameter-group variable/pickup modal state. Defaults to closed without a group or surface index. */
  parameterModal: ParameterModalState;
  /** Glass candidate-pool modal state. Defaults to closed without a gap index. */
  glassModal: GlassModalState;

  /** Seeds Optimization state and its sync baseline only when no local model exists; otherwise only backfills a missing baseline. */
  initializeFromOpticalModel: (model: OpticalModel) => void;
  /** Synchronizes the live Editor model using field, wavelength, and prescription fingerprints, resetting or reconciling dependent modes according to `options`. */
  syncFromOpticalModel: (
    model: OpticalModel,
    options?: OptimizationSyncOptions,
  ) => void;
  /** Sets the active Optimization page tab. */
  setActiveTabId: (tabId: string) => void;
  /** Normalizes and updates the field weight at `index`; an out-of-range index leaves the array unchanged. */
  setFieldWeight: (index: number, value: string | number) => void;
  /** Normalizes and updates the wavelength weight at `index`; an out-of-range index leaves the array unchanged. */
  setWavelengthWeight: (index: number, value: string | number) => void;
  /** Replaces one component's mode on one surface of a parameter group. */
  setParameterMode: <TGroup extends ParameterGroupKey>(
    group: TGroup,
    surfaceIndex: number,
    componentKey: string,
    mode: ParameterMode,
  ) => void;
  /** Replaces Object or a physical surface's constant/variable glass mode. */
  setGlassMode: (surfaceIndex: number, mode: GlassModeDraft) => void;
  /** Sets an optimization-only qualifier (asphere kind or decenter strategy) unless the editor locks it; modes are kept. */
  setParameterQualifier: <TGroup extends ParameterGroupKey>(
    group: TGroup,
    surfaceIndex: number,
    qualifier: ParameterQualifierByGroup[TGroup],
  ) => void;
  /** Replaces one surface's full group state, preserving its index and any existing qualifier lock. */
  replaceParameterState: <TGroup extends ParameterGroupKey>(
    group: TGroup,
    surfaceIndex: number,
    state: ParameterGroupState<TGroup>,
  ) => void;
  /** Opens a parameter group's variable/pickup modal for a surface. */
  openParameterModal: (group: ParameterGroupKey, surfaceIndex: number) => void;
  /** Closes the parameter modal and clears its group and surface index. */
  closeParameterModal: () => void;
  /** Opens the glass candidate-pool modal for one gap index. */
  openGlassModal: (surfaceIndex: number) => void;
  /** Closes the glass candidate-pool modal and clears its gap index. */
  closeGlassModal: () => void;
  /** Appends a default focal-length operand with target `"100"` and weight `"1"`. */
  addOperand: () => void;
  /** Deletes the operand with `id`; an unknown ID leaves the rows unchanged. */
  deleteOperand: (id: string) => void;
  /** Patches an operand and applies the new kind's default target behavior when its kind changes. */
  updateOperand: (
    id: string,
    patch: Partial<Omit<OptimizationOperandRow, "id">>,
  ) => void;
  /** Replaces all operand rows. */
  replaceOperands: (rows: OptimizationOperandRow[]) => void;
  /** Atomically replaces all optimizer, target-mode, operand, and shared-weight configuration from a worker config. */
  setOptimizationConfig: (
    config: OptimizationRunConfig,
    catalogs?: AllGlassCatalogsData,
  ) => void;
  /** Opens the apply-to-Editor confirmation modal. */
  openApplyConfirm: () => void;
  /** Closes the apply-to-Editor confirmation modal. */
  closeApplyConfirm: () => void;
  /** Sets the page-blocking optimization loading flag. */
  setIsOptimizing: (value: boolean) => void;
  /** Clears the unapplied-result marker after the optimized model is applied to the Editor. */
  markOptimizationResultAppliedToEditor: () => void;
  /** Opens the discard-optimization-result confirmation modal. */
  openDiscardConfirm: () => void;
  /** Closes the discard-optimization-result confirmation modal. */
  closeDiscardConfirm: () => void;
  /**
   * Restores the page-local model from `editorModel`, preserving compatible prescription modes, and clears the unapplied marker and last report.
   * Throws while an optimization run is active. Returns whether a result was pending before the call.
   */
  discardOptimizationResult: (editorModel: OpticalModel) => {
    readonly hadUnappliedResult: boolean;
  };
  /** Switches optimizer kind and resets all algorithm fields to that kind's UI defaults. */
  setOptimizerKind: (kind: OptimizationAlgorithmState["kind"]) => void;
  /** Validates current UI state and the supplied live catalogs, then builds a continuous or Glass Expert worker run config. */
  buildOptimizationConfig: (
    catalogs?: AllGlassCatalogsData,
  ) => OptimizationRunConfig;
  /** Builds live Operand Evaluation config, projecting Glass Expert to bounded least-squares/trf after the same validation. */
  buildOptimizationEvaluationConfig: (
    catalogs?: AllGlassCatalogsData,
  ) => OptimizationConfig;
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
export function hasNonZeroOptimizationContribution(config: {
  readonly merit_function: OptimizationConfig["merit_function"];
}): boolean {
  return config.merit_function.operands.some((operand) => {
    const fieldWeights = getFactorWeights(operand.fields);
    const wavelengthWeights = getFactorWeights(operand.wavelengths);

    return fieldWeights.some((fieldWeight) =>
      wavelengthWeights.some(
        (wavelengthWeight) =>
          operand.weight * fieldWeight * wavelengthWeight > 0,
      ),
    );
  });
}

function generateOperandId(): string {
  const id = nextOperandId;
  nextOperandId += 1;
  return `operand-${id}`;
}

/** Returns an adjustable-target kind's default target text, or `undefined` for other target modes. */
function getDefaultOperandTarget(
  kind: OptimizationOperandKind,
): string | undefined {
  return getOptimizationOperandMetadata(kind).defaultTarget;
}

/** Returns a range kind's default bound texts, or unset bounds for other target modes. */
function getDefaultOperandRange(kind: OptimizationOperandKind): {
  readonly min?: string;
  readonly max?: string;
} {
  const { defaultRange } = getOptimizationOperandMetadata(kind);
  return { min: defaultRange?.min, max: defaultRange?.max };
}

/**
 * Parses one non-blank range bound. Positive-bound kinds such as Edge Thickness
 * reject zero, negative, and non-numeric text with one positivity message.
 */
function parseOperandRangeBound(
  value: string | undefined,
  bound: "Min" | "Max",
  label: string,
  requiresPositive: boolean,
): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  if (requiresPositive && !(Number.isFinite(parsed) && parsed > 0)) {
    throw new Error(`${label}: ${bound} must be a positive number.`);
  }
  return parseFloatValue(value, `${label}: ${bound}`);
}

/**
 * Parses a range row's non-blank `min` / `max` texts into a worker range. Error
 * messages are prefixed with the operand label, e.g. `Edge Thickness: Min must not exceed Max.`
 *
 * @throws If neither bound is supplied, a bound is not a number (or not positive when
 * `requiresPositive`), or `min` exceeds `max`.
 */
function parseOperandRange(
  operand: OptimizationOperandRow,
  label: string,
  requiresPositive: boolean,
): OptimizationOperandRange {
  const min = parseOperandRangeBound(
    operand.min,
    "Min",
    label,
    requiresPositive,
  );
  const max = parseOperandRangeBound(
    operand.max,
    "Max",
    label,
    requiresPositive,
  );
  if (min !== undefined && max !== undefined) {
    if (min > max) {
      throw new Error(`${label}: Min must not exceed Max.`);
    }
    return { min, max };
  }
  if (min !== undefined) {
    return { min };
  }
  if (max !== undefined) {
    return { max };
  }
  throw new Error(`${label}: At least one of Min or Max is required.`);
}

/**
 * Validates a row's 1-based surface index against the model's real surfaces
 * (`1 … surfaceCount`; object and image excluded). Called for surface-only rows
 * and for system-or-surface rows that select a surface.
 *
 * @throws If the index is missing, not an integer, or out of range.
 */
function parseOperandSurfaceIndex(
  surfaceIndex: number | undefined,
  label: string,
  surfaceCount: number,
): number {
  if (surfaceIndex === undefined) {
    throw new Error(`${label}: Surface Index is required.`);
  }
  if (
    !Number.isInteger(surfaceIndex) ||
    surfaceIndex < 1 ||
    surfaceIndex > surfaceCount
  ) {
    throw new Error(
      `${label}: Surface Index must be an integer from 1 to ${surfaceCount}.`,
    );
  }
  return surfaceIndex;
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
    throw new Error(
      `${label} must be greater than machine epsilon (${Number.EPSILON}).`,
    );
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
    throw new Error(
      `Optimizer kind "${optimizer.kind}" does not expose numeric field "${fieldKind}".`,
    );
  }

  const value = (optimizer as unknown as Record<string, string>)[fieldKind];
  return parseOptimizerNumericField(value, field.label, field.validation);
}

function normalizeWeight(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
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

/** SciPy's default `popsize`; the UI never overrides it for Differential Evolution. */
const DIFFERENTIAL_EVOLUTION_POPSIZE = 15;
/** SciPy raises any smaller Differential Evolution population to this size. */
const DIFFERENTIAL_EVOLUTION_MIN_POPULATION = 5;

/**
 * Rejects a Differential Evolution step budget that cannot cover SciPy's first population.
 *
 * SciPy always evaluates the whole initial population of
 * `max(5, popsize * variableCount)` members, so a smaller `max_nfev` would overshoot.
 * UI bounds always satisfy `min < max`, so no variable is excluded as equal-bounded.
 * Runs without variables skip SciPy and are not checked.
 */
function assertDifferentialEvolutionBudget(
  optimizer: OptimizationConfig["optimizer"],
  variableCount: number,
): void {
  if (optimizer.kind !== "differential_evolution" || variableCount === 0) {
    return;
  }
  const population = Math.max(
    DIFFERENTIAL_EVOLUTION_MIN_POPULATION,
    DIFFERENTIAL_EVOLUTION_POPSIZE * variableCount,
  );
  if (optimizer.max_nfev < population) {
    throw new Error(
      `Differential Evolution requires Max. num of steps of at least ${population} (one full population for ${variableCount} ${variableCount === 1 ? "variable" : "variables"}).`,
    );
  }
}

/** MINPACK always evaluates one trial step after the initial point. */
const LEVENBERG_MARQUARDT_MIN_STEPS = 2;

/**
 * Rejects a Levenberg-Marquardt step budget that SciPy's MINPACK backend would overshoot.
 *
 * Runs without variables skip SciPy and are not checked.
 */
function assertLevenbergMarquardtBudget(
  optimizer: OptimizationConfig["optimizer"],
  variableCount: number,
): void {
  if (
    optimizer.kind !== "least_squares" ||
    optimizer.method !== "lm" ||
    variableCount === 0
  ) {
    return;
  }
  if (optimizer.max_nfev < LEVENBERG_MARQUARDT_MIN_STEPS) {
    throw new Error(
      `Levenberg-Marquardt requires Max. num of steps of at least ${LEVENBERG_MARQUARDT_MIN_STEPS}.`,
    );
  }
}

function buildGlassOptimizerConfig(
  optimizer: Extract<
    OptimizationState["optimizer"],
    { readonly kind: "glass_expert" }
  >,
): NonNullable<GlassOptimizationConfig["glass_optimizer"]> {
  return {
    num_neighbours: getParsedOptimizerNumericField(optimizer, "num_neighbours"),
    maxiter: getParsedOptimizerNumericField(optimizer, "maxiter"),
    tol: getParsedOptimizerNumericField(optimizer, "tol"),
  };
}

function buildMeritFunctionOperands(
  operands: ReadonlyArray<OptimizationOperandRow>,
  fieldWeights: ReadonlyArray<number>,
  wavelengthWeights: ReadonlyArray<number>,
  surfaceCount: number,
): OptimizationConfig["merit_function"]["operands"] {
  const configOperands: OptimizationOperandConfig[] = operands.map(
    (operand): OptimizationOperandConfig => {
      const { kind } = operand;
      const metadata = getOptimizationOperandMetadata(kind);
      const weight = parsePositiveFloat(operand.weight, "Weight");
      const base = metadata.expandsByFieldAndWavelength
        ? {
            weight,
            fields: fieldWeights.map((currentWeight, index) => ({
              index,
              weight: currentWeight,
            })),
            wavelengths: wavelengthWeights.map((currentWeight, index) => ({
              index,
              weight: currentWeight,
            })),
            ...((operand.options ?? metadata.defaultOptions) !== undefined
              ? { options: operand.options ?? metadata.defaultOptions }
              : {}),
          }
        : {
            weight,
            ...((operand.options ?? metadata.defaultOptions) !== undefined
              ? { options: operand.options ?? metadata.defaultOptions }
              : {}),
          };

      if (isOptimizationAdjustableTargetOperandKind(kind)) {
        const target = parseFloatValue(operand.target ?? "", "Target");
        if (
          isOptimizationSystemOrSurfaceOperandKind(kind) &&
          operand.surfaceIndex !== undefined
        ) {
          return {
            ...base,
            kind,
            target,
            surface_index: parseOperandSurfaceIndex(
              operand.surfaceIndex,
              metadata.label,
              surfaceCount,
            ),
          };
        }
        return { ...base, kind, target };
      }
      if (isOptimizationFixedTargetOperandKind(kind)) {
        return { ...base, kind };
      }
      if (isOptimizationRangeOperandKind(kind)) {
        return {
          ...base,
          kind,
          ...parseOperandRange(
            operand,
            metadata.label,
            metadata.requiresPositiveBounds === true,
          ),
        };
      }
      if (isOptimizationSurfaceRangeOperandKind(kind)) {
        return {
          ...base,
          kind,
          surface_index: parseOperandSurfaceIndex(
            operand.surfaceIndex,
            metadata.label,
            surfaceCount,
          ),
          ...parseOperandRange(
            operand,
            metadata.label,
            metadata.requiresPositiveBounds === true,
          ),
        };
      }
      // Every target mode is handled above; this fails to compile if a new mode is added.
      throw new Error(
        `Unsupported operand kind: ${String(kind satisfies never)}`,
      );
    },
  );

  if (configOperands.length === 0) {
    throw new Error("At least one operand is required.");
  }

  return configOperands;
}

const ELIGIBLE_SPECIAL_GLASS_NAME_SET = new Set<string>(
  ELIGIBLE_SPECIAL_GLASS_NAMES,
);

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
      throw new Error(
        `Glass variable surface ${mode.surfaceIndex} must provide candidates.`,
      );
    }
    if (catalogs === undefined) {
      throw new Error("Glass catalog data is not loaded.");
    }

    const candidates = sortGlassCandidates(mode.candidates);
    const seenCandidates = new Set<string>();
    for (const candidate of candidates) {
      const identity = getGlassCandidateIdentity(candidate);
      if (seenCandidates.has(identity)) {
        throw new Error(
          `Duplicate glass candidate "${candidate.catalog}: ${candidate.name}".`,
        );
      }
      seenCandidates.add(identity);

      if (
        candidate.catalog === "Special" &&
        !ELIGIBLE_SPECIAL_GLASS_NAME_SET.has(candidate.name)
      ) {
        throw new Error(
          `Glass candidate "Special: ${candidate.name}" is not eligible.`,
        );
      }
      if (!Object.hasOwn(catalogs[candidate.catalog] ?? {}, candidate.name)) {
        throw new Error(
          `Glass candidate "${candidate.catalog}: ${candidate.name}" is unavailable.`,
        );
      }
    }

    const incumbent = getGlassTarget(model, mode.surfaceIndex);
    const incumbentMedium = incumbent.medium.trim();
    if (
      incumbentMedium.toLowerCase() === "air" ||
      incumbentMedium.toUpperCase() === "REFL"
    ) {
      throw new Error(
        `${incumbent.medium} cannot be optimized as a glass variable at surface ${mode.surfaceIndex}.`,
      );
    }

    if (!isNumericModelGlass(incumbentMedium)) {
      const incumbentCatalog = getIncumbentGlassCatalog(
        model,
        mode.surfaceIndex,
        catalogs,
      );
      if (incumbentCatalog === undefined) {
        throw new Error(
          `Unsupported current material at surface ${mode.surfaceIndex}: ${incumbent.medium}, ${incumbent.manufacturer}`,
        );
      }
      if (
        !seenCandidates.has(
          getGlassCandidateIdentity({
            catalog: incumbentCatalog,
            name: incumbent.medium,
          }),
        )
      ) {
        throw new Error(
          `Current glass must be included in candidates for surface ${mode.surfaceIndex}.`,
        );
      }
    }

    return [
      {
        surface_index: mode.surfaceIndex,
        candidates,
      },
    ];
  });
}

function countResidualSamples(
  operands: ReadonlyArray<
    OptimizationConfig["merit_function"]["operands"][number]
  >,
): number {
  return operands.reduce((count, operand) => {
    if (operand.weight === 0) {
      return count;
    }
    const fieldCount =
      operand.fields?.filter(({ weight }) => weight !== 0).length ?? 1;
    const wavelengthCount =
      operand.wavelengths?.filter(({ weight }) => weight !== 0).length ?? 1;
    const perSampleCount = getOptimizationOperandMetadata(
      operand.kind,
    ).getNominalResidualCountPerSample(operand.options);
    return count + fieldCount * wavelengthCount * perSampleCount;
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

function createGlassModes(model: OpticalModel): GlassMode[] {
  return Array.from(
    { length: model.surfaces.length + 1 },
    (_, surfaceIndex) => ({
      surfaceIndex,
      mode: "constant" as const,
    }),
  );
}

function reconcileGlassModes(
  previous: GlassMode[],
  model: OpticalModel,
): GlassMode[] {
  const previousBySurfaceIndex = new Map(
    previous.map((entry) => [entry.surfaceIndex, entry] as const),
  );
  return createGlassModes(model).map(
    (entry) => previousBySurfaceIndex.get(entry.surfaceIndex) ?? entry,
  );
}

function fingerprintFieldSpecs(model: OpticalModel): string {
  const {
    isWideAngle: _isWideAngle,
    ...fieldSpecsAffectingOptimizationSettings
  } = model.specs.field;
  return JSON.stringify(fieldSpecsAffectingOptimizationSettings);
}

function fingerprintWavelengthSpecs(model: OpticalModel): string {
  const {
    referenceIndex: _referenceIndex,
    ...wavelengthSpecsAffectingOptimizationSettings
  } = model.specs.wavelengths;
  return JSON.stringify(wavelengthSpecsAffectingOptimizationSettings);
}

function fingerprintPrescription(model: OpticalModel): string {
  return JSON.stringify({
    object: model.object,
    image: model.image,
    surfaces: model.surfaces.map(
      ({ comment: _comment, ...surface }) => surface,
    ),
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

function applyGlassToModel(
  model: OpticalModel,
  entry: Extract<
    OptimizationRunReport,
    { readonly final_glasses: unknown }
  >["final_glasses"][number],
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
): report is Extract<
  OptimizationRunReport,
  { readonly final_glasses: unknown }
> {
  return "final_glasses" in report;
}

function buildOptimizationConfigForState(
  state: OptimizationState,
  catalogs?: AllGlassCatalogsData,
): OptimizationRunConfig {
  if (state.optimizationModel === undefined) {
    throw new Error("No optical model available for optimization.");
  }

  const meritOperands = buildMeritFunctionOperands(
    state.operands,
    state.fieldWeights,
    state.wavelengthWeights,
    state.optimizationModel.surfaces.length,
  );
  const capabilities = getOptimizationAlgorithmCapabilities(
    state.optimizer.kind === "least_squares"
      ? { kind: state.optimizer.kind, method: state.optimizer.method }
      : { kind: state.optimizer.kind },
  );
  const variables = buildParameterVariables(
    state.parameterStates,
    capabilities.canUseBounds,
  );
  if (
    capabilities.requiresResidualCountAtLeastVariableCount &&
    countResidualSamples(meritOperands) < variables.length
  ) {
    throw new Error(
      "Levenberg-Marquardt requires at least as many residuals as variables.",
    );
  }

  const pickups = buildParameterPickups(state.parameterStates);
  const merit_function = { operands: meritOperands };

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

  const optimizer = buildOptimizerConfig(state.optimizer);
  assertDifferentialEvolutionBudget(optimizer, variables.length);
  assertLevenbergMarquardtBudget(optimizer, variables.length);

  return {
    optimizer,
    variables,
    pickups,
    merit_function,
  };
}

export const createOptimizationSlice: StateCreator<OptimizationState> = (
  set,
  get,
) => ({
  activeTabId: "algorithm",
  optimizationModel: undefined,
  editorSyncBaseline: undefined,
  optimizer: createDefaultOptimizerState(),
  fieldWeights: [],
  wavelengthWeights: [],
  parameterStates: EMPTY_PARAMETER_STATES,
  glassModes: [],
  operands: [],
  isOptimizing: false,
  hasUnappliedOptimizationResult: false,
  lastOptimizationReport: undefined,
  applyConfirmOpen: false,
  discardConfirmOpen: false,
  parameterModal: { open: false, group: undefined, surfaceIndex: undefined },
  glassModal: { open: false, surfaceIndex: undefined },

  initializeFromOpticalModel: (model) =>
    set((state) => {
      if (state.optimizationModel !== undefined) {
        return {
          editorSyncBaseline:
            state.editorSyncBaseline ??
            createEditorSyncBaseline(state.optimizationModel),
        };
      }

      return {
        optimizationModel: model,
        editorSyncBaseline: createEditorSyncBaseline(model),
        fieldWeights: createInitialFieldWeights(
          model.specs.field.fields.length,
        ),
        wavelengthWeights: createInitialWavelengthWeights(model),
        parameterStates: createParameterStates(model),
        glassModes: createGlassModes(model),
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
          fieldWeights: createInitialFieldWeights(
            model.specs.field.fields.length,
          ),
          wavelengthWeights: createInitialWavelengthWeights(model),
          parameterStates: createParameterStates(model),
          glassModes: createGlassModes(model),
          operands: [],
          lastOptimizationReport: undefined,
          hasUnappliedOptimizationResult: false,
        };
      }

      const previousBaseline =
        state.editorSyncBaseline ??
        createEditorSyncBaseline(state.optimizationModel);
      const nextBaseline = createEditorSyncBaseline(model);
      const fieldSpecsChanged =
        previousBaseline.fieldSpecs !== nextBaseline.fieldSpecs;
      const wavelengthSpecsChanged =
        previousBaseline.wavelengthSpecs !== nextBaseline.wavelengthSpecs;
      const prescriptionChanged =
        previousBaseline.prescription !== nextBaseline.prescription;
      const shouldResetPrescriptionModes =
        prescriptionChanged &&
        (options?.prescriptionSyncPolicy ?? "resetOptimizationModes") ===
          "resetOptimizationModes";
      const clearsUnappliedOptimizationResult =
        fieldSpecsChanged ||
        wavelengthSpecsChanged ||
        shouldResetPrescriptionModes;
      const nextOptimizationModel =
        state.hasUnappliedOptimizationResult &&
        !clearsUnappliedOptimizationResult &&
        !prescriptionChanged
          ? mergeEditorCommentsIntoOptimizationModel(
              state.optimizationModel,
              model,
            )
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
        parameterStates: shouldResetPrescriptionModes
          ? createParameterStates(model)
          : reconcileParameterStates(state.parameterStates, model),
        glassModes: shouldResetPrescriptionModes
          ? createGlassModes(model)
          : reconcileGlassModes(state.glassModes, model),
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

  setParameterMode: (group, surfaceIndex, componentKey, mode) =>
    set((state) => ({
      parameterStates: {
        ...state.parameterStates,
        [group]: state.parameterStates[group].map((entry) =>
          entry.surfaceIndex === surfaceIndex
            ? withParameterMode(entry, componentKey, mode)
            : entry,
        ),
      },
    })),

  setGlassMode: (surfaceIndex, mode) =>
    set((state) => ({
      glassModes: state.glassModes.map((entry) =>
        entry.surfaceIndex === surfaceIndex
          ? ({ surfaceIndex, ...mode } as GlassMode)
          : entry,
      ),
    })),

  setParameterQualifier: (group, surfaceIndex, qualifier) =>
    set((state) => ({
      parameterStates: {
        ...state.parameterStates,
        [group]: state.parameterStates[group].map((entry) =>
          entry.surfaceIndex !== surfaceIndex || entry.lockedQualifier
            ? entry
            : { ...entry, qualifier },
        ),
      },
    })),

  replaceParameterState: (group, surfaceIndex, nextState) =>
    set((state) => ({
      parameterStates: {
        ...state.parameterStates,
        [group]: state.parameterStates[group].map((entry) =>
          entry.surfaceIndex === surfaceIndex
            ? {
                ...nextState,
                surfaceIndex,
                lockedQualifier:
                  entry.lockedQualifier || nextState.lockedQualifier,
              }
            : entry,
        ),
      },
    })),

  openParameterModal: (group, surfaceIndex) =>
    set({ parameterModal: { open: true, group, surfaceIndex } }),

  closeParameterModal: () =>
    set({
      parameterModal: {
        open: false,
        group: undefined,
        surfaceIndex: undefined,
      },
    }),

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

        const nextKind = patch.kind;
        if (nextKind === undefined) {
          return {
            ...operand,
            ...patch,
            target: patch.target ?? operand.target,
            min: patch.min ?? operand.min,
            max: patch.max ?? operand.max,
          };
        }
        const defaultRange = getDefaultOperandRange(nextKind);
        return {
          ...operand,
          ...patch,
          target: patch.target ?? getDefaultOperandTarget(nextKind),
          min: patch.min ?? defaultRange.min,
          max: patch.max ?? defaultRange.max,
          surfaceIndex: patch.surfaceIndex,
        };
      }),
    })),

  replaceOperands: (rows) => set({ operands: rows }),

  setOptimizationConfig: (config, catalogs) => {
    const state = get();
    if (state.isOptimizing) {
      throw new Error(
        "Cannot change optimization configuration while a run is already running.",
      );
    }

    const nextConfiguration = adaptOptimizationRunConfigToGuiState(
      config,
      state.optimizationModel,
      catalogs,
    );
    const nextState = { ...state, ...nextConfiguration };
    buildOptimizationConfigForState(nextState, catalogs);
    set(nextConfiguration);
  },

  openApplyConfirm: () => set({ applyConfirmOpen: true }),
  closeApplyConfirm: () => set({ applyConfirmOpen: false }),
  setIsOptimizing: (value) => set({ isOptimizing: value }),
  markOptimizationResultAppliedToEditor: () =>
    set({ hasUnappliedOptimizationResult: false }),
  openDiscardConfirm: () => set({ discardConfirmOpen: true }),
  closeDiscardConfirm: () => set({ discardConfirmOpen: false }),
  discardOptimizationResult: (editorModel) => {
    const state = get();
    if (state.isOptimizing) {
      throw new Error(
        "Cannot discard optimization result while a run is already running.",
      );
    }

    set({
      optimizationModel: editorModel,
      editorSyncBaseline: createEditorSyncBaseline(editorModel),
      hasUnappliedOptimizationResult: false,
      lastOptimizationReport: undefined,
      parameterStates: reconcileParameterStates(
        state.parameterStates,
        editorModel,
      ),
      glassModes: reconcileGlassModes(state.glassModes, editorModel),
    });
    return { hadUnappliedResult: state.hasUnappliedOptimizationResult };
  },
  setOptimizerKind: (kind) =>
    set({ optimizer: createDefaultOptimizerState(kind) }),

  buildOptimizationConfig: (catalogs) =>
    buildOptimizationConfigForState(get(), catalogs),

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
      for (const entry of [...report.final_values, ...report.pickups]) {
        nextModel = applyParameterValue(nextModel, entry, entry.value);
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
          report.final_values.length > 0 ||
          report.pickups.length > 0 ||
          (hasGlassResults(report) && report.final_glasses.length > 0)
            ? true
            : state.hasUnappliedOptimizationResult,
      };
    }),
});
