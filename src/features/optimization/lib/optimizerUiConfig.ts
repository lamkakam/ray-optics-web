import type { OptimizationConfig, OptimizerKind } from "@/shared/lib/types/optimization";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type SharedOptimizerConfigByKind<TKind extends string> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>;

type OptimizerMethodKind<TKind extends string> =
  SharedOptimizerConfigByKind<TKind> extends { readonly method: infer TMethod extends string } ? TMethod : never;
type OptimizerToleranceKind<TKind extends string> = Exclude<
  keyof SharedOptimizerConfigByKind<TKind>,
  "kind" | "method" | "max_nfev"
>;

export interface OptimizerMethodUiConfig<TKind extends string> {
  readonly kind: OptimizerMethodKind<TKind>;
  readonly label: string;
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

export interface OptimizerToleranceUiConfig<TKind extends string> {
  readonly kind: OptimizerToleranceKind<TKind>;
  readonly label: string;
  readonly default: number;
}

interface BaseOptimizerUiMetadata<TKind extends string> {
  readonly label: string;
  readonly tolerances: ReadonlyArray<OptimizerToleranceUiConfig<TKind>>;
}

export interface OptimizerUiMetadataWithMethods<TKind extends string> extends BaseOptimizerUiMetadata<TKind> {
  readonly methods: ReadonlyArray<OptimizerMethodUiConfig<TKind>>;
}

export interface OptimizerUiMetadataWithoutMethods<TKind extends string> extends BaseOptimizerUiMetadata<TKind> {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
  readonly methods?: undefined;
}

export type OptimizerUiMetadata<TKind extends string> =
  | OptimizerUiMetadataWithMethods<TKind>
  | OptimizerUiMetadataWithoutMethods<TKind>;

export function optimizerUiMetadataHasMethods<TKind extends string>(
  metadata: OptimizerUiMetadata<TKind>,
): metadata is OptimizerUiMetadataWithMethods<TKind> {
  return metadata.methods !== undefined;
}

export type OptimizerUiConfig = {
  readonly least_squares: OptimizerUiMetadataWithMethods<"least_squares">;
} & {
  readonly [TKind in Exclude<OptimizerKind, "least_squares">]: OptimizerUiMetadata<TKind>;
};

export const OPTIMIZER_UI_CONFIG = {
  least_squares: {
    label: "Least Squares",
    methods: [
      {
        kind: "trf",
        canUseBounds: true,
        requiresResidualCountAtLeastVariableCount: false,
        label: "Trust Region Reflective",
      },
      {
        kind: "lm",
        canUseBounds: false,
        requiresResidualCountAtLeastVariableCount: true,
        label: "Levenberg-Marquardt",
      },
    ],
    tolerances: [
      { kind: "ftol", label: "Merit function change tolerance", default: 1e-5 },
      { kind: "xtol", label: "Independent variable change tolerance", default: 1e-5 },
      { kind: "gtol", label: "Gradient tolerance", default: 1e-5 },
    ],
  },
} satisfies OptimizerUiConfig;

export function formatOptimizerUiDefaultValue(value: number): string {
  return value.toExponential().replace(".0e", "e");
}
