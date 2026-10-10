/** TypeBox schema and inferred types for discriminated conic, polynomial, and toroidal aspheres. */
import Type from "typebox";
import { finiteNumberSchema } from "@/shared/lib/optical-model/schema/primitives";

/** At most ten polynomial coefficients for coefficient-bearing aspheres. */
export const polynomialCoefficientsSchema = Type.Array(finiteNumberSchema, {
  maxItems: 10,
});

const strict = { additionalProperties: false } as const;

const polynomialAsphere = <TKind extends "EvenAspherical" | "RadialPolynomial">(
  kind: TKind,
) =>
  Type.Object(
    {
      kind: Type.Literal(kind),
      conicConstant: finiteNumberSchema,
      polynomialCoefficients: polynomialCoefficientsSchema,
    },
    strict,
  );

const toroidalAsphere = <TKind extends "XToroid" | "YToroid">(kind: TKind) =>
  Type.Object(
    {
      kind: Type.Literal(kind),
      conicConstant: finiteNumberSchema,
      toricSweepRadiusOfCurvature: finiteNumberSchema,
      polynomialCoefficients: polynomialCoefficientsSchema,
    },
    strict,
  );

/** Supported discriminated conic, polynomial, and toroidal aspheres. */
export const asphericalSchema = Type.Union([
  Type.Object(
    { kind: Type.Literal("Conic"), conicConstant: finiteNumberSchema },
    strict,
  ),
  polynomialAsphere("EvenAspherical"),
  polynomialAsphere("RadialPolynomial"),
  toroidalAsphere("XToroid"),
  toroidalAsphere("YToroid"),
]);

/** At most ten polynomial coefficients for coefficient-bearing aspheres. */
export type AsphericalPolynomialCoeffs = Type.Static<
  typeof polynomialCoefficientsSchema
>;

/** Discriminated conic, polynomial, or toroidal asphere configuration. */
export type AsphericalConfig = Type.Static<typeof asphericalSchema>;

/** Supported aspherical configuration discriminators. */
export type AsphericalType = AsphericalConfig["kind"];
