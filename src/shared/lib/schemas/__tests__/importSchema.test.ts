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

  it("accepts models with conic aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "Conic",
            conicConstant: -1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with even aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: 0,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with radial polynomial aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "RadialPolynomial",
            conicConstant: 0,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with x toroid aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "XToroid",
            conicConstant: 0,
            toricSweepRadiusOfCurvature: 20,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with y toroid aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "YToroid",
            conicConstant: 0,
            toricSweepRadiusOfCurvature: 20,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("rejects legacy aspherical surfaces without kind", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            conicConstant: -1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("accepts models with diffraction grating on a surface", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractionGrating: {
            lpmm: 1000,
            order: 1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("rejects diffraction grating with non-numeric lpmm", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractionGrating: {
            lpmm: "1000",
            order: 1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects diffraction grating with non-integer order", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractionGrating: {
            lpmm: 1000,
            order: 1.5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects diffraction grating with unexpected keys", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractionGrating: {
            lpmm: 1000,
            order: 1,
            grooveShape: "sawtooth",
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });
});
