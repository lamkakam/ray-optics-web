/**
 * Optimizer wire contracts for constructional parameters, derived from the
 * registered parameter shapes in `optical-model/surface-properties/parameters.ts`.
 * Variable, pickup, and report-entry types and the variable/pickup AJV schemas
 * are generated from the same shapes, so a new optimizable parameter needs no
 * changes here. Keys stay snake_case for direct exchange with Python.
 */
import Type from "typebox";
import { finiteNumberSchema } from "@/shared/lib/optical-model/schema/primitives";
import {
  CONSTRUCTIONAL_PARAMETER_SHAPES,
  type ConstructionalParameterKind,
  type ConstructionalParameterPickupRef,
  type ConstructionalParameterRef,
} from "@/shared/lib/optical-model/surface-properties/parameters";
import { parameterSurfaceIndexSchema } from "@/shared/lib/optical-model/surface-properties/parameterShape";

export type {
  ConstructionalParameterKind,
  ConstructionalParameterRef,
} from "@/shared/lib/optical-model/surface-properties/parameters";

/** Tilt and decenter parameter kinds. */
export type DecenterParameterKind = Extract<
  ConstructionalParameterKind,
  `decenter_${string}`
>;

/** Optional finite bounds; bounded optimizers require both and unbounded ones neither. */
interface VariableBounds {
  readonly min?: number;
  readonly max?: number;
}

/** Linear pickup `value = scale * source + offset` from another parameter. */
interface PickupTransform {
  readonly source_surface_index: number;
  readonly scale: number;
  readonly offset: number;
}

/** Independently optimized constructional parameter with optional bounds. */
export type OptimizationVariableConfig = Readonly<ConstructionalParameterRef> &
  VariableBounds;

/** Constructional parameter derived from another one, including any shape-specific source fields. */
export type OptimizationPickupConfig =
  Readonly<ConstructionalParameterPickupRef> & PickupTransform;

/** Initial or final optimized value returned by Python. */
export type OptimizationValueEntry = OptimizationVariableConfig & {
  readonly value: number;
};

/** Evaluated pickup value returned by Python. */
export type OptimizationPickupEntry = OptimizationPickupConfig & {
  readonly value: number;
};

/** Bounds must be supplied together or omitted together. */
const variableBoundsRule = {
  oneOf: [
    { required: ["min", "max"] },
    { not: { anyOf: [{ required: ["min"] }, { required: ["max"] }] } },
  ],
} as const;

/** Strict schema of one optimization variable, one branch per parameter shape. */
export const optimizationVariableSchema = Type.Union(
  CONSTRUCTIONAL_PARAMETER_SHAPES.map((shape) =>
    Type.Object(
      {
        ...shape.ref,
        min: Type.Optional(finiteNumberSchema),
        max: Type.Optional(finiteNumberSchema),
      },
      { additionalProperties: false, ...variableBoundsRule },
    ),
  ),
);

/** Strict schema of one optimization pickup, one branch per parameter shape. */
export const optimizationPickupSchema = Type.Union(
  CONSTRUCTIONAL_PARAMETER_SHAPES.map((shape) =>
    Type.Object(
      {
        ...shape.ref,
        source_surface_index: parameterSurfaceIndexSchema,
        ...shape.pickupSource,
        scale: finiteNumberSchema,
        offset: finiteNumberSchema,
      },
      { additionalProperties: false },
    ),
  ),
);
