/**
 * Language-neutral description of every optimizable constructional parameter,
 * derived from the registered parameter shapes. It is committed as
 * `src/python/tests/fixtures/constructional_parameters.json`; a Jest test fails
 * when the fixture is stale and a pytest test checks the Python optimizer's
 * parameter kinds, accessors, and reference fields against it.
 */
import {
  CONSTRUCTIONAL_PARAMETER_SHAPES,
  parameterKindsOf,
  type ConstructionalParameterKind,
} from "@/shared/lib/optical-model/surface-properties/parameters";

/** Wire fields of one parameter kind. */
export interface ConstructionalParameterManifestEntry {
  readonly kind: ConstructionalParameterKind;
  /** Reference fields, including `kind` and `surface_index`, sorted. */
  readonly refFields: readonly string[];
  /** Pickup fields beyond `source_surface_index`, `scale`, and `offset`, sorted. */
  readonly pickupSourceFields: readonly string[];
}

/** Manifest committed for the Python parity test. */
export interface ConstructionalParameterManifest {
  readonly parameters: readonly ConstructionalParameterManifestEntry[];
}

/** Builds the manifest, sorted by kind. */
export function buildConstructionalParameterManifest(): ConstructionalParameterManifest {
  return {
    parameters: CONSTRUCTIONAL_PARAMETER_SHAPES.flatMap((shape) =>
      parameterKindsOf(shape).map((kind) => ({
        kind,
        refFields: Object.keys(shape.ref).sort(),
        pickupSourceFields: Object.keys(shape.pickupSource).sort(),
      })),
    ).sort((left, right) => left.kind.localeCompare(right.kind)),
  };
}
