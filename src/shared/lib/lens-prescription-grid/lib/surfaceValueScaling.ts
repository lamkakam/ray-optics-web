/**
 * Pure scaling policy and helpers for numeric values owned by lens prescription grid object, surface, and image rows. The module centralizes which numeric fields participate in scale formatting, which fields are preserved, and which values are collected for formatting validation.
 *
 * @remarks
 * ## Scaling Policy
 *
 * - Executable scaling is table-driven through `SURFACE_VALUE_SCALING_POLICY`. Top-level object keys are derived from `Surfaces["object"]`, `Surfaces["image"]`, and `Surface` instead of being duplicated as untyped string lists.
 * - A policy leaf that is a function transforms the matching value. A policy leaf that is `undefined` preserves the matching value while still including numeric values in validation.
 * - Linear dimensions multiply by `factor`: object distance below `1e10`, surface and image curvature radius, surface thickness, semi-diameter, decenter offsets, clear aperture offsets and dimensional fields, edge aperture offsets and dimensional fields, and toroid sweep radius.
 * - Asphere polynomial coefficients divide by `factor ** (order - 1)`.
 * - `RadialPolynomial` coefficient orders are `1..n`.
 * - `EvenAspherical`, `XToroid`, and `YToroid` coefficient orders are `2, 4, ...`.
 * - Dimensionless or angular values are preserved: conic constants, decenter `alpha`/`beta`/`gamma`, rectangular aperture rotation, diffraction grating `lpmm`, and diffraction grating `order`.
 * - Object distances at or above `1e10` are preserved.
 *
 * `collectSurfaceScalingNumericValues` walks `SURFACE_VALUE_SCALING_POLICY` and collects all numeric values covered by the policy, including preserved values. This keeps finite-number and precision-underflow validation aligned with the same fields that scale formatting recognizes.
 */
import type {
  ClearAperture,
  DecenterConfig,
  EdgeAperture,
  Surface,
  Surfaces,
} from "@/shared/lib/types/opticalModel";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

export const OBJECT_DISTANCE_INFINITY_THRESHOLD = 1e10;

export type SurfaceValueScaler<TValue = unknown, TParent = unknown> = (
  value: TValue,
  factor: number,
  parent: TParent,
) => TValue;

type AnySurfaceValueScaler = (value: never, factor: number, parent: never) => unknown;

export type SurfaceValueScalingPolicyEntry =
  | AnySurfaceValueScaler
  | undefined
  | { readonly [field: string]: SurfaceValueScalingPolicyEntry };

export type OpticalModelValueScalingPolicy<T extends object> = {
  readonly [K in keyof T]?: SurfaceValueScaler<T[K], T> | SurfaceValueScalingPolicyEntry;
};

export const SURFACE_VALUE_SCALING_POLICY = {
  object: {
    distance: scaleObjectDistance,
  },
  image: {
    curvatureRadius: scaleNumber,
    decenter: {
      alpha: undefined,
      beta: undefined,
      gamma: undefined,
      offsetX: scaleNumber,
      offsetY: scaleNumber,
    },
  },
  surface: {
    curvatureRadius: scaleNumber,
    thickness: scaleNumber,
    semiDiameter: scaleNumber,
    clear_aperture: {
      offsetX: scaleNumber,
      offsetY: scaleNumber,
      obstructionRadius: scaleNumber,
      xHalfWidth: scaleNumber,
      yHalfWidth: scaleNumber,
      rotation: undefined,
    },
    edge_aperture: {
      radius: scaleNumber,
      offsetX: scaleNumber,
      offsetY: scaleNumber,
      xHalfWidth: scaleNumber,
      yHalfWidth: scaleNumber,
      rotation: undefined,
    },
    aspherical: {
      conicConstant: undefined,
      toricSweepRadiusOfCurvature: scaleNumber,
      polynomialCoefficients: (
        polynomialCoefficients: number[],
        factor: number,
        aspherical: NonNullable<Surface["aspherical"]>,
      ) =>
        scaleAsphericalPolynomialCoefficients(polynomialCoefficients, factor, aspherical),
    },
    decenter: {
      alpha: undefined,
      beta: undefined,
      gamma: undefined,
      offsetX: scaleNumber,
      offsetY: scaleNumber,
    },
    diffractionGrating: {
      lpmm: undefined,
      order: undefined,
    },
  },
} as const satisfies {
  readonly object: OpticalModelValueScalingPolicy<Surfaces["object"]>;
  readonly image: OpticalModelValueScalingPolicy<Surfaces["image"]>;
  readonly surface: OpticalModelValueScalingPolicy<Surface>;
};

