import { createEvaluationRow } from "@/features/optimization/components/optimizationViewModels";
import type { OptimizationResidualEntry } from "@/shared/lib/types/optimization";

describe("createEvaluationRow", () => {
  it("creates a table row for residuals with a non-zero effective weight", () => {
    const residual: OptimizationResidualEntry = {
      kind: "focal_length",
      target: 100,
      value: 98.5,
      operand_weight: 1,
      field_weight: 1,
      wavelength_weight: 1,
      total_weight: 1,
      weighted_residual: -1.5,
    };

    expect(createEvaluationRow(residual, 0)).toEqual({
      id: "focal_length-none-none-0",
      operandType: "Paraxial focal length",
      target: "100",
      weight: "1.000000",
      value: "98.500000",
    });
  });

  it("formats weight and value with 6 decimal places", () => {
    const residual: OptimizationResidualEntry = {
      kind: "rms_spot_size",
      target: 0,
      value: 0.25,
      field_index: 1,
      wavelength_index: 2,
      operand_weight: 0.125,
      field_weight: 1,
      wavelength_weight: 1,
      total_weight: 0.125,
      weighted_residual: 0.03125,
    };

    expect(createEvaluationRow(residual, 3)).toEqual({
      id: "rms_spot_size-1-2-3",
      operandType: "RMS Spot Size",
      target: "0",
      weight: "0.125000",
      value: "0.250000",
    });
  });

  it("omits table rows for residuals with a zero effective weight", () => {
    const residual: OptimizationResidualEntry = {
      kind: "rms_spot_size",
      target: 0,
      value: 0.25,
      field_index: 1,
      wavelength_index: 2,
      operand_weight: 1,
      field_weight: 0,
      wavelength_weight: 1,
      total_weight: 0,
      weighted_residual: 0,
    };

    expect(createEvaluationRow(residual, 0)).toBeUndefined();
  });

  it("formats target-less residuals as N/A", () => {
    const residual: OptimizationResidualEntry = {
      kind: "ray_fan",
      value: 0.25,
      field_index: 1,
      wavelength_index: 2,
      operand_weight: 0.125,
      field_weight: 1,
      wavelength_weight: 1,
      total_weight: 0.125,
      weighted_residual: 0.03125,
    };

    expect(createEvaluationRow(residual, 3)).toEqual({
      id: "ray_fan-1-2-3",
      operandType: "Ray Fan",
      target: "N/A",
      weight: "0.125000",
      value: "0.250000",
    });
  });
});
