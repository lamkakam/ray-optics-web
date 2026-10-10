/** Reusable numeric TypeBox primitives shared by every optical-model schema. */
import Type from "typebox";

/** Numeric schema that rejects JavaScript non-finite values through the project `finiteNumber` AJV keyword. */
export const finiteNumberSchema = Type.Number({ finiteNumber: true });

/** Finite-number schema constrained to values greater than zero. */
export const positiveFiniteNumberSchema = Type.Number({
  finiteNumber: true,
  exclusiveMinimum: 0,
});
