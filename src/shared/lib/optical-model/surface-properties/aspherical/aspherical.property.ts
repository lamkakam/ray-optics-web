/**
 * Descriptor for the optional discriminated asphere. Scaling divides each
 * polynomial coefficient by the factor raised to its radial order minus one and
 * scales a toroid's sweep radius linearly; conic constants are dimensionless.
 * Reversal negates every sag term (polynomial coefficients and toroid sweep
 * radius) so that, together with the negated base radius, the sag becomes −z;
 * conic constants are unchanged because the conic sag is odd in curvature.
 */
import type { AsphericalConfig } from "@/shared/lib/optical-model/model/opticalModel";
import { ASPHERE_VARIANTS } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.variants";
import {
  negateNumber,
  scaleLinear,
  type PythonLine,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";

function scaleAspherical(
  aspherical: AsphericalConfig,
  factor: number,
): AsphericalConfig {
  if (aspherical.kind === "Conic") {
    return aspherical;
  }

  const coefficientOrder = ASPHERE_VARIANTS[aspherical.kind].coefficientOrder;
  const polynomialCoefficients = aspherical.polynomialCoefficients.map(
    (coefficient, index) =>
      coefficient / factor ** (coefficientOrder(index) - 1),
  );

  if (aspherical.kind === "XToroid" || aspherical.kind === "YToroid") {
    return {
      ...aspherical,
      toricSweepRadiusOfCurvature: scaleLinear(
        aspherical.toricSweepRadiusOfCurvature,
        factor,
      ),
      polynomialCoefficients,
    };
  }

  return { ...aspherical, polynomialCoefficients };
}

function reverseAspherical(aspherical: AsphericalConfig): AsphericalConfig {
  if (aspherical.kind === "Conic") {
    return aspherical;
  }

  const polynomialCoefficients =
    aspherical.polynomialCoefficients.map(negateNumber);

  if (aspherical.kind === "XToroid" || aspherical.kind === "YToroid") {
    return {
      ...aspherical,
      toricSweepRadiusOfCurvature: negateNumber(
        aspherical.toricSweepRadiusOfCurvature,
      ),
      polynomialCoefficients,
    };
  }

  return { ...aspherical, polynomialCoefficients };
}

/**
 * Formats `<target>.profile = <Class>(r=<curvatureRadius>, cc=..., [rR=...,] [coefs=[...]])`;
 * `r` repeats the surface curvature radius. Toroids pass the sweep radius as
 * RayOptics' `rR`; its `cR` keyword is the sweep curvature (`rR = 1/cR`).
 */
function formatAsphereAssignment(
  targetExpr: string,
  curvatureRadius: number,
  aspherical: AsphericalConfig,
): PythonLine {
  const profileClass = ASPHERE_VARIANTS[aspherical.kind].pythonClass;
  const toricSweep =
    aspherical.kind === "XToroid" || aspherical.kind === "YToroid"
      ? `, rR=${aspherical.toricSweepRadiusOfCurvature}`
      : "";
  const coefficients =
    aspherical.kind === "Conic"
      ? ""
      : `, coefs=${JSON.stringify(aspherical.polynomialCoefficients)}`;
  return `${targetExpr}.profile = ${profileClass}(r=${curvatureRadius}, cc=${aspherical.conicConstant}${toricSweep}${coefficients})`;
}

/** Optional conic, polynomial, or toroidal asphere replacing the spherical profile. */
export const asphericalProperty = {
  key: "aspherical",
  scale: scaleAspherical,
  reverse: reverseAspherical,
  python: {
    surface: (surface, targetExpr) =>
      surface.aspherical === undefined
        ? []
        : [
            formatAsphereAssignment(
              targetExpr,
              surface.curvatureRadius,
              surface.aspherical,
            ),
          ],
  },
} as const satisfies SurfacePropertyDescriptor<"aspherical">;
