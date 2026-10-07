/** Strict AJV schemas for the public worker-facing OptimizationRunConfig contract. */
import {
  createPrescriptionAjv,
  finiteNumberSchema,
} from "@/shared/lib/schemas/prescriptionSchema";
import {
  OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS,
  getOptimizationOperandMetadata,
} from "@/features/optimization/lib/operandMetadata";
import type {
  OptimizationOperandKind,
  OptimizationRunConfig,
} from "@/features/optimization/types/optimizationWorkerTypes";

const positiveIntegerSchema = {
  type: "integer",
  minimum: 1,
} as const;
const nonNegativeIntegerSchema = {
  type: "integer",
  minimum: 0,
} as const;
const positiveNumberSchema = {
  ...finiteNumberSchema,
  exclusiveMinimum: 0,
} as const;
const nonNegativeNumberSchema = {
  ...finiteNumberSchema,
  minimum: 0,
} as const;

const variableBoundsSchema = {
  oneOf: [
    { required: ["min", "max"] },
    {
      not: {
        anyOf: [{ required: ["min"] }, { required: ["max"] }],
      },
    },
  ],
} as const;

const variableProperties = {
  surface_index: nonNegativeIntegerSchema,
  min: finiteNumberSchema,
  max: finiteNumberSchema,
} as const;

const optimizationVariableSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "surface_index"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["radius", "thickness"] },
        ...variableProperties,
      },
      ...variableBoundsSchema,
    },
    {
      type: "object",
      required: ["kind", "surface_index", "asphere_kind"],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: ["asphere_conic_constant", "asphere_toric_sweep_radius"],
        },
        asphere_kind: {
          type: "string",
          enum: [
            "Conic",
            "EvenAspherical",
            "RadialPolynomial",
            "XToroid",
            "YToroid",
          ],
        },
        ...variableProperties,
      },
      ...variableBoundsSchema,
    },
    {
      type: "object",
      required: ["kind", "surface_index", "asphere_kind", "coefficient_index"],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          const: "asphere_polynomial_coefficient",
        },
        asphere_kind: {
          type: "string",
          enum: ["EvenAspherical", "RadialPolynomial", "XToroid", "YToroid"],
        },
        coefficient_index: nonNegativeIntegerSchema,
        ...variableProperties,
      },
      ...variableBoundsSchema,
    },
    {
      type: "object",
      required: ["kind", "surface_index", "decenter_type"],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: [
            "decenter_alpha",
            "decenter_beta",
            "decenter_gamma",
            "decenter_x",
            "decenter_y",
          ],
        },
        decenter_type: {
          type: "string",
          enum: ["bend", "dec and return", "decenter", "reverse"],
        },
        ...variableProperties,
      },
      ...variableBoundsSchema,
    },
  ],
} as const;

const optimizationPickupSchema = {
  oneOf: [
    {
      type: "object",
      required: [
        "kind",
        "surface_index",
        "source_surface_index",
        "scale",
        "offset",
      ],
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["radius", "thickness"] },
        surface_index: nonNegativeIntegerSchema,
        source_surface_index: nonNegativeIntegerSchema,
        scale: finiteNumberSchema,
        offset: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: [
        "kind",
        "surface_index",
        "asphere_kind",
        "source_surface_index",
        "scale",
        "offset",
      ],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: ["asphere_conic_constant", "asphere_toric_sweep_radius"],
        },
        surface_index: nonNegativeIntegerSchema,
        asphere_kind: {
          type: "string",
          enum: [
            "Conic",
            "EvenAspherical",
            "RadialPolynomial",
            "XToroid",
            "YToroid",
          ],
        },
        source_surface_index: nonNegativeIntegerSchema,
        scale: finiteNumberSchema,
        offset: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: [
        "kind",
        "surface_index",
        "asphere_kind",
        "coefficient_index",
        "source_surface_index",
        "source_coefficient_index",
        "scale",
        "offset",
      ],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          const: "asphere_polynomial_coefficient",
        },
        surface_index: nonNegativeIntegerSchema,
        asphere_kind: {
          type: "string",
          enum: ["EvenAspherical", "RadialPolynomial", "XToroid", "YToroid"],
        },
        coefficient_index: nonNegativeIntegerSchema,
        source_surface_index: nonNegativeIntegerSchema,
        source_coefficient_index: nonNegativeIntegerSchema,
        scale: finiteNumberSchema,
        offset: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: [
        "kind",
        "surface_index",
        "decenter_type",
        "source_surface_index",
        "scale",
        "offset",
      ],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: [
            "decenter_alpha",
            "decenter_beta",
            "decenter_gamma",
            "decenter_x",
            "decenter_y",
          ],
        },
        surface_index: nonNegativeIntegerSchema,
        decenter_type: {
          type: "string",
          enum: ["bend", "dec and return", "decenter", "reverse"],
        },
        source_surface_index: nonNegativeIntegerSchema,
        scale: finiteNumberSchema,
        offset: finiteNumberSchema,
      },
    },
  ],
} as const;

const factorSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["index", "weight"],
    additionalProperties: false,
    properties: {
      index: nonNegativeIntegerSchema,
      weight: nonNegativeNumberSchema,
    },
  },
} as const;

const operandOptionsSchema = {
  type: "object",
  additionalProperties: false,
  properties: { num_rays: positiveIntegerSchema },
} as const;

const operandProperties = {
  weight: positiveNumberSchema,
  fields: factorSchema,
  wavelengths: factorSchema,
  options: operandOptionsSchema,
} as const;

/**
 * Surface-scoped operand fields: a 1-based surface index that excludes the
 * object surface. The GUI config adapter checks the model-dependent upper bound,
 * which excludes the image surface.
 */
const surfaceOperandProperties = {
  surface_index: positiveIntegerSchema,
} as const;

/** Adjustable-target operand branch for one kind group: a finite `target` is required. */
function createAdjustableTargetOperandSchema(
  kinds: ReadonlyArray<string>,
  isSurface: boolean,
) {
  return {
    type: "object",
    required: [
      "kind",
      "target",
      "weight",
      ...(isSurface ? ["surface_index"] : []),
    ],
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: kinds },
      target: finiteNumberSchema,
      ...operandProperties,
      ...(isSurface ? surfaceOperandProperties : {}),
    },
  } as const;
}

/** Fixed-target operand branch for one kind group: neither `target` nor bounds. */
function createFixedTargetOperandSchema(
  kinds: ReadonlyArray<string>,
  isSurface: boolean,
) {
  return {
    type: "object",
    required: ["kind", "weight", ...(isSurface ? ["surface_index"] : [])],
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: kinds },
      ...operandProperties,
      ...(isSurface ? surfaceOperandProperties : {}),
    },
  } as const;
}

/**
 * Range operand branch for one kind group: at least one finite bound and no
 * `target`. Kinds whose metadata sets `requiresPositiveBounds` (Edge Thickness)
 * get their own branch whose bounds must be strictly positive. JSON Schema cannot
 * compare `min` with `max`; the GUI config adapter enforces `min <= max`.
 */
function createRangeOperandSchema(
  kinds: ReadonlyArray<string>,
  isSurface: boolean,
  requiresPositiveBounds: boolean,
) {
  const boundSchema = requiresPositiveBounds
    ? positiveNumberSchema
    : finiteNumberSchema;
  return {
    type: "object",
    required: ["kind", "weight", ...(isSurface ? ["surface_index"] : [])],
    anyOf: [{ required: ["min"] }, { required: ["max"] }],
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: kinds },
      min: boundSchema,
      max: boundSchema,
      ...operandProperties,
      ...(isSurface ? surfaceOperandProperties : {}),
    },
  } as const;
}

/** Returns a one-branch list while `kinds` is non-empty, because a JSON-schema `enum` must not be empty. */
function branchIfRegistered<TBranch>(
  kinds: ReadonlyArray<string>,
  branch: TBranch,
): TBranch[] {
  return kinds.length > 0 ? [branch] : [];
}

/**
 * Range branches for one range kind group, split by whether each kind's metadata
 * requires positive bounds; a subset gets a branch only while it is non-empty.
 */
function createRangeOperandBranches(
  kinds: ReadonlyArray<OptimizationOperandKind>,
  isSurface: boolean,
) {
  const positiveKinds = kinds.filter(
    (kind) => getOptimizationOperandMetadata(kind).requiresPositiveBounds,
  );
  const otherKinds = kinds.filter(
    (kind) => !getOptimizationOperandMetadata(kind).requiresPositiveBounds,
  );
  return [
    ...branchIfRegistered(
      otherKinds,
      createRangeOperandSchema(otherKinds, isSurface, false),
    ),
    ...branchIfRegistered(
      positiveKinds,
      createRangeOperandSchema(positiveKinds, isSurface, true),
    ),
  ];
}

/**
 * Operand schema with one branch per target mode and scope, whose kind enums
 * come from the shared operand metadata. System-scoped branches reject
 * `surface_index`; surface-scoped branches require it. The range and every
 * surface-scoped branch are included only while at least one kind of that group
 * is registered; range groups are further split into positive-bound and
 * finite-bound branches. Today this means one surface-range branch accepting
 * `edge_thickness` with a positive-integer `surface_index` and positive bounds.
 */
