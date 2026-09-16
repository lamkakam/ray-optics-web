/** Pure inverse of the Optimization store's worker-config builder.
 *
 * Strict schema, target, bounds, catalog, and shared-factor validation happens
 * before the returned string-backed GUI snapshot can be committed by Zustand.
 */
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type {
  AsphereMode,
  AsphereOptimizationState,
  DecenterOptimizationState,
  GlassMode,
  OptimizationOperandRow,
  OptimizationState,
  RadiusMode,
} from "@/features/optimization/stores/optimizationStore";
import type {
  AsphericalType,
  OpticalModel,
} from "@/shared/lib/types/opticalModel";
import type {
  OptimizationOperandConfig,
  OptimizationPickupConfig,
  OptimizationRunConfig,
  OptimizationVariableConfig,
  GlassCandidateConfig,
} from "@/features/optimization/types/optimizationWorkerTypes";
import {
  ELIGIBLE_SPECIAL_GLASS_NAMES,
  getGlassCandidateIdentity,
  getIncumbentGlassCatalog,
  sortGlassCandidates,
} from "@/features/optimization/lib/glassCandidateSelection";
import { assertWebMcpInput } from "@/shared/lib/webMcpValidation";
import { createOptimizationRunConfigValidator } from "@/features/optimization/lib/optimizationConfigSchema";

/** Configuration fields that may be replaced without disturbing page-local results. */
export interface OptimizationGuiConfigState {
  readonly optimizer: OptimizationState["optimizer"];
  readonly fieldWeights: number[];
  readonly wavelengthWeights: number[];
  readonly radiusModes: RadiusMode[];
  readonly thicknessModes: RadiusMode[];
  readonly glassModes: GlassMode[];
  readonly asphereStates: AsphereOptimizationState[];
  readonly decenterStates: DecenterOptimizationState[];
  readonly operands: OptimizationOperandRow[];
}

type ConfigTarget = OptimizationVariableConfig | OptimizationPickupConfig;

const DECENTER_COMPONENT_BY_KIND = {
  decenter_alpha: "alpha",
  decenter_beta: "beta",
  decenter_gamma: "gamma",
  decenter_x: "x",
  decenter_y: "y",
} as const;

