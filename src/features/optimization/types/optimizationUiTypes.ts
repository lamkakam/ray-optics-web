/** UI metadata types derived from the worker-boundary optimizer discriminated union. */
import type { OptimizationConfig, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type SharedOptimizerConfigByKind<TKind extends OptimizerKind> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>;

/** Method discriminator supported by one optimizer kind. */
export type OptimizerMethodKind<TKind extends OptimizerKind> =
  SharedOptimizerConfigByKind<TKind> extends { readonly method: infer TMethod extends string } ? TMethod : never;
/** Tolerance keys supported by one optimizer kind. */
export type OptimizerToleranceKind<TKind extends OptimizerKind> = Exclude<
  keyof SharedOptimizerConfigByKind<TKind>,
  "kind" | "method" | "max_nfev"
>;

/** Display and capability metadata for one optimizer method. */
export interface OptimizerMethodUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerMethodKind<TKind>;
  readonly label: string;
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

/** Display label and default for one optimizer tolerance. */
export interface OptimizerToleranceUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerToleranceKind<TKind>;
  readonly label: string;
  readonly default: number;
}

/** Metadata shared by optimizer kinds with and without method choices. */
export interface BaseOptimizerUiMetadata<TKind extends OptimizerKind> {
  readonly label: string;
  readonly tolerances: ReadonlyArray<OptimizerToleranceUiConfig<TKind>>;
}

/** Optimizer metadata that requires an explicit method choice. */
export interface OptimizerUiMetadataWithMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly methods: ReadonlyArray<OptimizerMethodUiConfig<TKind>>;
}

/** Optimizer metadata whose capabilities live directly on the optimizer kind. */
export interface OptimizerUiMetadataWithoutMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
  readonly methods?: undefined;
}

/** Method-based or methodless optimizer metadata. */
export type OptimizerUiMetadata<TKind extends OptimizerKind> =
  | OptimizerUiMetadataWithMethods<TKind>
  | OptimizerUiMetadataWithoutMethods<TKind>;

/** Complete UI metadata map; least squares must remain method-based. */
export type OptimizerUiConfig = {
  readonly least_squares: OptimizerUiMetadataWithMethods<"least_squares">;
} & {
  readonly [TKind in Exclude<OptimizerKind, "least_squares">]: OptimizerUiMetadata<TKind>;
};
