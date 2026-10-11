/**
 * Optimizable asphere terms. Every reference carries the `asphere_kind` the
 * optimizer must materialize; writing a value to a surface without that asphere
 * creates it with a zero conic constant, ten zero coefficients, and (for
 * toroids) a sweep radius equal to the surface radius.
 */
import Type from "typebox";
import type {
  AsphericalConfig,
  AsphericalType,
  Surface,
} from "@/shared/lib/optical-model/model/opticalModel";
import { ASPHERE_VARIANTS } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.variants";
import {
  defineParameterShape,
  parameterSurfaceIndexSchema,
  updateSurfaceAt,
} from "@/shared/lib/optical-model/surface-properties/parameterShape";

const COEFFICIENT_SLOTS = 10;

const ASPHERE_KINDS = Object.keys(ASPHERE_VARIANTS) as AsphericalType[];

/** Asphere kinds that carry polynomial coefficients. */
const COEFFICIENT_ASPHERE_KINDS = ASPHERE_KINDS.filter(
  (kind) => ASPHERE_VARIANTS[kind].coefficientOrder !== undefined,
) as Exclude<AsphericalType, "Conic">[];

function padCoefficients(coefficients: readonly number[]): number[] {
  const next = [...coefficients];
  while (next.length < COEFFICIENT_SLOTS) {
    next.push(0);
  }
  return next.slice(0, COEFFICIENT_SLOTS);
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

/** Returns the surface's asphere converted to `kind`, padding coefficients to ten slots. */
function asphereOfKind(
  surface: Surface,
  kind: AsphericalType,
): AsphericalConfig {
  const existing = surface.aspherical;
  if (kind === "Conic") {
    return { kind, conicConstant: existing?.conicConstant ?? 0 };
  }

  const polynomialCoefficients = padCoefficients(
    existing !== undefined && existing.kind !== "Conic"
      ? existing.polynomialCoefficients
      : [],
  );
  if (kind === "XToroid" || kind === "YToroid") {
    return {
      kind,
      conicConstant: existing?.conicConstant ?? 0,
      toricSweepRadiusOfCurvature:
        existing?.kind === "XToroid" || existing?.kind === "YToroid"
          ? existing.toricSweepRadiusOfCurvature
          : surface.curvatureRadius,
      polynomialCoefficients,
    };
  }
  return {
    kind,
    conicConstant: existing?.conicConstant ?? 0,
    polynomialCoefficients,
  };
}

/** Conic-constant and toroid sweep-radius parameters. */
export const asphereScalarParameterShape = defineParameterShape({
  properties: ["aspherical"],
  ref: {
    kind: Type.Enum(["asphere_conic_constant", "asphere_toric_sweep_radius"], {
      type: "string",
    }),
    asphere_kind: Type.Enum(ASPHERE_KINDS, { type: "string" }),
    surface_index: parameterSurfaceIndexSchema,
  },
  pickupSource: {},
  applyValue: (model, ref, value) =>
    updateSurfaceAt(model, ref.surface_index, (surface) => {
      const aspherical = asphereOfKind(surface, ref.asphere_kind);
      if (ref.kind === "asphere_conic_constant") {
        return {
          ...surface,
          aspherical: { ...aspherical, conicConstant: value },
        };
      }
      return aspherical.kind === "XToroid" || aspherical.kind === "YToroid"
        ? {
            ...surface,
            aspherical: { ...aspherical, toricSweepRadiusOfCurvature: value },
          }
        : { ...surface, aspherical };
    }),
});

/** Polynomial-coefficient parameters; pickups may source another coefficient, including one on the same surface. */
export const asphereCoefficientParameterShape = defineParameterShape({
  properties: ["aspherical"],
  ref: {
    kind: Type.Literal("asphere_polynomial_coefficient"),
    asphere_kind: Type.Enum(COEFFICIENT_ASPHERE_KINDS, { type: "string" }),
    coefficient_index: Type.Integer({ minimum: 0 }),
    surface_index: parameterSurfaceIndexSchema,
  },
  pickupSource: { source_coefficient_index: Type.Integer({ minimum: 0 }) },
  applyValue: (model, ref, value) =>
    updateSurfaceAt(model, ref.surface_index, (surface) => {
      const aspherical = asphereOfKind(surface, ref.asphere_kind);
      if (aspherical.kind === "Conic") {
        return { ...surface, aspherical };
      }
      const coefficients = padCoefficients(aspherical.polynomialCoefficients);
      coefficients[ref.coefficient_index] = value;
      return {
        ...surface,
        aspherical: {
          ...aspherical,
          polynomialCoefficients: trimTrailingZeroCoefficients(coefficients),
        },
      };
    }),
});
