/** Zernike coefficient payload with direct metrics and sampling metadata. */
export interface ZernikeData {
  readonly coefficients: readonly number[];
  readonly rms_normalized_coefficients: readonly number[];
  /** Weighted standard deviation of accepted OPD samples in waves. */
  readonly rms_wfe: number;
  readonly pv_wfe: number;
  readonly weighted_mean_wfe: number;
  readonly fit_residual_rms: number;
  readonly fit_rank: number;
  readonly condition_number: number;
  /** Coherent intensity at the selected reference point, without peak search. */
  readonly strehl_ratio: number;
  readonly strehl_assumption: "uniform_scalar_amplitude_at_reference_point";
  readonly num_terms: number;
  readonly field_index: number;
  readonly wavelength_nm: number;
  /** Pupil coordinate space used for fitting and quadrature. */
  readonly pupil_space: ZernikePupilSpace;
  readonly sampling_measure:
    | "projected_reference_sphere_area"
    | "uniform_normalized_input_pupil_cells";
  readonly normalization:
    | "chief_ray_centered_enclosing_circle"
    | "normalized_input_pupil"
    | "existing_afocal_normalized_pupil";
  readonly reference_kind: "finite_reference_sphere" | "afocal_plane_wave";
  readonly reference_length_unit?: string;
  readonly reference_radius?: number;
  readonly reference_center?: readonly [number, number, number];
  readonly reference_pupil_point?: readonly [number, number, number];
  readonly reference_x_axis?: readonly [number, number, number];
  readonly reference_y_axis?: readonly [number, number, number];
  readonly reference_z_axis?: readonly [number, number, number];
  readonly normalization_radius: number;
  readonly support_area: number;
  readonly support_coverage: number;
  readonly sample_count: number;
  readonly boundary_resolution: number;
  readonly boundary_converged: boolean;
}

/** Frontend-selected coefficient indexing convention. */
export type ZernikeOrdering = "noll" | "fringe";

/** Pupil coordinate space used to sample and fit Zernike polynomials. */
export type ZernikePupilSpace = "entrance" | "exit";