export const OBJECT_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.object;
export const IMAGE_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.image;
export const SURFACE_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.surface;

function isScaler(policy: SurfaceValueScalingPolicyEntry): policy is AnySurfaceValueScaler {
  return typeof policy === "function";
}

function scaleNumber(value: number, factor: number): number {
  return value * factor;
}

export function scaleObjectDistance(distance: number, factor: number): number {
  return distance < OBJECT_DISTANCE_INFINITY_THRESHOLD ? scaleNumber(distance, factor) : distance;
}

export function scaleDecenter(decenter: DecenterConfig | undefined, factor: number): DecenterConfig | undefined {
  if (decenter === undefined) {
    return undefined;
  }

  return {
    ...decenter,
    offsetX: scaleNumber(decenter.offsetX, factor),
    offsetY: scaleNumber(decenter.offsetY, factor),
  };
}

export function scaleClearAperture(aperture: ClearAperture | undefined, factor: number): ClearAperture | undefined {
  if (aperture === undefined) {
    return undefined;
  }

  if (aperture.shape === "annular") {
    return {
      ...aperture,
      obstructionRadius: scaleNumber(aperture.obstructionRadius, factor),
      offsetX: scaleNumber(aperture.offsetX, factor),
      offsetY: scaleNumber(aperture.offsetY, factor),
    };
  }

  if (aperture.shape === "rectangular") {
    return {
      ...aperture,
      xHalfWidth: scaleNumber(aperture.xHalfWidth, factor),
      yHalfWidth: scaleNumber(aperture.yHalfWidth, factor),
      offsetX: scaleNumber(aperture.offsetX, factor),
      offsetY: scaleNumber(aperture.offsetY, factor),
    };
  }

  return {
    ...aperture,
    offsetX: scaleNumber(aperture.offsetX, factor),
    offsetY: scaleNumber(aperture.offsetY, factor),
  };
}

export function scaleEdgeAperture(aperture: EdgeAperture | undefined, factor: number): EdgeAperture | undefined {
  if (aperture === undefined) {
    return undefined;
  }

  if (aperture.shape === "rectangular") {
    return {
      ...aperture,
      xHalfWidth: scaleNumber(aperture.xHalfWidth, factor),
      yHalfWidth: scaleNumber(aperture.yHalfWidth, factor),
      offsetX: scaleNumber(aperture.offsetX, factor),
      offsetY: scaleNumber(aperture.offsetY, factor),
    };
  }

  return {
    ...aperture,
    radius: scaleNumber(aperture.radius, factor),
    offsetX: scaleNumber(aperture.offsetX, factor),
    offsetY: scaleNumber(aperture.offsetY, factor),
  };
}

export function scaleAspherical(
  aspherical: Extract<GridRow, { kind: "surface" }>["aspherical"],
  factor: number,
): Extract<GridRow, { kind: "surface" }>["aspherical"] {
  if (aspherical === undefined || aspherical.kind === "Conic") {
    return aspherical;
  }

  const scaleCoefficient = (coefficient: number, index: number): number => {
    const order = aspherical.kind === "RadialPolynomial" ? index + 1 : (index + 1) * 2;
    return coefficient / (factor ** (order - 1));
  };

  if (aspherical.kind === "XToroid" || aspherical.kind === "YToroid") {
    return {
      ...aspherical,
      toricSweepRadiusOfCurvature: scaleNumber(aspherical.toricSweepRadiusOfCurvature, factor),
      polynomialCoefficients: aspherical.polynomialCoefficients.map(scaleCoefficient),
    };
  }

  return {
    ...aspherical,
    polynomialCoefficients: aspherical.polynomialCoefficients.map(scaleCoefficient),
  };
}

