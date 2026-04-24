import type { OptimizationConfig, OptimizerKind } from "@/shared/lib/types/optimization";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];

type OptimizerMethodKind<TKind extends OptimizerKind> = Extract<SharedOptimizerConfig, { readonly kind: TKind }>["method"];
type OptimizerToleranceKind<TKind extends OptimizerKind> = Exclude<
  keyof Extract<SharedOptimizerConfig, { readonly kind: TKind }>,
  "kind" | "method" | "max_nfev"
>;

export interface OptimizerMethodUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerMethodKind<TKind>;
  readonly label: string;
  readonly use_bounds: boolean;
}

export interface OptimizerToleranceUiConfig<TKind extends OptimizerKind> {
  readonly kind: OptimizerToleranceKind<TKind>;
  readonly label: string;
  readonly default: number;
}

export interface OptimizerUiMetadata<TKind extends OptimizerKind> {
  readonly label: string;
  readonly methods: ReadonlyArray<OptimizerMethodUiConfig<TKind>>;
  readonly tolerances: ReadonlyArray<OptimizerToleranceUiConfig<TKind>>;
}

export type OptimizerUiConfig = {
  readonly [TKind in OptimizerKind]: OptimizerUiMetadata<TKind>;
};

export const OPTIMIZER_UI_CONFIG = {
  least_squares: {
    label: "Least Squares",
    methods: [
      { kind: "trf", use_bounds: true, label: "Trust Region Reflective" },
      { kind: "lm", use_bounds: false, label: "Levenberg-Marquardt" },
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
