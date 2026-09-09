/**
 * App-lifetime cache for serialized analysis results. The outer LRU retains at
 * most three canonical `(OpticalModel instance, ImagePoint)` entries, while
 * each entry coalesces promises by the selectors relevant to one computation.
 * Rejected promises are removed so later requests retry.
 */
import { LRUCache } from "lru-cache";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";

/** Canonical identity key; `model` is compared by object identity. */
export interface AnalysisCacheKey {
  readonly model: OpticalModel;
  readonly imagePoint: ImagePoint;
}

type CacheEntry = Map<string, Promise<unknown>>;
type ModelKeys = Partial<Record<ImagePoint, AnalysisCacheKey>>;

let keyRegistry = new WeakMap<OpticalModel, ModelKeys>();
const cache = new LRUCache<AnalysisCacheKey, CacheEntry>({ max: 3 });

function canonicalKey(model: OpticalModel, imagePoint: ImagePoint): AnalysisCacheKey {
  let modelKeys = keyRegistry.get(model);
  if (modelKeys === undefined) {
    modelKeys = {};
    keyRegistry.set(model, modelKeys);
  }
  let key = modelKeys[imagePoint];
  if (key === undefined) {
    key = { model, imagePoint };
    modelKeys[imagePoint] = key;
  }
  return key;
}

/** Returns a cached promise or starts and caches one request. */
export function getCachedAnalysis<T>(
  model: OpticalModel,
  imagePoint: ImagePoint,
  requestKey: string,
  load: () => Promise<T>,
): Promise<T> {
  const key = canonicalKey(model, imagePoint);
  let entry = cache.get(key);
  if (entry === undefined) {
    entry = new Map();
    cache.set(key, entry);
  }

  const existing = entry.get(requestKey) as Promise<T> | undefined;
  if (existing !== undefined) return existing;

  let promise: Promise<T>;
  try {
    promise = Promise.resolve(load());
  } catch (error: unknown) {
    if (entry.size === 0 && cache.peek(key) === entry) cache.delete(key);
    return Promise.reject(error);
  }
  entry.set(requestKey, promise);
  void promise.catch(() => {
    if (entry?.get(requestKey) !== promise) return;
    entry.delete(requestKey);
    if (entry.size === 0 && cache.peek(key) === entry) cache.delete(key);
  });
  return promise;
}

/** Clears every cached analysis result, including in-flight promises. */
export function clearAnalysisCache(): void {
  cache.clear();
}

/** Resets cache and weak key registry for test/singleton lifecycle isolation. */
export function _resetAnalysisCache(): void {
  clearAnalysisCache();
  keyRegistry = new WeakMap<OpticalModel, ModelKeys>();
}
