/** UI metadata types derived from the worker-boundary optimizer discriminated union. */
import type {
  OptimizationAlgorithmConfig,
  OptimizerKind,
} from "@/features/optimization/types/optimizationWorkerTypes";

type SharedOptimizerConfig = OptimizationAlgorithmConfig;
type SharedOptimizerConfigByKind<TKind extends OptimizerKind> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>;

/** Method discriminator supported by one optimizer kind. */
export type OptimizerMethodKind<TKind extends OptimizerKind> =
  SharedOptimizerConfigByKind<TKind> extends { readonly method: infer TMethod extends string } ? TMethod : never;
/** Numeric field keys supported by one optimizer kind. */
export type OptimizerNumericFieldKind<TKind extends OptimizerKind> = Exclude<
  keyof SharedOptimizerConfigByKind<TKind>,
  "kind" | "method"
>;

/** Display and capability metadata for one optimizer method. */
export interface OptimizerMethodUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerMethodKind<TKind>;
  readonly label: string;
  readonly canUseBounds: boolean;
  readonly canOptimizeGlass: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

/** Supported validation rule for one string-backed numeric optimizer field. */
export type OptimizerNumericFieldValidation =
  | "positiveInteger"
  | "positiveFloat"
  | "nonNegativeFloat"
  | "leastSquaresTolerance";

/** Display label, default, and validation rule for one numeric optimizer field. */
export interface OptimizerNumericFieldUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerNumericFieldKind<TKind>;
  readonly label: string;
  readonly default: number;
  readonly validation: OptimizerNumericFieldValidation;
}

/** Metadata shared by optimizer kinds with and without method choices. */
export interface BaseOptimizerUiMetadata<TKind extends OptimizerKind> {
  readonly label: string;
  readonly numericFields: ReadonlyArray<OptimizerNumericFieldUiConfig<TKind>>;
}

/** Optimizer metadata that requires an explicit method choice. */
export interface OptimizerUiMetadataWithMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly methods: ReadonlyArray<OptimizerMethodUiConfig<TKind>>;
}

/** Optimizer metadata whose capabilities live directly on the optimizer kind. */
export interface OptimizerUiMetadataWithoutMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly canUseBounds: boolean;
  readonly canOptimizeGlass: boolean;
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
