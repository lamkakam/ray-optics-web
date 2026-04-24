import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";

export type OptimizerKind = "least_squares";
export type LeastSquaresMethod = "trf" | "lm";
export type OptimizationOperandKind =
  | "focal_length"
  | "f_number"
  | "opd_difference"
  | "rms_spot_size"
  | "rms_wavefront_error"
  | "ray_fan";

export type OptimizationOperandConfig =
  | {
      readonly kind: OptimizationOperandKind;
      readonly target: number;
      readonly weight: number;
      readonly fields?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
      readonly wavelengths?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
      readonly options?: { readonly num_rays?: number };
    }
  | {
      readonly kind: OptimizationOperandKind;
      readonly target?: undefined;
      readonly weight: number;
      readonly fields?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
      readonly wavelengths?: ReadonlyArray<{ readonly index: number; readonly weight: number }>;
      readonly options?: { readonly num_rays?: number };
    };

export interface OptimizationConfig {
  readonly optimizer: {
    readonly kind: OptimizerKind;
    readonly method: LeastSquaresMethod;
    readonly max_nfev: number;
    readonly ftol: number;
    readonly xtol: number;
    readonly gtol: number;
  };
  readonly variables: ReadonlyArray<OptimizationVariableConfig>;
  readonly pickups: ReadonlyArray<OptimizationPickupConfig>;
  readonly merit_function: {
    readonly operands: ReadonlyArray<OptimizationOperandConfig>;
  };
}

export type OptimizationVariableConfig =
  | {
      readonly kind: "radius" | "thickness";
      readonly surface_index: number;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly kind: "asphere_conic_constant" | "asphere_toric_sweep_radius";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly kind: "asphere_polynomial_coefficient";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly coefficient_index: number;
      readonly min?: number;
      readonly max?: number;
    };

export type OptimizationPickupConfig =
  | {
      readonly kind: "radius" | "thickness";
      readonly surface_index: number;
      readonly source_surface_index: number;
      readonly scale: number;
      readonly offset: number;
    }
  | {
      readonly kind: "asphere_conic_constant" | "asphere_toric_sweep_radius";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly source_surface_index: number;
      readonly scale: number;
      readonly offset: number;
    }
  | {
      readonly kind: "asphere_polynomial_coefficient";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly coefficient_index: number;
      readonly source_surface_index: number;
      readonly source_coefficient_index: number;
      readonly scale: number;
      readonly offset: number;
    };

export type OptimizationValueEntry =
  | {
      readonly kind: "radius" | "thickness";
      readonly surface_index: number;
      readonly value: number;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly kind: "asphere_conic_constant" | "asphere_toric_sweep_radius";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly value: number;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly kind: "asphere_polynomial_coefficient";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly coefficient_index: number;
      readonly value: number;
      readonly min?: number;
      readonly max?: number;
    };

export type OptimizationPickupEntry =
  | {
      readonly kind: "radius" | "thickness";
      readonly surface_index: number;
      readonly source_surface_index: number;
      readonly scale: number;
      readonly offset: number;
      readonly value: number;
    }
  | {
      readonly kind: "asphere_conic_constant" | "asphere_toric_sweep_radius";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly source_surface_index: number;
      readonly scale: number;
      readonly offset: number;
      readonly value: number;
    }
  | {
      readonly kind: "asphere_polynomial_coefficient";
      readonly surface_index: number;
      readonly asphere_kind: AsphericalType;
      readonly coefficient_index: number;
      readonly source_surface_index: number;
      readonly source_coefficient_index: number;
      readonly scale: number;
      readonly offset: number;
      readonly value: number;
    };

export interface OptimizationResidualEntry {
  readonly kind: string;
  readonly target?: number;
  readonly value: number;
  readonly field_index?: number;
  readonly wavelength_index?: number;
  readonly operand_weight: number;
  readonly field_weight?: number;
  readonly wavelength_weight?: number;
  readonly total_weight: number;
  readonly weighted_residual: number;
}

export interface OptimizationProgressEntry {
  readonly iteration: number;
  readonly merit_function_value: number;
  readonly log10_merit_function_value: number;
}

export interface OptimizationReport {
  readonly success: boolean;
  readonly status: string;
  readonly message: string;
  readonly optimizer: {
    readonly kind: OptimizerKind;
    readonly method?: LeastSquaresMethod;
    readonly nfev?: number;
    readonly njev?: number;
    readonly cost?: number;
    readonly optimality?: number;
  };
  readonly initial_values: ReadonlyArray<OptimizationValueEntry>;
  readonly final_values: ReadonlyArray<OptimizationValueEntry>;
  readonly pickups: ReadonlyArray<OptimizationPickupEntry>;
  readonly residuals: ReadonlyArray<OptimizationResidualEntry>;
  readonly merit_function: {
    readonly sum_of_squares: number;
    readonly rss: number;
  };
  readonly optimization_progress: ReadonlyArray<OptimizationProgressEntry>;
}

export interface OptimizationRunResult {
  readonly model: OpticalModel;
  readonly report: OptimizationReport;
}
