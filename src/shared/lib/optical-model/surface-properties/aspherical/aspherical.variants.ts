/**
 * Per-kind asphere facts shared by labels, scaling, and RayOptics emission. The
 * `satisfies` clause requires an entry for every `AsphericalType`.
 */
import type { AsphericalType } from "@/shared/lib/optical-model/model/opticalModel";

/** Static facts for one asphere kind. */
export interface AsphereVariant {
  /** User-facing type label. */
  readonly label: string;
  /** RayOptics profile class emitted for this kind. */
  readonly pythonClass:
    | "EvenPolynomial"
    | "RadialPolynomial"
    | "XToroid"
    | "YToroid";
  /** Radial order of polynomial coefficient `index`, or `undefined` when the kind has no coefficients. */
  readonly coefficientOrder: ((index: number) => number) | undefined;
}

const evenOrder = (index: number): number => (index + 1) * 2;

/** Asphere variants keyed by kind. Radial-polynomial orders are sequential; even and toroidal orders are even. */
export const ASPHERE_VARIANTS = {
  Conic: {
    label: "Conic",
    pythonClass: "EvenPolynomial",
    coefficientOrder: undefined,
  },
  EvenAspherical: {
    label: "Even Aspherical",
    pythonClass: "EvenPolynomial",
    coefficientOrder: evenOrder,
  },
  RadialPolynomial: {
    label: "Radial Polynomial",
    pythonClass: "RadialPolynomial",
    coefficientOrder: (index) => index + 1,
  },
  XToroid: {
    label: "X Toroid",
    pythonClass: "XToroid",
    coefficientOrder: evenOrder,
  },
  YToroid: {
    label: "Y Toroid",
    pythonClass: "YToroid",
    coefficientOrder: evenOrder,
  },
} as const satisfies Record<AsphericalType, AsphereVariant>;
