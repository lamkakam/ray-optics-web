/** Strict AJV schemas for the public worker-facing OptimizationRunConfig contract. */
import {
  createPrescriptionAjv,
  finiteNumberSchema,
} from "@/shared/lib/schemas/prescriptionSchema";
import type { OptimizationRunConfig } from "@/features/optimization/types/optimizationWorkerTypes";

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

const optimizationOperandSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "target", "weight"],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: [
            "focal_length",
            "f_number",
            "opd_difference",
            "opd_difference_tangential",
            "opd_difference_sagittal",
            "rms_spot_size",
            "rms_wavefront_error",
          ],
        },
        target: finiteNumberSchema,
        ...operandProperties,
      },
    },
    {
      type: "object",
      required: ["kind", "weight"],
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: ["ray_fan", "ray_fan_tangential", "ray_fan_sagittal"],
        },
        ...operandProperties,
      },
    },
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
