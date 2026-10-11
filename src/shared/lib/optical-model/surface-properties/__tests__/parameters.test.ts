import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  applyParameterValue,
  CONSTRUCTIONAL_PARAMETER_SHAPES,
  OPTIMIZATION_OPT_OUTS,
  parameterKindsOf,
  type ConstructionalParameterRef,
} from "@/shared/lib/optical-model/surface-properties/parameters";
import { SURFACE_PROPERTY_KEYS } from "@/shared/lib/optical-model/surface-properties/registry";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: {
      space: "object",
      type: "angle",
      isRelative: true,
      maxField: 5,
      fields: [0, 1],
    },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
  ],
};

describe("constructional-parameter registry", () => {
  it("sets every surface property through a parameter shape or opts it out explicitly, never both", () => {
    const optimizable = CONSTRUCTIONAL_PARAMETER_SHAPES.flatMap(
      (shape) => shape.properties,
    );
    const optedOut = Object.keys(OPTIMIZATION_OPT_OUTS);

    expect(optimizable.filter((key) => optedOut.includes(key))).toEqual([]);
    expect([...new Set([...optimizable, ...optedOut])].sort()).toEqual(
      [...SURFACE_PROPERTY_KEYS].sort(),
    );
  });

  it("assigns every parameter kind to exactly one shape", () => {
    const kinds = CONSTRUCTIONAL_PARAMETER_SHAPES.flatMap(parameterKindsOf);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "radius",
        "thickness",
        "asphere_conic_constant",
        "asphere_toric_sweep_radius",
        "asphere_polynomial_coefficient",
        "decenter_alpha",
        "decenter_y",
      ]),
    );
  });

  it("writes radius to the image plane at index surfaces + 1", () => {
    const next = applyParameterValue(
      model,
      { kind: "radius", surface_index: 2 },
      -80,
    );
    expect(next.image.curvatureRadius).toBe(-80);
    expect(next.surfaces[0].curvatureRadius).toBe(50);
  });

  it("materializes a missing asphere and trims trailing zero coefficients", () => {
    const ref: ConstructionalParameterRef = {
      kind: "asphere_polynomial_coefficient",
      asphere_kind: "YToroid",
      coefficient_index: 1,
      surface_index: 1,
    };
    expect(
      applyParameterValue(model, ref, 3e-5).surfaces[0].aspherical,
    ).toEqual({
      kind: "YToroid",
      conicConstant: 0,
      toricSweepRadiusOfCurvature: 50,
      polynomialCoefficients: [0, 3e-5],
    });
  });

  it("materializes a missing decenter with the referenced strategy", () => {
    const next = applyParameterValue(
      model,
      {
        kind: "decenter_beta",
        decenter_type: "dec and return",
        surface_index: 1,
      },
      2.5,
    );
    expect(next.surfaces[0].decenter).toEqual({
      coordinateSystemStrategy: "dec and return",
      alpha: 0,
      beta: 2.5,
      gamma: 0,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("rejects an unknown parameter kind", () => {
    expect(() =>
      applyParameterValue(
        model,
        {
          kind: "bogus",
          surface_index: 1,
        } as unknown as ConstructionalParameterRef,
        1,
      ),
    ).toThrow("Unknown constructional parameter kind: bogus");
  });
});
