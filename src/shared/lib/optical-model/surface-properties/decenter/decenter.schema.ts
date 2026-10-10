/** TypeBox schema and inferred type for a surface's tilt and decenter. */
import Type from "typebox";
import { finiteNumberSchema } from "@/shared/lib/optical-model/schema/primitives";

/** RayOptics coordinate-system strategies supported for tilt and decenter. */
export const coordinateSystemStrategySchema = Type.Enum(
  ["bend", "dec and return", "decenter", "reverse"],
  { type: "string" },
);

/** Strict schema for all supported decenter strategies and offsets. */
export const decenterConfigSchema = Type.Object(
  {
    coordinateSystemStrategy: coordinateSystemStrategySchema,
    /** Tilt about x, in degrees. */
    alpha: finiteNumberSchema,
    /** Tilt about y, in degrees. */
    beta: finiteNumberSchema,
    /** Tilt about z, in degrees. */
    gamma: finiteNumberSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
  { additionalProperties: false },
);

/** Surface orientation and signed positional offset. */
export type DecenterConfig = Type.Static<typeof decenterConfigSchema>;
