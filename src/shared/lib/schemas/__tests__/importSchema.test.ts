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
  object: { distance: 1e10, medium: "air", manufacturer: "" },
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

  it("rejects models with missing object medium", () => {
    const model = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        manufacturer: baseModel.object.manufacturer,
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects models with missing object manufacturer", () => {
    const model = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        medium: baseModel.object.medium,
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects models with REFL object medium", () => {
    const model: OpticalModel = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        medium: "REFL",
        manufacturer: "",
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

  it("accepts circular aperture fields on a surface", () => {
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
          clear_aperture: { shape: "circular", offsetX: -1.25, offsetY: 2.5 },
          edge_aperture: { shape: "circular", radius: 4, offsetX: 0, offsetY: -3.5 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts annular clear aperture fields on a surface", () => {
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
          clear_aperture: { shape: "annular", obstructionRadius: 2, offsetX: -1.25, offsetY: 2.5 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it.each([0, -1, 5, 6, Number.POSITIVE_INFINITY])("rejects annular obstruction radius %s", (obstructionRadius) => {
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
          clear_aperture: { shape: "annular", obstructionRadius, offsetX: 0, offsetY: 0 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects annular clear aperture with unexpected keys", () => {
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
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 2,
            offsetX: 0,
            offsetY: 0,
            radius: 5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects legacy circular aperture fields without offsets", () => {
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
          clear_aperture: { shape: "circular" },
          edge_aperture: { shape: "circular", radius: 4 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([
    ["clear_aperture", "offsetX", "1"],
    ["clear_aperture", "offsetY", Number.POSITIVE_INFINITY],
    ["edge_aperture", "offsetX", "1"],
    ["edge_aperture", "offsetY", Number.POSITIVE_INFINITY],
  ] as const)("rejects %s with invalid %s", (apertureKey, offsetKey, offsetValue) => {
    const clearAperture = { shape: "circular", offsetX: 0, offsetY: 0 };
    const edgeAperture = { shape: "circular", radius: 4, offsetX: 0, offsetY: 0 };
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
          clear_aperture: apertureKey === "clear_aperture"
            ? { ...clearAperture, [offsetKey]: offsetValue }
            : clearAperture,
          edge_aperture: apertureKey === "edge_aperture"
            ? { ...edgeAperture, [offsetKey]: offsetValue }
            : edgeAperture,
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([0, -1, Number.POSITIVE_INFINITY])("rejects edge aperture radius %s", (radius) => {
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
          edge_aperture: { shape: "circular", radius, offsetX: 0, offsetY: 0 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects unsupported aperture shape and unexpected aperture keys", () => {
    const invalidShapeModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: { shape: "rectangular" },
        },
      ],
    };
    const extraKeyModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          edge_aperture: { shape: "circular", radius: 4, offsetX: 0, offsetY: 0, mode: "local" },
        },
      ],
    };

    expect(validateImportedLensData(invalidShapeModel)).toBe(false);
    expect(validateImportedLensData(extraKeyModel)).toBe(false);
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
