import type { OptimizationConfig, OptimizerKind } from "@/shared/lib/types/optimization";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type SharedOptimizerConfigByKind<TKind extends OptimizerKind> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>;

type OptimizerMethodKind<TKind extends OptimizerKind> =
  SharedOptimizerConfigByKind<TKind> extends { readonly method: infer TMethod extends string } ? TMethod : never;
type OptimizerToleranceKind<TKind extends OptimizerKind> = Exclude<
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

interface BaseOptimizerUiMetadata<TKind extends OptimizerKind> {
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

export function optimizerUiMetadataHasMethods<TKind extends OptimizerKind>(
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
