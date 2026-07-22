/**
 * Optimizer UI metadata/config type definitions consumed by `features/optimization/lib/optimizerUiConfig.ts`.
 *
 * @remarks
 * ## Key Conventions
 *
 * - The method and tolerance key types derive from `optimizationWorkerTypes.ts` so UI metadata cannot drift from the worker-boundary config contract.
 * - `OptimizerUiConfig` requires `least_squares` to remain method-based while allowing non-least-squares optimizers to use either metadata shape.
 * - This module exports only types; runtime UI metadata stays in `optimizerUiConfig.ts`.
 */
import type { OptimizationConfig, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type SharedOptimizerConfigByKind<TKind extends OptimizerKind> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>;

export type OptimizerMethodKind<TKind extends OptimizerKind> =
  SharedOptimizerConfigByKind<TKind> extends { readonly method: infer TMethod extends string } ? TMethod : never;
export type OptimizerToleranceKind<TKind extends OptimizerKind> = Exclude<
  keyof SharedOptimizerConfigByKind<TKind>,
  "kind" | "method" | "max_nfev"
>;

export interface OptimizerMethodUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerMethodKind<TKind>;
  readonly label: string;
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

export interface OptimizerToleranceUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerToleranceKind<TKind>;
  readonly label: string;
  readonly default: number;
}

export interface BaseOptimizerUiMetadata<TKind extends OptimizerKind> {
  readonly label: string;
  readonly tolerances: ReadonlyArray<OptimizerToleranceUiConfig<TKind>>;
}

export interface OptimizerUiMetadataWithMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly methods: ReadonlyArray<OptimizerMethodUiConfig<TKind>>;
}

export interface OptimizerUiMetadataWithoutMethods<TKind extends OptimizerKind> extends BaseOptimizerUiMetadata<TKind> {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
  readonly methods?: undefined;
}

export type OptimizerUiMetadata<TKind extends OptimizerKind> =
  | OptimizerUiMetadataWithMethods<TKind>
  | OptimizerUiMetadataWithoutMethods<TKind>;

export type OptimizerUiConfig = {
  readonly least_squares: OptimizerUiMetadataWithMethods<"least_squares">;
} & {
  readonly [TKind in Exclude<OptimizerKind, "least_squares">]: OptimizerUiMetadata<TKind>;
};
