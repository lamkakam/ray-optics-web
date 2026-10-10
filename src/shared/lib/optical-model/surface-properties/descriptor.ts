/**
 * Pure (React-free, worker-safe) contract that every surface property implements.
 * One descriptor per `Surface` key owns the property's scaling, reversal, and
 * RayOptics script emission, so consumers iterate the registry instead of
 * hard-coding each property. Required keys carry the editor default used when a
 * grid row omits them; optional keys carry none.
 */
import type {
  Surface,
  Surfaces,
} from "@/shared/lib/optical-model/model/opticalModel";

/** One line of generated Python source. */
export type PythonLine = string;

/** Every key of a physical surface. */
export type SurfacePropertyKey = keyof Surface;

/** Keys shared by the image plane; their values have the same types as on a surface. */
export type ImagePropertyKey = keyof Surfaces["image"];

/** Present value of one surface property. */
export type SurfacePropertyValue<K extends SurfacePropertyKey> = NonNullable<
  Surface[K]
>;

type PropertyPresence<K extends SurfacePropertyKey> =
  undefined extends Surface[K]
    ? { readonly default?: undefined }
    : {
        /** Editor default applied when a grid row omits this required value. */
        readonly default: Surface[K];
      };

/** Behavior owned by one surface property. */
export type SurfacePropertyDescriptor<K extends SurfacePropertyKey> = {
  readonly key: K;
  /** Scales linear dimensions by `factor`; angles, densities, and dimensionless values are preserved. */
  readonly scale: (
    value: SurfacePropertyValue<K>,
    factor: number,
  ) => SurfacePropertyValue<K>;
  /** Returns the value for the same surface traversed in the opposite direction (sag z → −z). */
  readonly reverse: (value: SurfacePropertyValue<K>) => SurfacePropertyValue<K>;
  /** RayOptics statements emitted after the surface is added (`surface`) or for the image plane (`image`). */
  readonly python?: {
    readonly surface?: (
      surface: Surface,
      targetExpr: string,
    ) => readonly PythonLine[];
    readonly image?: (
      value: SurfacePropertyValue<K>,
      targetExpr: string,
    ) => readonly PythonLine[];
  };
  /** Whether the lens layout should draw per-wavelength ray fans for this value. */
  readonly needsWavelengthOverlay?: (value: SurfacePropertyValue<K>) => boolean;
} & PropertyPresence<K>;

/** Complete registry: the compiler requires a descriptor for every `Surface` key. */
export type SurfacePropertyRegistry = {
  readonly [K in SurfacePropertyKey]-?: SurfacePropertyDescriptor<K>;
};

/** Returns the value unchanged. */
export function identity<T>(value: T): T {
  return value;
}

/** Multiplies a linear dimension by the scale factor. */
export function scaleLinear(value: number, factor: number): number {
  return value * factor;
}

/** Negates a number without producing `-0`. */
export function negateNumber(value: number): number {
  const negated = -value;
  return Object.is(negated, -0) ? 0 : negated;
}
