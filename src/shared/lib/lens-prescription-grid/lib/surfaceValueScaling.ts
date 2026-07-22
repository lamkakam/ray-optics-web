/**
 * Table-driven scaling for numeric values owned by Object, Surface, and Image rows.
 * The same policy drives transformation and finite/underflow validation coverage.
 */
import type {
  ClearAperture,
  DecenterConfig,
  EdgeAperture,
  Surface,
  Surfaces,
} from "@/shared/lib/types/opticalModel";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

/** Object distances at or above this value represent infinity and are preserved during scaling. */
export const OBJECT_DISTANCE_INFINITY_THRESHOLD = 1e10;

/** Transforms one policy-owned value using its parent object and scale factor. */
export type SurfaceValueScaler<TValue = unknown, TParent = unknown> = (
  value: TValue,
  factor: number,
  parent: TParent,
) => TValue;

type AnySurfaceValueScaler = (value: never, factor: number, parent: never) => unknown;

/** Recursive scaling-policy entry; `undefined` preserves a numeric field while keeping it in validation. */
export type SurfaceValueScalingPolicyEntry =
  | AnySurfaceValueScaler
  | undefined
  | { readonly [field: string]: SurfaceValueScalingPolicyEntry };

/** Type-safe partial scaling policy for an optical-model object. */
export type OpticalModelValueScalingPolicy<T extends object> = {
  readonly [K in keyof T]?: SurfaceValueScaler<T[K], T> | SurfaceValueScalingPolicyEntry;
};

/** Scaling ownership policy. Linear dimensions multiply by the factor; asphere coefficients divide by the factor raised to their radial order minus one; angular and dimensionless values are preserved. Radial-polynomial orders are sequential, while even and toroidal polynomial orders are even. */
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

/** Object-row branch of the shared scaling policy. */
export const OBJECT_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.object;
/** Image-row branch of the shared scaling policy. */
export const IMAGE_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.image;
/** Physical-surface branch of the shared scaling policy. */
export const SURFACE_VALUE_SCALERS = SURFACE_VALUE_SCALING_POLICY.surface;

function isScaler(policy: SurfaceValueScalingPolicyEntry): policy is AnySurfaceValueScaler {
  return typeof policy === "function";
}

function scaleNumber(value: number, factor: number): number {
  return value * factor;
}

/** Scales finite object distances below the infinity threshold and preserves larger values. */
export function scaleObjectDistance(distance: number, factor: number): number {
  return distance < OBJECT_DISTANCE_INFINITY_THRESHOLD ? scaleNumber(distance, factor) : distance;
}

/** Scales decenter offsets while preserving angular coordinates. */
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

/** Scales clear-aperture dimensions and offsets while preserving rectangular rotation. */
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

/** Scales edge-aperture dimensions and offsets while preserving rectangular rotation. */
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

/** Scales toroidal sweep radii and polynomial coefficients while preserving conic constants. */
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

/** Scales the dimensional fields owned by an Object row. */
export function scaleObjectSurface(
  row: Extract<GridRow, { kind: "object" }>,
  factor: number,
): Extract<GridRow, { kind: "object" }> {
  return {
    ...row,
    objectDistance: applyScalingPolicy(row.objectDistance, OBJECT_VALUE_SCALERS.distance, factor, row),
  };
}

/** Scales the dimensional fields owned by an Image row. */
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

/** Scales the dimensional fields owned by one physical Surface row. */
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

/** Dispatches scaling by grid-row kind. */
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

/** Collects every numeric value covered by the policy, including preserved fields, for finite and precision-underflow validation. */
export function collectSurfaceScalingNumericValues(row: GridRow): number[] {
  if (row.kind === "object") {
    return collectByPolicy({ distance: row.objectDistance }, SURFACE_VALUE_SCALING_POLICY.object);
  }

  return collectByPolicy(row, SURFACE_VALUE_SCALING_POLICY[row.kind]);
}
