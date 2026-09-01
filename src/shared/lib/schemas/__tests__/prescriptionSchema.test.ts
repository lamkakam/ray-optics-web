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
});