function scaleAsphericalPolynomialCoefficients(
  polynomialCoefficients: number[],
  factor: number,
  aspherical: NonNullable<Extract<GridRow, { kind: "surface" }>["aspherical"]>,
): number[] {
  return polynomialCoefficients.map((coefficient, index) => {
    const order = aspherical.kind === "RadialPolynomial" ? index + 1 : (index + 1) * 2;
    return coefficient / (factor ** (order - 1));
  });
}

function applyScalingPolicy<T>(value: T, policy: SurfaceValueScalingPolicyEntry, factor: number, parent: unknown): T {
  if (policy === undefined) {
    return value;
  }

  if (isScaler(policy)) {
    return (policy as SurfaceValueScaler<T, unknown>)(value, factor, parent);
  }

  if (value === undefined || value === null || typeof value !== "object") {
    return value;
  }

  const result = { ...value } as Record<string, unknown>;
  const record = value as Record<string, unknown>;
  Object.entries(policy).forEach(([field, fieldPolicy]) => {
    if (!(field in record)) {
      return;
    }

    const scaledValue = applyScalingPolicy(record[field], fieldPolicy, factor, value);
    if (scaledValue !== undefined || field in record) {
      result[field] = scaledValue;
    }
  });

  return result as T;
}

export function scaleObjectSurface(
  row: Extract<GridRow, { kind: "object" }>,
  factor: number,
): Extract<GridRow, { kind: "object" }> {
  return {
    ...row,
    objectDistance: applyScalingPolicy(row.objectDistance, OBJECT_VALUE_SCALERS.distance, factor, row),
  };
}

export function scaleImageSurface(
  row: Extract<GridRow, { kind: "image" }>,
  factor: number,
): Extract<GridRow, { kind: "image" }> {
  const scaledRow = applyScalingPolicy(row, IMAGE_VALUE_SCALERS, factor, row);
  return {
    ...scaledRow,
    decenter: scaledRow.decenter,
  };
}

export function scaleNormalSurface(
  row: Extract<GridRow, { kind: "surface" }>,
  factor: number,
): Extract<GridRow, { kind: "surface" }> {
  const scaledRow = applyScalingPolicy(row, SURFACE_VALUE_SCALERS, factor, row);
  return {
    ...scaledRow,
    aspherical: scaledRow.aspherical,
    decenter: scaledRow.decenter,
  };
}

export function scaleSurfaceValueRow(row: Extract<GridRow, { kind: "object" }>, factor: number): Extract<GridRow, { kind: "object" }>;
export function scaleSurfaceValueRow(row: Extract<GridRow, { kind: "image" }>, factor: number): Extract<GridRow, { kind: "image" }>;
export function scaleSurfaceValueRow(row: Extract<GridRow, { kind: "surface" }>, factor: number): Extract<GridRow, { kind: "surface" }>;
export function scaleSurfaceValueRow(row: GridRow, factor: number): GridRow;
export function scaleSurfaceValueRow(row: GridRow, factor: number): GridRow {
  if (row.kind === "object") {
    return scaleObjectSurface(row, factor);
  }

  if (row.kind === "image") {
    return scaleImageSurface(row, factor);
  }

  return scaleNormalSurface(row, factor);
}

function collectNumbersDeep(value: unknown): number[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "number") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectNumbersDeep(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap((item) => collectNumbersDeep(item));
}

function collectByPolicy(value: unknown, policy: SurfaceValueScalingPolicyEntry): number[] {
  if (policy === undefined || isScaler(policy)) {
    return collectNumbersDeep(value);
  }

  if (value === undefined || value === null || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  return Object.entries(policy).flatMap(([field, fieldPolicy]) => collectByPolicy(record[field], fieldPolicy));
}

export function collectSurfaceScalingNumericValues(row: GridRow): number[] {
  if (row.kind === "object") {
    return collectByPolicy({ distance: row.objectDistance }, SURFACE_VALUE_SCALING_POLICY.object);
  }

  return collectByPolicy(row, SURFACE_VALUE_SCALING_POLICY[row.kind]);
}
