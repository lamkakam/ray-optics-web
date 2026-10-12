/** Pure inverse of the Optimization store's worker-config builder.
 *
 * Strict schema, target, operand range, operand surface, bounds, catalog, and shared-factor validation happens
 * before the returned string-backed GUI snapshot can be committed by Zustand.
 */
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type {
  GlassMode,
  OptimizationOperandRow,
  OptimizationState,
  ParameterStates,
} from "@/features/optimization/stores/optimizationStore";
import { parameterStatesFromConfig } from "@/features/optimization/lib/parameters/parameterStatesFromConfig";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import type {
  OptimizationOperandConfig,
  OptimizationRunConfig,
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
  readonly parameterStates: ParameterStates;
  readonly glassModes: GlassMode[];
  readonly operands: OptimizationOperandRow[];
}

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

function createGlassModes(model: OpticalModel): GlassMode[] {
  return Array.from(
    { length: model.surfaces.length + 1 },
    (_, surfaceIndex) => ({
      surfaceIndex,
      mode: "constant" as const,
    }),
  );
}

/**
 * Matches Python sample defaults: omitted or empty arrays give every sample unit
 * weight. Nonempty arrays select only listed indices; omitted indices and
 * explicit zero weights remain zero.
 */
function normalizeFactors(
  factors:
    | ReadonlyArray<{ readonly index: number; readonly weight: number }>
    | undefined,
  count: number,
  label: string,
): number[] {
  const weights: number[] = Array.from({ length: count }, () =>
    factors === undefined || factors.length === 0 ? 1 : 0,
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

/**
 * Validates a range operand's bounds: at least one finite bound and `min <= max`.
 * Positive-bound kinds such as Edge Thickness are already limited to positive
 * bounds by the WebMCP schema, which runs first.
 */
function assertOperandRange(
  kind: string,
  min: number | undefined,
  max: number | undefined,
): void {
  if (min === undefined && max === undefined) {
    throw new Error(`${kind} range requires at least one bound.`);
  }
  if (min !== undefined) {
    assertFiniteNumber(min, `${kind} range min`);
  }
  if (max !== undefined) {
    assertFiniteNumber(max, `${kind} range max`);
  }
  if (min !== undefined && max !== undefined && min > max) {
    throw new Error(`${kind} range min must not exceed max.`);
  }
}

function formatOptionalBound(value: number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * Validates operand configs and converts them into string-backed GUI rows.
 * Surface-only operands must reference a real surface (`1 … surfaceCount`, with
 * object and image excluded) and keep it as `surfaceIndex`; system-or-surface
 * operands (the third-order aberrations) may omit `surface_index` for the System
 * scope or supply one that is validated and kept the same way; system-only
 * operands must not carry `surface_index`.
 */
function createOperandRows(
  operands: ReadonlyArray<OptimizationOperandConfig>,
  surfaceCount: number,
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

    if (metadata.goal === "adjustable_target") {
      assertFiniteNumber(operand.target, `${operand.kind} target`);
    } else if (operand.target !== undefined) {
      throw new Error(`${operand.kind} does not accept a target.`);
    }
    if (metadata.goal === "range") {
      assertOperandRange(operand.kind, operand.min, operand.max);
    } else if (operand.min !== undefined || operand.max !== undefined) {
      throw new Error(`${operand.kind} does not accept range bounds.`);
    }
    const keepsSurfaceIndex =
      metadata.scope === "surface" ||
      (metadata.scope === "system_or_surface" &&
        operand.surface_index !== undefined);
    if (keepsSurfaceIndex) {
      assertIntegerInRange(
        operand.surface_index,
        1,
        surfaceCount,
        `${operand.kind} surface index`,
      );
    } else if (operand.surface_index !== undefined) {
      throw new Error(`${operand.kind} does not accept a surface index.`);
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
      target:
        metadata.goal === "adjustable_target"
          ? String(operand.target)
          : undefined,
      ...(metadata.goal === "range"
        ? {
            min: formatOptionalBound(operand.min),
            max: formatOptionalBound(operand.max),
          }
        : {}),
      weight: String(operand.weight),
      ...(keepsSurfaceIndex ? { surfaceIndex: operand.surface_index } : {}),
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
  const glassModes = createGlassModes(model);
  const parameterStates = parameterStatesFromConfig(
    config.variables,
    config.pickups,
    model,
    canUseBounds,
  );

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
    model.surfaces.length,
    model.specs.field.fields.length,
    model.specs.wavelengths.weights.length,
  );

  return {
    optimizer: getOptimizerState(config),
    fieldWeights: operandState.fieldWeights,
    wavelengthWeights: operandState.wavelengthWeights,
    parameterStates,
    glassModes,
    operands: operandState.operands,
  };
}

/** Backwards-friendly name for callers that describe the adapter as a config inverse. */
export const optimizationRunConfigToGuiState =
  adaptOptimizationRunConfigToGuiState;
