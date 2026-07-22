/** Optimization-specific contracts shared by the UI and Pyodide worker boundary. */
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";

/** Worker-supported optimizer families. */
export type OptimizerKind = "least_squares" | "differential_evolution";
/** Worker-supported SciPy least-squares methods. */
export type LeastSquaresMethod = "trf" | "lm";
/** Worker-supported merit operand discriminators. */
export type OptimizationOperandKind =
  | "focal_length"
  | "f_number"
  | "opd_difference"
  | "opd_difference_tangential"
  | "opd_difference_sagittal"
  | "rms_spot_size"
  | "rms_wavefront_error"
  | "ray_fan"
  | "ray_fan_tangential"
  | "ray_fan_sagittal";

/** Targeted scalar or target-less vector operand configuration. */
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

/**
 * Complete Python optimization configuration.
 * Least-squares and differential-evolution settings remain discriminated by
 * optimizer kind; bounded runs populate variable limits while LM may omit them.
 */
export interface OptimizationConfig {
  /** Solver-specific configuration discriminated by optimizer kind. */
  readonly optimizer:
    | {
        readonly kind: "least_squares";
        readonly method: LeastSquaresMethod;
        readonly max_nfev: number;
        readonly ftol: number;
        readonly xtol: number;
        readonly gtol: number;
      }
    | {
        readonly kind: "differential_evolution";
        readonly max_nfev: number;
        readonly tol: number;
        readonly atol: number;
      };
  /** Independently optimized radius, thickness, or asphere terms. */
  readonly variables: ReadonlyArray<OptimizationVariableConfig>;
  /** Radius, thickness, or asphere terms derived from another term. */
  readonly pickups: ReadonlyArray<OptimizationPickupConfig>;
  readonly merit_function: {
    readonly operands: ReadonlyArray<OptimizationOperandConfig>;
  };
}

/** Variable configuration discriminated by radius, thickness, or asphere term kind. */
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

/** Pickup configuration, including coefficient-to-coefficient source indices where required. */
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

/** Initial or final optimized value returned by Python. */
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

/** Evaluated pickup value returned by Python. */
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

/** One scalar residual; target is absent for target-less vector operands. */
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

/** One chronological merit-history sample. */
export interface OptimizationProgressEntry {
  readonly iteration: number;
  readonly merit_function_value: number;
  readonly log10_merit_function_value: number;
}

/** Python optimization report with snake_case keys preserved for direct JSON parsing. */
export interface OptimizationReport {
  readonly success: boolean;
  readonly status: string;
  readonly message: string;
  /** Solver identity plus optional solve metadata available after a full run. */
  readonly optimizer: {
    readonly kind: OptimizerKind;
    readonly method?: LeastSquaresMethod;
    readonly nfev?: number;
    readonly nit?: number;
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
  /** Chronological raw and precomputed log10 merit history. */
  readonly optimization_progress: ReadonlyArray<OptimizationProgressEntry>;
}

/** Optimized optical model paired with its worker report. */
export interface OptimizationRunResult {
  readonly model: OpticalModel;
  readonly report: OptimizationReport;
}
