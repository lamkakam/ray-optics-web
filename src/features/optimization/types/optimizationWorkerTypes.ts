/** Optimization-specific contracts shared by the UI and Pyodide worker boundary. */
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";

/** Worker-supported continuous optimizer families. */
export type ContinuousOptimizerKind = "least_squares" | "differential_evolution";
/** Optimizer families selectable by the Optimization UI. */
export type OptimizerKind = ContinuousOptimizerKind | "glass_expert";
/** Worker-supported SciPy least-squares methods. */
export type LeastSquaresMethod = "trf" | "lm";
/** Catalogs eligible for glass-expert candidate substitution. */
export type GlassCatalogName =
  | "CDGM"
  | "Hikari"
  | "Hoya"
  | "Ohara"
  | "Schott"
  | "Sumita"
  | "Special"
  | "Custom";
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
 * Solver-specific continuous optimizer configuration.
 * Least-squares and differential-evolution settings remain discriminated by
 * optimizer kind; bounded runs populate variable limits while LM may omit them.
 */
export type ContinuousOptimizerConfig =
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

/** UI-facing Glass Expert algorithm settings before they are nested in a run config. */
export interface GlassExpertOptimizerConfig {
  readonly kind: "glass_expert";
  readonly num_neighbours: number;
  readonly maxiter: number;
  readonly tol: number;
}

/** Any optimizer settings displayed by the Algorithm tab. */
export type OptimizationAlgorithmConfig = ContinuousOptimizerConfig | GlassExpertOptimizerConfig;

export interface OptimizationConfig {
  /** Solver-specific continuous configuration discriminated by optimizer kind. */
  readonly optimizer: ContinuousOptimizerConfig;
  /** Independently optimized radius, thickness, or asphere terms. */
  readonly variables: ReadonlyArray<OptimizationVariableConfig>;
  /** Radius, thickness, or asphere terms derived from another term. */
  readonly pickups: ReadonlyArray<OptimizationPickupConfig>;
  readonly merit_function: {
    readonly operands: ReadonlyArray<OptimizationOperandConfig>;
  };
}

/** Catalog-qualified real-glass candidate. */
export interface GlassCandidateConfig {
  readonly name: string;
  readonly catalog: GlassCatalogName;
}

/**
 * Flat mixed categorical/continuous glass-expert configuration.
 * Each numeric variable is either wholly unbounded or supplies finite strict
 * min/max bounds; candidate and surface ordering is significant.
 */
export interface GlassOptimizationConfig {
  readonly glass_optimizer?: {
    readonly num_neighbours?: number;
    readonly maxiter?: number;
    readonly tol?: number;
  };
  readonly glass_variables: ReadonlyArray<{
    readonly surface_index: number;
    readonly candidates: ReadonlyArray<GlassCandidateConfig>;
  }>;
  readonly variables: ReadonlyArray<OptimizationVariableConfig>;
  readonly pickups: ReadonlyArray<OptimizationPickupConfig>;
  readonly merit_function: {
    readonly operands: ReadonlyArray<OptimizationOperandConfig>;
  };
}

/** Config accepted by one of the two optimization worker run paths. */
export type OptimizationRunConfig = OptimizationConfig | GlassOptimizationConfig;

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
  /** Glass-expert phase; absent for ordinary continuous optimization. */
  readonly phase?: "global" | "local" | "polish";
  /** Candidate surface context; absent during final polishing. */
  readonly surface_index?: number;
  /** Candidate identity; absent during final polishing. */
  readonly candidate?: GlassCandidateConfig;
}

/**
 * Python optimization status. Numeric values come from completed SciPy solvers;
 * named values cover evaluation, successful special cases, interruption, and
 * rollback reports for ordinary Python failures.
 */
export type OptimizationStatus =
  | number
  | "evaluated"
  | "optimized"
  | "no_variables"
  | "stopped"
  | "error";

/**
 * Python optimization report with snake_case keys preserved for direct JSON
 * parsing. `status: "error"` is a resolved rollback report, not a rejected
 * worker transport call.
 */
export interface OptimizationReport {
  readonly success: boolean;
  readonly status: OptimizationStatus;
  readonly message: string;
  /** Solver identity plus optional solve metadata available after a full run. */
  readonly optimizer: {
    readonly kind: ContinuousOptimizerKind;
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

/** Material identity before or after a glass-expert run. */
export interface GlassOptimizationValueEntry extends GlassCandidateConfig {
  readonly surface_index: number;
}

/** Python glass-expert report with aggregate nested L-BFGS-B metadata. */
export interface GlassOptimizationReport extends Omit<OptimizationReport, "optimizer"> {
  readonly optimizer: {
    readonly kind: "glass_expert";
    readonly method: "L-BFGS-B";
    readonly runs: number;
    readonly nfev: number;
    readonly nit: number;
    readonly num_neighbours: number;
    readonly maxiter: number;
    readonly tol: number;
  };
  readonly initial_glasses: ReadonlyArray<GlassOptimizationValueEntry>;
  readonly final_glasses: ReadonlyArray<GlassOptimizationValueEntry>;
}

/** Report returned by one of the two optimization worker run paths. */
export type OptimizationRunReport = OptimizationReport | GlassOptimizationReport;

/** Optimized optical model paired with its continuous or mixed report. */
export interface OptimizationRunResult {
  readonly model: OpticalModel;
  readonly report: OptimizationRunReport;
}