const optimizationOperandSchema = {
  oneOf: [
    createAdjustableTargetOperandSchema(
      OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
      false,
    ),
    createFixedTargetOperandSchema(
      OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
      false,
    ),
    ...createRangeOperandBranches(OPTIMIZATION_RANGE_OPERAND_KINDS, false),
    ...branchIfRegistered(
      OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
      createAdjustableTargetOperandSchema(
        OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
        true,
      ),
    ),
    ...branchIfRegistered(
      OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
      createFixedTargetOperandSchema(
        OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
        true,
      ),
    ),
    ...createRangeOperandBranches(
      OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS,
      true,
    ),
  ],
} as const;

const meritFunctionSchema = {
  type: "object",
  required: ["operands"],
  additionalProperties: false,
  properties: {
    operands: { type: "array", minItems: 1, items: optimizationOperandSchema },
  },
} as const;

const continuousOptimizerSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "method", "max_nfev", "ftol", "xtol", "gtol"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "least_squares" },
        method: { type: "string", enum: ["trf", "lm"] },
        max_nfev: positiveIntegerSchema,
        ftol: { ...positiveNumberSchema, exclusiveMinimum: Number.EPSILON },
        xtol: { ...positiveNumberSchema, exclusiveMinimum: Number.EPSILON },
        gtol: { ...positiveNumberSchema, exclusiveMinimum: Number.EPSILON },
      },
    },
    {
      type: "object",
      required: ["kind", "max_nfev", "tol", "atol"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "differential_evolution" },
        max_nfev: positiveIntegerSchema,
        tol: positiveNumberSchema,
        atol: nonNegativeNumberSchema,
      },
    },
  ],
} as const;

const continuousConfigSchema = {
  type: "object",
  required: ["optimizer", "variables", "pickups", "merit_function"],
  additionalProperties: false,
  properties: {
    optimizer: continuousOptimizerSchema,
    variables: { type: "array", items: optimizationVariableSchema },
    pickups: { type: "array", items: optimizationPickupSchema },
    merit_function: meritFunctionSchema,
  },
} as const;

const glassOptimizerSchema = {
  type: "object",
  required: ["num_neighbours", "maxiter", "tol"],
  additionalProperties: false,
  properties: {
    num_neighbours: positiveIntegerSchema,
    maxiter: positiveIntegerSchema,
    tol: positiveNumberSchema,
  },
} as const;

const glassCandidateSchema = {
  type: "object",
  required: ["name", "catalog"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    catalog: {
      type: "string",
      enum: [
        "CDGM",
        "Hikari",
        "Hoya",
        "Ohara",
        "Schott",
        "Sumita",
        "Special",
        "Custom",
      ],
    },
  },
} as const;

const glassConfigSchema = {
  type: "object",
  required: ["glass_variables", "variables", "pickups", "merit_function"],
  additionalProperties: false,
  properties: {
    glass_optimizer: glassOptimizerSchema,
    glass_variables: {
      type: "array",
      items: {
        type: "object",
        required: ["surface_index", "candidates"],
        additionalProperties: false,
        properties: {
          surface_index: nonNegativeIntegerSchema,
          candidates: {
            type: "array",
            minItems: 1,
            items: glassCandidateSchema,
          },
        },
      },
    },
    variables: { type: "array", items: optimizationVariableSchema },
    pickups: { type: "array", items: optimizationPickupSchema },
    merit_function: meritFunctionSchema,
  },
} as const;

/** Strict discriminated schema accepted by `set_optimization_config`. */
export const optimizationRunConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    optimizer: continuousOptimizerSchema,
    glass_optimizer: glassOptimizerSchema,
    glass_variables: {
      type: "array",
      items: {
        type: "object",
        required: ["surface_index", "candidates"],
        additionalProperties: false,
        properties: {
          surface_index: nonNegativeIntegerSchema,
          candidates: {
            type: "array",
            minItems: 1,
            items: glassCandidateSchema,
          },
        },
      },
    },
    variables: { type: "array", items: optimizationVariableSchema },
    pickups: { type: "array", items: optimizationPickupSchema },
    merit_function: meritFunctionSchema,
  },
  oneOf: [continuousConfigSchema, glassConfigSchema],
} as const;

/** Strict empty input schema shared by the four no-argument tools. */
export const emptyOptimizationInputSchema = {
  type: "object",
  additionalProperties: false,
} as const;

/** Compiles the public configuration validator against the application's AJV extensions. */
export function createOptimizationRunConfigValidator() {
  return createPrescriptionAjv().compile<OptimizationRunConfig>(
    optimizationRunConfigSchema,
  );
}
