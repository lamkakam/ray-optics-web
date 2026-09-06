import { validateLensPrescription } from "@/shared/lib/schemas/prescriptionSchema";

const prescription = {
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [{
    label: "Default",
    comment: "front",
    curvatureRadius: 50,
    thickness: 5,
    medium: "N-BK7",
    manufacturer: "Schott",
    semiDiameter: 10,
    clear_aperture: { shape: "annular", obstructionRadius: 2, offsetX: 0, offsetY: 0 },
    aspherical: { kind: "EvenAspherical", conicConstant: -1, polynomialCoefficients: [1e-5] },
    decenter: { coordinateSystemStrategy: "bend", alpha: 1, beta: 2, gamma: 3, offsetX: 0, offsetY: 0 },
    diffractiveElement: { diffractionGrating: { lpmm: 1200, order: 1 } },
  }],
  image: { curvatureRadius: 0 },
};

describe("validateLensPrescription", () => {
  it("accepts a complete prescription with advanced structures", () => {
    expect(validateLensPrescription(prescription)).toBe(true);
  });

  it.each([
    ["missing object", { surfaces: [], image: { curvatureRadius: 0 } }],
    ["unknown property", { ...prescription, internalId: "row-1" }],
    ["reflective object medium", { ...prescription, object: { ...prescription.object, medium: "REFL" } }],
    ["non-finite number", { ...prescription, image: { curvatureRadius: Infinity } }],
    ["bad asphere discriminator", { ...prescription, surfaces: [{ ...prescription.surfaces[0], aspherical: { kind: "Odd", conicConstant: 0 } }] }],
    ["too many coefficients", { ...prescription, surfaces: [{ ...prescription.surfaces[0], aspherical: { kind: "EvenAspherical", conicConstant: 0, polynomialCoefficients: Array(11).fill(0) } }] }],
    ["bad decenter strategy", { ...prescription, image: { curvatureRadius: 0, decenter: { coordinateSystemStrategy: "move", alpha: 0, beta: 0, gamma: 0, offsetX: 0, offsetY: 0 } } }],
    ["non-positive rectangle dimension", { ...prescription, surfaces: [{ ...prescription.surfaces[0], clear_aperture: { shape: "rectangular", xHalfWidth: 0, yHalfWidth: 1, rotation: 0, offsetX: 0, offsetY: 0 } }] }],
    ["oversized annular obstruction", { ...prescription, surfaces: [{ ...prescription.surfaces[0], semiDiameter: 3, clear_aperture: { shape: "annular", obstructionRadius: 4, offsetX: 0, offsetY: 0 } }] }],
    ["fractional diffraction order", { ...prescription, surfaces: [{ ...prescription.surfaces[0], diffractiveElement: { diffractionGrating: { lpmm: 1200, order: 1.5 } } }] }],
  ])("rejects %s", (_label, value) => {
    expect(validateLensPrescription(value)).toBe(false);
  });

  it.each(["object", "surfaces", "image"])("requires the root field %s", (field) => {
    const value = { ...prescription } as Record<string, unknown>;
    delete value[field];

    expect(validateLensPrescription(value)).toBe(false);
  });

  it.each(["label", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter"])(
    "requires every physical-surface field: %s",
    (field) => {
      const surface = { ...prescription.surfaces[0] } as Record<string, unknown>;
      delete surface[field];

      expect(validateLensPrescription({ ...prescription, surfaces: [surface] })).toBe(false);
    },
  );

  it("rejects unknown properties in nested structures", () => {
    expect(validateLensPrescription({
      ...prescription,
      object: { ...prescription.object, extra: true },
    })).toBe(false);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], decenter: { ...prescription.surfaces[0].decenter, extra: true } }],
    })).toBe(false);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], clear_aperture: { ...prescription.surfaces[0].clear_aperture, extra: true } }],
    })).toBe(false);
  });

  it.each(["bend", "dec and return", "decenter", "reverse"])(
    "accepts decenter strategy %s",
    (coordinateSystemStrategy) => {
      const decenter = { ...prescription.surfaces[0].decenter, coordinateSystemStrategy };

      expect(validateLensPrescription({
        ...prescription,
        surfaces: [{ ...prescription.surfaces[0], decenter }],
      })).toBe(true);
    },
  );

  it("rejects invalid enum values for labels, shapes, and strategies", () => {
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], label: "Object" }],
    })).toBe(false);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], clear_aperture: { shape: "circular", offsetX: 0, offsetY: 0 } }],
    })).toBe(true);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], clear_aperture: { shape: "ellipse", offsetX: 0, offsetY: 0 } }],
    })).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite values in every numeric boundary: %p",
    (value) => {
      expect(validateLensPrescription({
        ...prescription,
        object: { ...prescription.object, distance: value },
      })).toBe(false);
      expect(validateLensPrescription({
        ...prescription,
        surfaces: [{ ...prescription.surfaces[0], curvatureRadius: value }],
      })).toBe(false);
    },
  );

  it("enforces positive dimensions and the annular exclusive upper boundary", () => {
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], semiDiameter: 0, clear_aperture: { shape: "circular", offsetX: 0, offsetY: 0 } }],
    })).toBe(true);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], semiDiameter: 3, clear_aperture: { shape: "annular", obstructionRadius: 2.999, offsetX: 0, offsetY: 0 } }],
    })).toBe(true);
    expect(validateLensPrescription({
      ...prescription,
      surfaces: [{ ...prescription.surfaces[0], semiDiameter: 3, clear_aperture: { shape: "annular", obstructionRadius: 3, offsetX: 0, offsetY: 0 } }],
    })).toBe(false);
  });
});
