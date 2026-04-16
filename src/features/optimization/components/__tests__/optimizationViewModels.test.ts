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
      weight: "1",
      value: "98.5",
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
});