const validateOptimizationRunConfig = createOptimizationRunConfigValidator();
const ELIGIBLE_SPECIAL_GLASS_NAME_SET = new Set<string>(
  ELIGIBLE_SPECIAL_GLASS_NAMES,
);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertFiniteNumber(
  value: unknown,
  label: string,
): asserts value is number {
  if (!isFiniteNumber(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function assertIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${label} is out of range.`);
  }
}

function assertDifferentSurface(
  targetIndex: number,
  sourceIndex: number,
): void {
  if (targetIndex === sourceIndex) {
    throw new Error(
      "Pickup source surface index must not equal the target surface index.",
    );
  }
}

function getOptimizerBoundsCapability(config: OptimizationRunConfig): boolean {
  if ("glass_variables" in config) return true;
  return (
    config.optimizer.kind !== "least_squares" ||
    config.optimizer.method === "trf"
  );
}

function getOptimizerState(
  config: OptimizationRunConfig,
): OptimizationState["optimizer"] {
  if ("optimizer" in config) {
    if (config.optimizer.kind === "least_squares") {
      return {
        kind: config.optimizer.kind,
        method: config.optimizer.method,
        max_nfev: String(config.optimizer.max_nfev),
        ftol: String(config.optimizer.ftol),
        xtol: String(config.optimizer.xtol),
        gtol: String(config.optimizer.gtol),
      };
    }

    return {
      kind: config.optimizer.kind,
      max_nfev: String(config.optimizer.max_nfev),
      tol: String(config.optimizer.tol),
      atol: String(config.optimizer.atol),
    };
  }

  const defaults = OPTIMIZER_UI_CONFIG.glass_expert.numericFields;
  const glassOptimizer = config.glass_optimizer;
  return {
    kind: "glass_expert",
    num_neighbours: String(
      glassOptimizer?.num_neighbours ??
        defaults.find(({ kind }) => kind === "num_neighbours")?.default ??
        7,
    ),
    maxiter: String(
      glassOptimizer?.maxiter ??
        defaults.find(({ kind }) => kind === "maxiter")?.default ??
        1000,
    ),
    tol: String(
      glassOptimizer?.tol ??
        defaults.find(({ kind }) => kind === "tol")?.default ??
        1e-3,
    ),
  };
}

function createAsphereMode(): AsphereMode {
  return { mode: "constant" };
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
  return Array.from(
    { length: model.surfaces.length + 1 },
    (_, surfaceIndex) => ({
      surfaceIndex,
      mode: "constant" as const,
    }),
  );
}

function createAsphereStates(model: OpticalModel): AsphereOptimizationState[] {
  return model.surfaces.map((surface, index) => ({
    surfaceIndex: index + 1,
    type: surface.aspherical?.kind,
    lockedType: surface.aspherical !== undefined,
    conic: createAsphereMode(),
    toricSweep: createAsphereMode(),
    coefficients: Array.from({ length: 10 }, createAsphereMode),
  }));
}

function createDecenterStates(
  model: OpticalModel,
): DecenterOptimizationState[] {
  return [...model.surfaces, model.image].map((target, index) => ({
    surfaceIndex: index + 1,
    type: target.decenter?.coordinateSystemStrategy ?? "bend",
    lockedType: target.decenter !== undefined,
    alpha: createAsphereMode(),
    beta: createAsphereMode(),
    gamma: createAsphereMode(),
    x: createAsphereMode(),
    y: createAsphereMode(),
  }));
}

function getBounds(
  target: ConfigTarget,
  canUseBounds: boolean,
  label: string,
  rejectZeroStraddle: boolean,
): { readonly min: string; readonly max: string } {
  const hasMin = "min" in target;
  const hasMax = "max" in target;
  if (!canUseBounds) {
    if (hasMin || hasMax) {
      throw new Error(
        `${label} bounds are not representable by this optimizer.`,
      );
    }
    return { min: "0", max: "0" };
  }

  if (!hasMin || !hasMax) {
    throw new Error(`${label} variable bounds are required.`);
  }
  assertFiniteNumber(target.min, `${label} minimum`);
  assertFiniteNumber(target.max, `${label} maximum`);
  if (target.min >= target.max) {
    throw new Error(`${label} variable bounds must have Min. less than Max.`);
  }
  if (rejectZeroStraddle && target.min < 0 && target.max > 0) {
    throw new Error(`${label} variable bounds must stay on one side of 0.`);
  }
  return { min: String(target.min), max: String(target.max) };
}

function getVariableMode(
  target: OptimizationVariableConfig,
  canUseBounds: boolean,
): Extract<AsphereMode, { mode: "variable" }> {
  const bounds = getBounds(
    target,
    canUseBounds,
    target.kind === "radius" ? "Radius" : target.kind,
    target.kind === "radius" || target.kind === "asphere_toric_sweep_radius",
  );
  return { mode: "variable", ...bounds };
}

function getPickupSourceIndex(
  target: OptimizationPickupConfig,
  maximum: number,
): string {
  assertIntegerInRange(
    target.source_surface_index,
    1,
    maximum,
    "Pickup source surface index",
  );
  assertDifferentSurface(target.surface_index, target.source_surface_index);
  return String(target.source_surface_index);
}

function getPickupMode(
  target: OptimizationPickupConfig,
  maximumSourceIndex: number,
): Extract<AsphereMode, { mode: "pickup" }> {
  assertFiniteNumber(target.scale, "Pickup scale");
  assertFiniteNumber(target.offset, "Pickup offset");
  return {
    mode: "pickup",
    sourceSurfaceIndex: getPickupSourceIndex(target, maximumSourceIndex),
    scale: String(target.scale),
    offset: String(target.offset),
    ...(target.kind === "asphere_polynomial_coefficient"
      ? {
          sourceTermKey:
            `coefficient:${target.source_coefficient_index}` as const,
        }
      : {}),
  };
}

function assertTargetIsUnique(
  targets: Set<string>,
  target: ConfigTarget,
): void {
  const coefficient =
    "coefficient_index" in target ? `:${target.coefficient_index}` : "";
  const key = `${target.kind}:${target.surface_index}${coefficient}`;
  if (targets.has(key)) {
    throw new Error(`Duplicate optimization target: ${key}.`);
  }
  targets.add(key);
}

function assertAsphereKindCompatible(
  kind: ConfigTarget["kind"],
  asphereKind: AsphericalType,
): void {
  if (
    kind === "asphere_toric_sweep_radius" &&
    asphereKind !== "XToroid" &&
    asphereKind !== "YToroid"
  ) {
    throw new Error(`${kind} requires an XToroid or YToroid asphere.`);
  }
  if (kind === "asphere_polynomial_coefficient" && asphereKind === "Conic") {
    throw new Error(
      "Polynomial coefficients are not supported by Conic aspheres.",
    );
  }
}

function updateAsphereType(
  states: AsphereOptimizationState[],
  kinds: Map<number, AsphericalType>,
  surfaceIndex: number,
  type: AsphericalType,
): AsphereOptimizationState {
  const state = states[surfaceIndex - 1];
  if (state === undefined) {
    throw new Error(`Asphere surface ${surfaceIndex} is out of range.`);
  }
  const previousType = kinds.get(surfaceIndex);
  if (previousType !== undefined && previousType !== type) {
    throw new Error(`Incompatible asphere types on surface ${surfaceIndex}.`);
  }
  if (state.lockedType && state.type !== type) {
    throw new Error(`Asphere type on surface ${surfaceIndex} is locked.`);
  }
  kinds.set(surfaceIndex, type);
  const next = { ...state, type };
  states[surfaceIndex - 1] = next;
  return next;
}

function updateDecenterType(
  states: DecenterOptimizationState[],
  kinds: Map<number, DecenterOptimizationState["type"]>,
  surfaceIndex: number,
  type: DecenterOptimizationState["type"],
): DecenterOptimizationState {
  const state = states[surfaceIndex - 1];
  if (state === undefined) {
    throw new Error(`Tilt/decenter surface ${surfaceIndex} is out of range.`);
  }
  const previousType = kinds.get(surfaceIndex);
  if (previousType !== undefined && previousType !== type) {
    throw new Error(
      `Incompatible tilt/decenter types on surface ${surfaceIndex}.`,
    );
  }
  if (state.lockedType && state.type !== type) {
    throw new Error(`Tilt/decenter type on surface ${surfaceIndex} is locked.`);
  }
  kinds.set(surfaceIndex, type);
  const next = { ...state, type };
  states[surfaceIndex - 1] = next;
  return next;
}

function normalizeFactors(
  factors:
    | ReadonlyArray<{ readonly index: number; readonly weight: number }>
    | undefined,
  count: number,
  label: string,
): number[] {
  const weights: number[] = Array.from({ length: count }, () =>
    factors === undefined ? 1 : 0,
  );
  const seen = new Set<number>();
  for (const factor of factors ?? []) {
    assertIntegerInRange(factor.index, 0, count - 1, `${label} index`);
    if (seen.has(factor.index)) {
      throw new Error(
        `Duplicate ${label.toLowerCase()} index ${factor.index}.`,
      );
    }
    assertFiniteNumber(factor.weight, `${label} weight`);
    if (factor.weight < 0) {
      throw new Error(`${label} weight must be non-negative.`);
    }
    seen.add(factor.index);
    weights[factor.index] = factor.weight;
  }
  return weights;
}

function sameVector(
  left: ReadonlyArray<number>,
  right: ReadonlyArray<number>,
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function validateGlassCandidates(
  model: OpticalModel,
  config: Extract<OptimizationRunConfig, { readonly glass_variables: unknown }>,
  catalogs: AllGlassCatalogsData | undefined,
): void {
  if (config.glass_variables.length === 0) {
    return;
  }
  if (catalogs === undefined) {
    throw new Error("Glass catalog data is not loaded.");
  }

  for (const variable of config.glass_variables) {
    const candidates = sortGlassCandidates(variable.candidates);
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

    const incumbent =
      variable.surface_index === 0
        ? model.object
        : model.surfaces[variable.surface_index - 1];
    if (incumbent === undefined) {
      throw new Error(
        `Glass surface ${variable.surface_index} is out of range.`,
      );
    }
    const incumbentMedium = incumbent.medium.trim();
    if (
      incumbentMedium.toLowerCase() === "air" ||
      incumbentMedium.toUpperCase() === "REFL"
    ) {
      throw new Error(
        `${incumbent.medium} cannot be optimized as a glass variable at surface ${variable.surface_index}.`,
      );
    }
    if (!Number.isNaN(Number.parseFloat(incumbentMedium))) {
      continue;
    }
    const incumbentCatalog = getIncumbentGlassCatalog(
      model,
      variable.surface_index,
      catalogs,
    );
    const incumbentCandidate: GlassCandidateConfig | undefined =
      incumbentCatalog === undefined
        ? undefined
        : { catalog: incumbentCatalog, name: incumbentMedium };
    if (
      incumbentCandidate !== undefined &&
      !seenCandidates.has(getGlassCandidateIdentity(incumbentCandidate))
    ) {
      throw new Error(
        `Current glass must be included in candidates for surface ${variable.surface_index}.`,
      );
    }
    if (incumbentCandidate === undefined) {
      throw new Error(
        `Unsupported current material at surface ${variable.surface_index}: ${incumbent.medium}, ${incumbent.manufacturer}`,
      );
    }
  }
}

function createOperandRows(
  operands: ReadonlyArray<OptimizationOperandConfig>,
  fieldCount: number,
  wavelengthCount: number,
): {
  readonly operands: OptimizationOperandRow[];
  readonly fieldWeights: number[];
  readonly wavelengthWeights: number[];
} {
  let sharedFields: number[] | undefined;
  let sharedWavelengths: number[] | undefined;
  const rows = operands.map((operand, index) => {
    const metadata = getOptimizationOperandMetadata(operand.kind);
    const hasFactors =
      operand.fields !== undefined || operand.wavelengths !== undefined;
    if (!metadata.expandsByFieldAndWavelength && hasFactors) {
      throw new Error(
        `${operand.kind} does not support field/wavelength expansion.`,
      );
    }
    if (metadata.expandsByFieldAndWavelength) {
      const fields = normalizeFactors(operand.fields, fieldCount, "Field");
      const wavelengths = normalizeFactors(
        operand.wavelengths,
        wavelengthCount,
        "Wavelength",
      );
      if (sharedFields !== undefined && !sameVector(sharedFields, fields)) {
        throw new Error(
          "All expanded operands must use the same field weights.",
        );
      }
      if (
        sharedWavelengths !== undefined &&
        !sameVector(sharedWavelengths, wavelengths)
      ) {
        throw new Error(
          "All expanded operands must use the same wavelength weights.",
        );
      }
      sharedFields ??= fields;
      sharedWavelengths ??= wavelengths;
    }

    if (metadata.requiresTarget) {
      assertFiniteNumber(operand.target, `${operand.kind} target`);
    } else if (operand.target !== undefined) {
      throw new Error(`${operand.kind} does not accept a target.`);
    }

    assertFiniteNumber(operand.weight, `${operand.kind} weight`);
    if (operand.weight <= 0) {
      throw new Error(`${operand.kind} weight must be positive.`);
    }
    if (operand.options?.num_rays !== undefined) {
      assertIntegerInRange(
        operand.options.num_rays,
        1,
        Number.MAX_SAFE_INTEGER,
        "num_rays",
      );
    }

    return {
      id: `optimization-operand-${index}`,
      kind: operand.kind,
      target: metadata.requiresTarget ? String(operand.target) : undefined,
      weight: String(operand.weight),
      ...(operand.options === undefined
        ? {}
        : { options: { ...operand.options } }),
    };
  });

  return {
    operands: rows,
    fieldWeights: sharedFields ?? Array.from({ length: fieldCount }, () => 1),
    wavelengthWeights:
      sharedWavelengths ?? Array.from({ length: wavelengthCount }, () => 1),
  };
}

/** Converts a worker config into a complete, validated GUI configuration snapshot. */
export function adaptOptimizationRunConfigToGuiState(
  config: OptimizationRunConfig,
  model: OpticalModel | undefined,
  catalogs?: AllGlassCatalogsData,
): OptimizationGuiConfigState {
  assertWebMcpInput(validateOptimizationRunConfig, config);
  if (model === undefined) {
    throw new Error("No optical model available for optimization.");
  }

  const canUseBounds = getOptimizerBoundsCapability(config);
  const radiusModes = createRadiusModes(model);
  const thicknessModes = createThicknessModes(model);
  const glassModes = createGlassModes(model);
  const asphereStates = createAsphereStates(model);
  const decenterStates = createDecenterStates(model);
  const targets = new Set<string>();
  const asphereKinds = new Map<number, AsphericalType>();
  const decenterKinds = new Map<number, DecenterOptimizationState["type"]>();

  for (const target of [...config.variables, ...config.pickups]) {
    assertTargetIsUnique(targets, target);
    if (target.kind === "radius" || target.kind === "thickness") {
      const maximum =
        target.kind === "radius"
          ? model.surfaces.length + 1
          : model.surfaces.length;
      assertIntegerInRange(target.surface_index, 1, maximum, "Surface index");
      const mode = !("source_surface_index" in target)
        ? getVariableMode(target as OptimizationVariableConfig, canUseBounds)
        : getPickupMode(target as OptimizationPickupConfig, maximum);
      if (target.kind === "radius") {
        radiusModes[target.surface_index - 1] = {
          surfaceIndex: target.surface_index,
          ...mode,
        } as RadiusMode;
      } else {
        thicknessModes[target.surface_index - 1] = {
          surfaceIndex: target.surface_index,
          ...mode,
        } as RadiusMode;
      }
      continue;
    }

    if (target.kind.startsWith("asphere_")) {
      const asphereTarget = target as Extract<
        ConfigTarget,
        { readonly asphere_kind: AsphericalType }
      >;
      assertIntegerInRange(
        asphereTarget.surface_index,
        1,
        model.surfaces.length,
        "Asphere surface index",
      );
      const asphereKind = asphereTarget.asphere_kind;
      assertAsphereKindCompatible(asphereTarget.kind, asphereKind);
      let state = updateAsphereType(
        asphereStates,
        asphereKinds,
        asphereTarget.surface_index,
        asphereKind,
      );
      let mode: AsphereMode;
      if (!("source_surface_index" in asphereTarget)) {
        mode = getVariableMode(
          asphereTarget as OptimizationVariableConfig,
          canUseBounds,
        );
      } else {
        mode = getPickupMode(
          asphereTarget as OptimizationPickupConfig,
          model.surfaces.length,
        );
      }
      if (asphereTarget.kind === "asphere_conic_constant") {
        state = { ...state, conic: mode };
      } else if (asphereTarget.kind === "asphere_toric_sweep_radius") {
        state = { ...state, toricSweep: mode };
      } else {
        const polynomialTarget = asphereTarget as Extract<
          ConfigTarget,
          { readonly kind: "asphere_polynomial_coefficient" }
        >;
        assertIntegerInRange(
          polynomialTarget.coefficient_index,
          0,
          9,
          "Asphere coefficient index",
        );
        if ("source_coefficient_index" in polynomialTarget) {
          assertIntegerInRange(
            polynomialTarget.source_coefficient_index,
            0,
            9,
            "Source coefficient index",
          );
        }
        state = {
          ...state,
          coefficients: state.coefficients.map((current, index) =>
            index === polynomialTarget.coefficient_index ? mode : current,
          ),
        };
      }
      asphereStates[asphereTarget.surface_index - 1] = state;
      continue;
    }

    const decenterTarget = target as Extract<
      ConfigTarget,
      { readonly decenter_type: DecenterOptimizationState["type"] }
    >;
    assertIntegerInRange(
      decenterTarget.surface_index,
      1,
      model.surfaces.length + 1,
      "Tilt/decenter surface index",
    );
    let state = updateDecenterType(
      decenterStates,
      decenterKinds,
      decenterTarget.surface_index,
      decenterTarget.decenter_type,
    );
    const component = DECENTER_COMPONENT_BY_KIND[decenterTarget.kind];
    const mode = !("source_surface_index" in decenterTarget)
      ? getVariableMode(
          decenterTarget as OptimizationVariableConfig,
          canUseBounds,
        )
      : getPickupMode(
          decenterTarget as OptimizationPickupConfig,
          model.surfaces.length + 1,
        );
    state = { ...state, [component]: mode };
    decenterStates[decenterTarget.surface_index - 1] = state;
  }

  if ("glass_variables" in config) {
    validateGlassCandidates(model, config, catalogs);
    const glassTargets = new Set<number>();
    for (const variable of config.glass_variables) {
      assertIntegerInRange(
        variable.surface_index,
        0,
        model.surfaces.length,
        "Glass surface index",
      );
      if (glassTargets.has(variable.surface_index)) {
        throw new Error(`Duplicate glass target ${variable.surface_index}.`);
      }
      glassTargets.add(variable.surface_index);
      glassModes[variable.surface_index] = {
        surfaceIndex: variable.surface_index,
        mode: "variable",
        candidates: sortGlassCandidates(variable.candidates).map(
          (candidate) => ({
            ...candidate,
          }),
        ),
      };
    }
  }

  const operandState = createOperandRows(
    config.merit_function.operands,
    model.specs.field.fields.length,
    model.specs.wavelengths.weights.length,
  );

  return {
    optimizer: getOptimizerState(config),
    fieldWeights: operandState.fieldWeights,
    wavelengthWeights: operandState.wavelengthWeights,
    radiusModes,
    thicknessModes,
    glassModes,
    asphereStates,
    decenterStates,
    operands: operandState.operands,
  };
}

/** Backwards-friendly name for callers that describe the adapter as a config inverse. */
export const optimizationRunConfigToGuiState =
  adaptOptimizationRunConfigToGuiState;
