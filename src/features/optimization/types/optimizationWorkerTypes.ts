/**
 * TypeScript types for the optimization UI and the Pyodide worker boundary.
 *
 * @remarks
 * ## Key Conventions
 *
 * - `OptimizationConfig` mirrors the config shape documented in `src/python/src/rayoptics_web_utils/optimization/optimization.py.md`.
 * - The module lives under `features/optimization/types/` because these contracts are specific to optimization, even when imported by shared worker hooks.
 * - `OptimizationConfig.optimizer` is a discriminated union:
 * least-squares configs include `kind: "least_squares"`, `method`, `max_nfev`, `ftol`, `xtol`, and `gtol`;
 * differential-evolution configs include `kind: "differential_evolution"`, `max_nfev`, `tol`, and `atol`.
 * - `variables` and `pickups` are discriminated unions. Supported kinds are `radius`, `thickness`, `asphere_conic_constant`, `asphere_polynomial_coefficient`, and `asphere_toric_sweep_radius`.
 * - `OptimizationConfig.variables[*].min` / `max` are present for bounded optimizer runs (`trf` and `differential_evolution`) and may be omitted for unbounded least-squares runs (`lm`).
 * - Asphere config/report entries carry `asphere_kind`; polynomial coefficient entries additionally carry `coefficient_index`, and coefficient pickups also carry `source_coefficient_index`.
 * - Merit operands and residual entries may omit `target` for target-less operands. Existing scalar operands still include numeric targets.
 * - `OptimizationReport` preserves the Python snake_case keys unchanged so the worker can parse the JSON directly.
 * - `OptimizationReport.optimizer` may include solver metadata such as `nfev`, `nit`, `njev`, `cost`, and `optimality` after a full optimization run.
 * - `OptimizationReport.optimization_progress` is always a chronological list of merit-history samples; each entry exposes the raw `merit_function_value` used by the progress chart plus the precomputed `log10_merit_function_value` for consumers that need a transformed value.
 */
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";

export type OptimizerKind = "least_squares" | "differential_evolution";
export type LeastSquaresMethod = "trf" | "lm";
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
  readonly optimization_progress: ReadonlyArray<OptimizationProgressEntry>;
}

export interface OptimizationRunResult {
  readonly model: OpticalModel;
  readonly report: OptimizationReport;
}
