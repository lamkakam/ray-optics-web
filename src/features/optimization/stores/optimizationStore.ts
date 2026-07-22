/**
# `features/optimization/stores/optimizationStore.ts`

## Key State

- `optimizationModel` — page-local `OpticalModel` snapshot seeded from the editor
- `editorSyncBaseline` — fingerprints of the editor field specs, wavelength specs, and prescription snapshot last synchronized into Optimization
- `optimizer` — optimizer-kind-specific algorithm inputs stored as strings for direct form binding while mirroring `OptimizationConfig["optimizer"]` attribute names; least squares stores `method`, `max_nfev`, `ftol`, `xtol`, and `gtol` UI values, while Differential Evolution stores `max_nfev`, `tol`, and `atol` UI values
- `fieldWeights` / `wavelengthWeights` — numeric optimization weights
- `radiusModes` — one entry per non-object radius target, including the image surface
- `thicknessModes` — one entry per surface-row thickness target
- `asphereStates` — one entry per real surface, carrying the optimization asphere type plus independent constant/variable/pickup settings for conic constant, 10 coefficient slots, and toroid sweep radius
- `operands` — add/delete operand rows for focal-length, f-number, OPD Difference variants, RMS metrics, and Ray Fan variants; targeted operands keep editable string `target` values while target-less operands store `target: undefined`
- `isOptimizing` — loading flag for the page-blocking overlay
- `hasUnappliedOptimizationResult` — true after an optimization report with returned `final_values` or `pickups` updates the Optimization-local optical model and before that model is applied to the Editor
- `applyConfirmOpen`, `radiusModal`, `thicknessModal`, `asphereModal` — modal state
- `lastOptimizationReport` — last successful worker report

## Actions

- `initializeFromOpticalModel(model)` — seeds the page from the editor snapshot only when Optimization has no model yet, and records the editor-sync baseline
- `syncFromOpticalModel(model, options?)` — refreshes the page-local optical model from the live editor state by comparing field, wavelength, and prescription fingerprints against the recorded baseline
- `setFieldWeight(index, value)` / `setWavelengthWeight(index, value)` — update one weight
- `setRadiusMode(surfaceIndex, mode)` — switch a radius row between `constant`, `variable`, and `pickup`
- `setThicknessMode(surfaceIndex, mode)` — switch a thickness row between `constant`, `variable`, and `pickup`
- `setAsphereType(surfaceIndex, type)` — set the optimization-only asphere type for a spherical editor surface; existing editor asphere kinds stay locked
- `replaceAsphereState(surfaceIndex, state)` — replace one surface’s full optimization asphere state after the modal commits
- `setAsphereTermMode(surfaceIndex, term, mode)` — mutate one asphere target directly
- `openThicknessModal(surfaceIndex)` / `closeThicknessModal()` — control the thickness modal
- `openAsphereModal(surfaceIndex)` / `closeAsphereModal()` — control the asphere variable/pickup modal
- `addOperand()` / `deleteOperand(id)` / `updateOperand(id, patch)` / `replaceOperands(rows)` — manage operand rows
- `setOptimizerKind(kind)` — switches optimizer kind and resets algorithm fields to that kind's defaults so method-based and methodless fields are not mixed
- `markOptimizationResultAppliedToEditor()` — clears `hasUnappliedOptimizationResult` after the optimized model has been applied to the Editor
- `buildOptimizationConfig()` — validates current UI state and emits the Python `OptimizationConfig`, including method-aware bounded or unbounded variable entries
- `applyOptimizationResult(report)` — applies optimized radius/thickness/asphere values and pickups back into the page-local optical-model snapshot and marks the result as unapplied when the report contains returned values or pickups

## Internal Structure

- `buildOptimizationConfig()` is a thin coordinator that delegates optimizer parsing, surface variable/pickup extraction, asphere variable/pickup extraction, and merit-function operand assembly to file-local pure helpers in `optimizationStore.ts`.
- Store-local optimizer and surface-mode helper types derive shared contract fields from `features/optimization/types/optimizationWorkerTypes.ts` via indexed-access / `Extract` types, so the worker-boundary kind unions stay defined in one place. Optimizer form state keeps the shared field names and maps only numeric values to input strings.
- Shared optimizer capability lookup stays centralized so radius, thickness, and asphere variable entries all switch between bounded and unbounded config shapes from the selected optimizer's rule set.
- Default optimizer method and tolerance strings are seeded from `features/optimization/lib/optimizerUiConfig.ts` so the form defaults, labels, and capability rules stay aligned.
- Shared validation for bounded variable ranges stays centralized so radius, thickness, and asphere variable entries continue to use the same `min < max` rule and error text when the active method requires bounds.
- Surface pickup source-index validation stays centralized so radius and thickness pickups continue to share the same same-surface and out-of-range checks.

## Validation Rules

- `max_nfev` must be a positive integer.
- For least squares, `ftol`, `xtol`, and `gtol` must be finite positive values greater than `Number.EPSILON`, matching SciPy's double-precision machine-epsilon tolerance guard before the worker is called.
- For Differential Evolution, `tol` must be a positive non-zero number and `atol` must be a non-negative number.
- Operand `weight` must be a positive non-zero number.
- For bounded optimizers such as `trf` and `differential_evolution`, variable `min` and `max` must be numeric, and `min < max`.
- For least-squares `lm`, the built config must provide at least as many residual samples as optimization variables; otherwise `buildOptimizationConfig()` throws before the page tries to evaluate or optimize.
- Pickup `source_surface_index` must be in range and must not equal the target surface index.
- Asphere coefficient pickups require a coefficient `sourceTermKey`.
- Asphere coefficient pickup `source_coefficient_index` must be a non-negative integer so zero-based coefficient slot `0` is allowed.
- At least one operand is required before `buildOptimizationConfig()` succeeds.
- `hasNonZeroOptimizationContribution(...)` treats missing `fields` or `wavelengths` as a neutral factor of `1`, and otherwise checks all operand/field/wavelength weight combinations for any product greater than `0`.

## Key Conventions

- `surfaceIndex` matches the sequential-model indexing used by Python: first lens surface is `1`; radius modes include the image surface (`surfaces.length + 1`), while thickness modes stop at the last surface row.
- `initializeFromOpticalModel()` seeds field weights as `1` for field index `0` and `0` for every remaining field.
- `initializeFromOpticalModel()` seeds wavelength weights from `model.specs.wavelengths.weights[*][1]`, matching the editor-page wavelength weights.
- `syncFromOpticalModel()` resets field weights to the same `[1, 0, 0, ...]` default only when editor field specs changed since the last baseline.
- `syncFromOpticalModel()` resets wavelength weights from `model.specs.wavelengths.weights[*][1]` only when editor wavelength specs changed since the last baseline.
- Editor wide-angle mode changes update `optimizationModel.specs.field.isWideAngle` but do not count as field-spec changes for Optimization settings reset purposes.
- Editor reference wavelength changes update `optimizationModel.specs.wavelengths.referenceIndex` but do not count as wavelength-spec changes for Optimization settings reset purposes.
- `syncFromOpticalModel()` resets radius, thickness, and asphere variable/pickup modes to constants when the editor prescription changed with the default `"resetOptimizationModes"` policy.
- `syncFromOpticalModel()` updates `optimizationModel` and the baseline without clearing prescription modes when the editor prescription changed with `"preserveOptimizationModes"`.
- Algorithm settings and operand rows are never reset by editor sync.
- The store starts with no operand rows. `addOperand()` appends the default `focal_length` row with target `"100"` and weight `"1"`; switching that row to `opd_difference`, either axis-specific OPD Difference operand, `rms_spot_size`, or `rms_wavefront_error` resets the target to `"0"` without changing the weight.
- For preserved prescription sync, `syncFromOpticalModel()` reconciles radius modes, thickness modes, and `asphereStates` by index so model-shape-compatible modes survive while new targets receive default constant modes.
- `buildOptimizationConfig()` appends asphere variables and pickups alongside radius/thickness entries, using `asphere_kind` plus zero-based `coefficient_index` / `source_coefficient_index` metadata for the Python optimizer.
- `buildOptimizationConfig()` emits `min` / `max` for bounded `trf` and `differential_evolution`, and omits `min` / `max` for unbounded `lm` while preserving hidden bound strings in local Zustand state so switching least-squares methods does not discard prior inputs.
- Operand metadata is shared through `features/optimization/lib/operandMetadata.ts`, which defines the user label, default target behavior, default operand options, field/wavelength expansion, and nominal least-squares residual multiplicity for each operand kind.
- `buildOptimizationConfig()` omits `target` for target-less operands such as `ray_fan`, `ray_fan_tangential`, and `ray_fan_sagittal`.
- `buildOptimizationConfig()` also enforces the SciPy `lm` dimension rule using the same shared optimizer-capability helper and the nominal expanded merit-function sample count. `ray_fan` contributes `num_rays * 2` residuals per selected field/wavelength pair, while axis-specific Ray Fan operands contribute `num_rays`; Differential Evolution does not use this least-squares residual-count rule.
- `applyOptimizationResult()` can create or update `surface.aspherical` on the optimization-local optical model when optimized asphere results come back from Python.
- `syncFromOpticalModel()` clears `hasUnappliedOptimizationResult` when a normal editor sync replaces the Optimization-local snapshot through field, wavelength, or reset-policy prescription changes.
- `syncFromOpticalModel()` preserves `hasUnappliedOptimizationResult` during Optimization-origin prescription syncs that use `prescriptionSyncPolicy: "preserveOptimizationModes"`; the apply path clears the marker explicitly after the editor has been updated.
- The non-zero contribution helper is intentionally shape-based and does not branch on specific operand kind names, so future operands inherit the check automatically if they use the same config contract.
- `RadiusMode`, `RadiusModeDraft`, `AsphereMode`, `AsphereTermModeDraft`, and `AsphereOptimizationState` remain store-local because they represent UI draft/persisted form state rather than the shared optimization worker contract.*/
import { type StateCreator } from "zustand";
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  OptimizationConfig,
  OptimizationOperandKind,
  OptimizationOperandConfig,
  OptimizationPickupConfig,
  OptimizationReport,
  OptimizationValueEntry,
} from "@/features/optimization/types/optimizationWorkerTypes";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { getOptimizationAlgorithmCapabilities } from "@/features/optimization/lib/methodCapabilities";
import { formatOptimizerUiDefaultValue, OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
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

export interface OptimizationState {
  activeTabId: string;
  optimizationModel: OpticalModel | undefined;
  editorSyncBaseline: EditorSyncBaseline | undefined;
  optimizer: OptimizationAlgorithmState;
  fieldWeights: number[];
  wavelengthWeights: number[];
  radiusModes: RadiusMode[];
  thicknessModes: RadiusMode[];
  asphereStates: AsphereOptimizationState[];
  operands: OptimizationOperandRow[];
  isOptimizing: boolean;
  hasUnappliedOptimizationResult: boolean;
  lastOptimizationReport: OptimizationReport | undefined;
  applyConfirmOpen: boolean;
  radiusModal: RadiusModalState;
  thicknessModal: ThicknessModalState;
  asphereModal: AsphereModalState;

  initializeFromOpticalModel: (model: OpticalModel) => void;
  syncFromOpticalModel: (model: OpticalModel, options?: OptimizationSyncOptions) => void;
  setActiveTabId: (tabId: string) => void;
  setFieldWeight: (index: number, value: string | number) => void;
  setWavelengthWeight: (index: number, value: string | number) => void;
  setRadiusMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  setThicknessMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  setAsphereType: (surfaceIndex: number, type: AsphericalType) => void;
  replaceAsphereState: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  setAsphereTermMode: (surfaceIndex: number, term: "conic" | "toricSweep" | "coefficient", mode: AsphereTermModeDraft) => void;
  openRadiusModal: (surfaceIndex: number) => void;
  closeRadiusModal: () => void;
  openThicknessModal: (surfaceIndex: number) => void;
  closeThicknessModal: () => void;
  openAsphereModal: (surfaceIndex: number) => void;
  closeAsphereModal: () => void;
  addOperand: () => void;
  deleteOperand: (id: string) => void;
  updateOperand: (id: string, patch: Partial<Omit<OptimizationOperandRow, "id">>) => void;
  replaceOperands: (rows: OptimizationOperandRow[]) => void;
  openApplyConfirm: () => void;
  closeApplyConfirm: () => void;
  setIsOptimizing: (value: boolean) => void;
  markOptimizationResultAppliedToEditor: () => void;
  setOptimizerKind: (kind: OptimizationAlgorithmState["kind"]) => void;
  buildOptimizationConfig: () => OptimizationConfig;
  applyOptimizationResult: (report: OptimizationReport) => void;
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

/**
## Purpose

Provider-backed Zustand slice for the optimization route. Owns page state including the page-local optical-model snapshot, algorithm inputs, field and wavelength weights, radius variable/pickup selections, operands, loading state, and store-backed modal state.*/
export function hasNonZeroOptimizationContribution(
  config: Pick<OptimizationConfig, "merit_function">,
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
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
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
  if (optimizer.kind === "differential_evolution") {
    return {
      kind: optimizer.kind,
      max_nfev: parsePositiveInteger(optimizer.max_nfev, "Max. num of steps"),
      tol: parsePositiveFloat(optimizer.tol, "Relative tolerance"),
      atol: parseNonNegativeFloat(optimizer.atol, "Absolute tolerance"),
    };
  }

  return {
    kind: optimizer.kind,
    method: optimizer.method,
    max_nfev: parsePositiveInteger(optimizer.max_nfev, "Max. num of steps"),
    ftol: parseLeastSquaresTolerance(optimizer.ftol, "Merit function change tolerance"),
    xtol: parseLeastSquaresTolerance(optimizer.xtol, "Independent variable change tolerance"),
    gtol: parseLeastSquaresTolerance(optimizer.gtol, "Gradient tolerance"),
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

function countResidualSamples(
  operands: ReadonlyArray<OptimizationConfig["merit_function"]["operands"][number]>,
): number {
  return operands.reduce((count, operand) => {
    const fieldCount = operand.fields?.length ?? 1;
    const wavelengthCount = operand.wavelengths?.length ?? 1;
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
    surfaces: model.surfaces,
  });
}

function createEditorSyncBaseline(model: OpticalModel): EditorSyncBaseline {
  return {
    fieldSpecs: fingerprintFieldSpecs(model),
    wavelengthSpecs: fingerprintWavelengthSpecs(model),
    prescription: fingerprintPrescription(model),
  };
}

function getOptimizerToleranceDefault<TKind extends OptimizationAlgorithmState["kind"]>(
  kind: TKind,
  toleranceKind: Extract<OptimizationConfig["optimizer"], { readonly kind: TKind }> extends infer TOptimizer
    ? Exclude<keyof TOptimizer, "kind" | "method" | "max_nfev">
    : never,
): string {
  const tolerance = OPTIMIZER_UI_CONFIG[kind].tolerances.find(({ kind: currentKind }) => currentKind === toleranceKind);
  if (tolerance === undefined) {
    throw new Error(`Optimizer kind "${kind}" does not expose tolerance "${String(toleranceKind)}".`);
  }

  return formatOptimizerUiDefaultValue(tolerance.default);
}

function createDefaultOptimizerState(
  kind: OptimizationAlgorithmState["kind"] = "least_squares",
): OptimizationState["optimizer"] {
  if (kind === "differential_evolution") {
    return {
      kind,
      max_nfev: "200",
      tol: getOptimizerToleranceDefault(kind, "tol"),
      atol: getOptimizerToleranceDefault(kind, "atol"),
    };
  }

  const optimizerConfig = OPTIMIZER_UI_CONFIG.least_squares;

  return {
    kind: "least_squares",
    method: optimizerConfig.methods[0].kind,
    max_nfev: "200",
    ftol: getOptimizerToleranceDefault(kind, "ftol"),
    xtol: getOptimizerToleranceDefault(kind, "xtol"),
    gtol: getOptimizerToleranceDefault(kind, "gtol"),
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

export const createOptimizationSlice: StateCreator<OptimizationState> = (set, get) => ({
  activeTabId: "algorithm",
  optimizationModel: undefined,
  editorSyncBaseline: undefined,
  optimizer: createDefaultOptimizerState(),
  fieldWeights: [],
  wavelengthWeights: [],
  radiusModes: [],
  thicknessModes: [],
  asphereStates: [],
  operands: [],
  isOptimizing: false,
  hasUnappliedOptimizationResult: false,
  lastOptimizationReport: undefined,
  applyConfirmOpen: false,
  radiusModal: { open: false, surfaceIndex: undefined },
  thicknessModal: { open: false, surfaceIndex: undefined },
  asphereModal: { open: false, surfaceIndex: undefined },

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

      return {
        optimizationModel: model,
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

  buildOptimizationConfig: () => {
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

    return {
      optimizer: buildOptimizerConfig(state.optimizer),
      variables,
      pickups: [
        ...buildSurfacePickups(state.radiusModes, state.thicknessModes),
        ...buildAspherePickups(state.asphereStates),
      ],
      merit_function: {
        operands: meritOperands,
      },
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

      return {
        optimizationModel: nextModel,
        lastOptimizationReport: report,
        hasUnappliedOptimizationResult:
          report.final_values.length > 0 || report.pickups.length > 0
            ? true
            : state.hasUnappliedOptimizationResult,
      };
    }),
});
