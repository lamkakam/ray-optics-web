/**
 * Registry-driven operations on surfaces and the image plane. Each function
 * visits the registered properties of its owner, so a new surface property is
 * picked up without changes here. Absent optional values are skipped and never
 * materialized.
 */
import type {
  Surface,
  Surfaces,
} from "@/shared/lib/optical-model/model/opticalModel";
import type {
  ImagePropertyKey,
  PythonLine,
  SurfacePropertyKey,
} from "@/shared/lib/optical-model/surface-properties/descriptor";
import {
  IMAGE_PROPERTY_KEYS,
  SURFACE_PROPERTIES,
  SURFACE_PROPERTY_KEYS,
} from "@/shared/lib/optical-model/surface-properties/registry";

/** Descriptor view with its per-key value type erased, for iterating mixed keys. */
interface ErasedDescriptor {
  readonly default?: unknown;
  readonly scale: (value: unknown, factor: number) => unknown;
  readonly reverse: (value: unknown) => unknown;
  readonly python?: {
    readonly surface?: (
      surface: Surface,
      targetExpr: string,
    ) => readonly PythonLine[];
    readonly image?: (
      value: unknown,
      targetExpr: string,
    ) => readonly PythonLine[];
  };
  readonly needsWavelengthOverlay?: (value: unknown) => boolean;
}

function descriptorOf(key: SurfacePropertyKey): ErasedDescriptor {
  return SURFACE_PROPERTIES[key] as unknown as ErasedDescriptor;
}

function mapProperties<T extends object>(
  owner: T,
  keys: readonly SurfacePropertyKey[],
  transform: (descriptor: ErasedDescriptor, value: unknown) => unknown,
): T {
  const result = { ...owner } as Record<string, unknown>;
  const record = owner as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) {
      result[key] = transform(descriptorOf(key), value);
    }
  }
  return result as T;
}

/** Scales every registered physical-surface property; unregistered fields pass through. */
export function scaleSurface<T extends Partial<Surface>>(
  surface: T,
  factor: number,
): T {
  return mapProperties(surface, SURFACE_PROPERTY_KEYS, (descriptor, value) =>
    descriptor.scale(value, factor),
  );
}

/** Scales every registered image-plane property; unregistered fields pass through. */
export function scaleImage<T extends Partial<Surfaces["image"]>>(
  image: T,
  factor: number,
): T {
  return mapProperties(image, IMAGE_PROPERTY_KEYS, (descriptor, value) =>
    descriptor.scale(value, factor),
  );
}

/** Returns the surface as traversed in the opposite direction, applying every property's `reverse`. */
export function reverseSurface<T extends Partial<Surface>>(surface: T): T {
  return mapProperties(surface, SURFACE_PROPERTY_KEYS, (descriptor, value) =>
    descriptor.reverse(value),
  );
}

function collectNumbersDeep(value: unknown): number[] {
  if (typeof value === "number") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectNumbersDeep(item));
  }
  if (value === undefined || value === null || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap((item) => collectNumbersDeep(item));
}

/** Collects every number held by the registered properties of `owner`, in registry order. */
function collectPropertyNumbers(
  owner: object,
  keys: readonly SurfacePropertyKey[],
): number[] {
  const record = owner as Record<string, unknown>;
  return keys.flatMap((key) => collectNumbersDeep(record[key]));
}

/** Every number in a surface's registered properties, including preserved angles and densities. */
export function collectSurfaceNumbers(surface: Partial<Surface>): number[] {
  return collectPropertyNumbers(surface, SURFACE_PROPERTY_KEYS);
}

/** Every number in the image plane's registered properties. */
export function collectImageNumbers(
  image: Partial<Surfaces["image"]>,
): number[] {
  return collectPropertyNumbers(image, IMAGE_PROPERTY_KEYS);
}

/** Copies the registered surface properties that are present, dropping absent optional keys. */
export function pickSurfaceProperties(
  surface: Partial<Surface>,
): Partial<Surface> {
  return pickProperties(surface, SURFACE_PROPERTY_KEYS);
}

/** Copies the registered image-plane properties that are present. */
export function pickImageProperties(
  image: Partial<Surfaces["image"]>,
): Partial<Surfaces["image"]> {
  return pickProperties(image, IMAGE_PROPERTY_KEYS);
}

function pickProperties<T extends object>(
  owner: T,
  keys: readonly SurfacePropertyKey[],
): Partial<T> {
  const record = owner as Record<string, unknown>;
  return Object.fromEntries(
    keys.flatMap((key) =>
      record[key] === undefined ? [] : [[key, record[key]]],
    ),
  ) as Partial<T>;
}

/** Builds a complete surface, filling omitted required properties with their registry defaults. */
export function completeSurface(surface: Partial<Surface>): Surface {
  return Object.fromEntries(
    SURFACE_PROPERTY_KEYS.flatMap((key) => {
      const value = surface[key] ?? descriptorOf(key).default;
      return value === undefined ? [] : [[key, value]];
    }),
  ) as Surface;
}

/** Builds a complete image plane, filling omitted required properties with their registry defaults. */
export function completeImage(
  image: Partial<Surfaces["image"]>,
): Surfaces["image"] {
  return Object.fromEntries(
    IMAGE_PROPERTY_KEYS.flatMap((key) => {
      const value = image[key] ?? descriptorOf(key).default;
      return value === undefined ? [] : [[key, value]];
    }),
  ) as Surfaces["image"];
}

/** Statements that configure the image plane at `targetExpr`, in registry order. */
export function imagePythonLines(
  image: Surfaces["image"],
  targetExpr: string,
): PythonLine[] {
  return IMAGE_PROPERTY_KEYS.flatMap((key: ImagePropertyKey) => {
    const value = image[key];
    const emit = descriptorOf(key).python?.image;
    return value === undefined || emit === undefined
      ? []
      : [...emit(value, targetExpr)];
  });
}

/** Statements emitted after `sm.add_surface(...)` for one surface, in registry order. */
export function surfacePythonLines(
  surface: Surface,
  targetExpr: string,
): PythonLine[] {
  return SURFACE_PROPERTY_KEYS.flatMap((key) => [
    ...(descriptorOf(key).python?.surface?.(surface, targetExpr) ?? []),
  ]);
}

/** Whether any registered property asks the lens layout to draw per-wavelength ray fans. */
export function surfaceNeedsWavelengthOverlay(surface: Surface): boolean {
  const record = surface as Record<string, unknown>;
  return SURFACE_PROPERTY_KEYS.some((key) => {
    const value = record[key];
    const needsOverlay = descriptorOf(key).needsWavelengthOverlay;
    return value !== undefined && needsOverlay?.(value) === true;
  });
}
