import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.7, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 1],
        [656.273, 1],
      ],
      referenceIndex: 1,
    },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [],
};

describe("validateImportedLensData", () => {
  it("accepts models with field.isWideAngle set to true", () => {
    const model: OpticalModel = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: true,
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with field.isWideAngle set to false", () => {
    const model: OpticalModel = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: false,
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with field.isWideAngle omitted", () => {
    expect(validateImportedLensData(baseModel)).toBe(true);
  });

  it("rejects models with non-boolean field.isWideAngle", () => {
    const model = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: "yes",
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });
});
