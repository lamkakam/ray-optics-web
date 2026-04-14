import type { OpticalModel } from "@/shared/lib/types/opticalModel";

export type OptimizerKind = "least_squares";
export type LeastSquaresMethod = "trf";
export type OptimizationOperandKind =
  | "focal_length"
  | "f_number"
  | "rms_spot_size"
  | "rms_wavefront_error";

export interface OptimizationConfig {
  readonly optimizer: {
    readonly kind: OptimizerKind;
    readonly method: LeastSquaresMethod;
    readonly max_nfev: number;
    readonly ftol: number;
    readonly xtol: number;
    readonly gtol: number;
  };
  readonly variables: ReadonlyArray<{
    readonly kind: "radius" | "thickness";
    readonly surface_index: number;
    readonly min: number;
    readonly max: number;
  }>;
  readonly pickups: ReadonlyArray<{
    readonly kind: "radius" | "thickness";
    readonly surface_index: number;
    readonly source_surface_index: number;
    readonly scale: number;
    readonly offset: number;
  }>;
  readonly merit_function: {
    readonly operands: ReadonlyArray<{
      readonly kind: OptimizationOperandKind;
      readonly target: number;
      readonly weight: number;
      readonly fields?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
      readonly wavelengths?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
    }>;
  };
}

export interface OptimizationValueEntry {
  readonly kind: "radius" | "thickness";
  readonly surface_index: number;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
}

export interface OptimizationPickupEntry {
  readonly kind: "radius" | "thickness";
  readonly surface_index: number;
  readonly source_surface_index: number;
  readonly scale: number;
  readonly offset: number;
  readonly value: number;
}

export interface OptimizationResidualEntry {
  readonly kind: string;
  readonly target: number;
  readonly value: number;
  readonly field_index?: number;
  readonly wavelength_index?: number;
  readonly operand_weight: number;
  readonly field_weight?: number;
  readonly wavelength_weight?: number;
  readonly total_weight: number;
  readonly weighted_residual: number;
}

export interface OptimizationReport {
  readonly success: boolean;
  readonly status: string;
  readonly message: string;
  readonly optimizer: {
    readonly kind: OptimizerKind;
    readonly method?: LeastSquaresMethod;
  };
  readonly initial_values: ReadonlyArray<OptimizationValueEntry>;
  readonly final_values: ReadonlyArray<OptimizationValueEntry>;
  readonly pickups: ReadonlyArray<OptimizationPickupEntry>;
  readonly residuals: ReadonlyArray<OptimizationResidualEntry>;
  readonly merit_function: {
    readonly sum_of_squares: number;
    readonly rss: number;
  };
}

export interface OptimizationRunResult {
  readonly model: OpticalModel;
  readonly report: OptimizationReport;
}
