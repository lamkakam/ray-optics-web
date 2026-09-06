import {
  createEvaluationRow,
  getRadiusLabel,
  getRadiusValue,
  getThicknessValue,
} from "@/features/optimization/lib/optimizationViewModels";
import type { OptimizationResidualEntry } from "@/features/optimization/types/optimizationWorkerTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [
    { label: "Default", curvatureRadius: 25, thickness: 4, medium: "air", manufacturer: "", semiDiameter: 5 },
    { label: "Stop", curvatureRadius: -30, thickness: 2, medium: "air", manufacturer: "", semiDiameter: 5 },
  ],
  image: { curvatureRadius: 100 },
  specs: {
    pupil: { space: "object", type: "epd", value: 1 },
    field: { space: "object", type: "angle", maxField: 1, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

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

  it("keeps a missing target empty while formatting a visible residual", () => {
    const row = createEvaluationRow({
      kind: "ray_fan_tangential",
      value: 0,
      operand_weight: 1,
      total_weight: 1,
      weighted_residual: 0,
    }, 0);

    expect(row?.target).toBe("N/A");
    expect(row?.weight).toBe("1.000000");
  });

  it("resolves labels for axis-specific operands", () => {
    expect(createEvaluationRow({
      kind: "opd_difference_tangential",
      target: 0,
      value: 0.25,
      field_index: 1,
      wavelength_index: 2,
      operand_weight: 1,
      field_weight: 1,
      wavelength_weight: 1,
      total_weight: 1,
      weighted_residual: 0.25,
    }, 0)?.operandType).toBe("OPD Difference (Tangential)");

    expect(createEvaluationRow({
      kind: "ray_fan_sagittal",
      value: 0.5,
      field_index: 1,
      wavelength_index: 2,
      operand_weight: 1,
      field_weight: 1,
      wavelength_weight: 1,
      total_weight: 1,
      weighted_residual: 0.5,
    }, 1)?.operandType).toBe("Ray Fan (Sagittal)");
  });
});

describe("optimization prescription view models", () => {
  it("labels physical surfaces and the image using one-based indices", () => {
    expect(getRadiusLabel(1, model)).toBe("Default");
    expect(getRadiusLabel(2, model)).toBe("Stop");
    expect(getRadiusLabel(3, model)).toBe("Image");
    expect(getRadiusLabel(4, model)).toBe("Surface 4");
  });

  it("reads radius and thickness values at physical, image, and missing indices", () => {
    expect(getRadiusValue(model, 1)).toBe(25);
    expect(getRadiusValue(model, 3)).toBe(100);
    expect(getRadiusValue(model, 4)).toBe(0);
    expect(getThicknessValue(model, 2)).toBe(2);
    expect(getThicknessValue(model, 3)).toBe(0);
    expect(getThicknessValue(model, 4)).toBe(0);
  });
});
