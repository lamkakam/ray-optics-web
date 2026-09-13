/** Focused tests for dimensional ownership, row dispatch, and scaling validation inputs. */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  collectSurfaceScalingNumericValues,
  OBJECT_DISTANCE_INFINITY_THRESHOLD,
  scaleAspherical,
  scaleClearAperture,
  scaleEdgeAperture,
  scaleObjectDistance,
  scaleSurfaceValueRow,
} from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";

/** Creates a physical row with every policy-owned nested value populated. */
function createSurfaceRow(): Extract<GridRow, { kind: "surface" }> {
  return {
    kind: "surface",
    id: "surface-1",
    label: "Default",
    curvatureRadius: 10,
    thickness: 2,
    medium: "N-BK7",
    manufacturer: "Schott",
    semiDiameter: 5,
    clear_aperture: {
      shape: "ronchi",
      lpmm: 12,
      rotation: 15,
      offsetX: -1,
      offsetY: 2,
    },
    edge_aperture: {
      shape: "circular",
      radius: 4,
      offsetX: 0.5,
      offsetY: -0.75,
    },
    aspherical: {
      kind: "XToroid",
      conicConstant: -1,
      toricSweepRadiusOfCurvature: 20,
      polynomialCoefficients: [8, 12],
    },
    decenter: {
      coordinateSystemStrategy: "bend",
      alpha: 1,
      beta: 2,
      gamma: 3,
      offsetX: 4,
      offsetY: 5,
    },
    diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
  };
}

describe("surfaceValueScaling", () => {
  it("scales finite object distances below the inclusive infinity boundary", () => {
    expect(scaleObjectDistance(OBJECT_DISTANCE_INFINITY_THRESHOLD - 1, 2)).toBe(
      (OBJECT_DISTANCE_INFINITY_THRESHOLD - 1) * 2,
    );
    expect(scaleObjectDistance(OBJECT_DISTANCE_INFINITY_THRESHOLD, 2)).toBe(
      OBJECT_DISTANCE_INFINITY_THRESHOLD,
    );
    expect(scaleObjectDistance(OBJECT_DISTANCE_INFINITY_THRESHOLD + 1, 2)).toBe(
      OBJECT_DISTANCE_INFINITY_THRESHOLD + 1,
    );
  });

  it("scales Object, Image, and Surface rows through their own policy branches", () => {
    const object: Extract<GridRow, { kind: "object" }> = {
      kind: "object",
      id: "row-object",
      objectDistance: 100,
      medium: "air",
      manufacturer: "",
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "row-image",
      curvatureRadius: -8,
      decenter: {
        coordinateSystemStrategy: "decenter",
        alpha: 1,
        beta: 2,
        gamma: 3,
        offsetX: 4,
        offsetY: 5,
      },
    };
    const surface = createSurfaceRow();

    expect(scaleSurfaceValueRow(object, 2)).toMatchObject({
      objectDistance: 200,
      medium: "air",
    });
    expect(scaleSurfaceValueRow(image, 2)).toStrictEqual({
      kind: "image",
      id: "row-image",
      curvatureRadius: -16,
      decenter: {
        coordinateSystemStrategy: "decenter",
        alpha: 1,
        beta: 2,
        gamma: 3,
        offsetX: 8,
        offsetY: 10,
      },
    });
    expect(scaleSurfaceValueRow(surface, 2)).toMatchObject({
      curvatureRadius: 20,
      thickness: 4,
      semiDiameter: 10,
    });
  });

  it("scales clear and edge apertures by shape while preserving non-dimensional fields", () => {
    expect(scaleClearAperture(undefined, 2)).toBeUndefined();
    expect(
      scaleClearAperture({ shape: "circular", offsetX: -1, offsetY: 2 }, 2),
    ).toEqual({
      shape: "circular",
      offsetX: -2,
      offsetY: 4,
    });
    expect(
      scaleClearAperture(
        { shape: "annular", obstructionRadius: 3, offsetX: -1, offsetY: 2 },
        2,
      ),
    ).toEqual({
      shape: "annular",
      obstructionRadius: 6,
      offsetX: -2,
      offsetY: 4,
    });
    expect(
      scaleClearAperture(
        {
          shape: "rectangular",
          xHalfWidth: 4,
          yHalfWidth: 2,
          rotation: 15,
          offsetX: -1,
          offsetY: 2,
        },
        2,
      ),
    ).toEqual({
      shape: "rectangular",
      xHalfWidth: 8,
      yHalfWidth: 4,
      rotation: 15,
      offsetX: -2,
      offsetY: 4,
    });
    expect(
      scaleClearAperture(
        { shape: "ronchi", lpmm: 12, rotation: 15, offsetX: -1, offsetY: 2 },
        2,
      ),
    ).toEqual({
      shape: "ronchi",
      lpmm: 12,
      rotation: 15,
      offsetX: -2,
      offsetY: 4,
    });

    expect(scaleEdgeAperture(undefined, 2)).toBeUndefined();
    expect(
      scaleEdgeAperture(
        { shape: "circular", radius: 4, offsetX: 0.5, offsetY: -0.75 },
        2,
      ),
    ).toEqual({
      shape: "circular",
      radius: 8,
      offsetX: 1,
      offsetY: -1.5,
    });
    expect(
      scaleEdgeAperture(
        {
          shape: "rectangular",
          xHalfWidth: 5,
          yHalfWidth: 3,
          rotation: -30,
          offsetX: 0.5,
          offsetY: -0.75,
        },
        2,
      ),
    ).toEqual({
      shape: "rectangular",
      xHalfWidth: 10,
      yHalfWidth: 6,
      rotation: -30,
      offsetX: 1,
      offsetY: -1.5,
    });
  });

  it("scales every supported asphere kind with its documented coefficient order", () => {
    expect(scaleAspherical({ kind: "Conic", conicConstant: -1 }, 2)).toEqual({
      kind: "Conic",
      conicConstant: -1,
    });
    expect(
      scaleAspherical(
        {
          kind: "EvenAspherical",
          conicConstant: 0,
          polynomialCoefficients: [8, 12],
        },
        2,
      ),
    ).toEqual({
      kind: "EvenAspherical",
      conicConstant: 0,
      polynomialCoefficients: [4, 1.5],
    });
    expect(
      scaleAspherical(
        {
          kind: "RadialPolynomial",
          conicConstant: 0,
          polynomialCoefficients: [8, 12],
        },
        2,
      ),
    ).toEqual({
      kind: "RadialPolynomial",
      conicConstant: 0,
      polynomialCoefficients: [8, 6],
    });
    expect(
      scaleAspherical(
        {
          kind: "XToroid",
          conicConstant: 0,
          toricSweepRadiusOfCurvature: 20,
          polynomialCoefficients: [8, 12],
        },
        2,
      ),
    ).toEqual({
      kind: "XToroid",
      conicConstant: 0,
      toricSweepRadiusOfCurvature: 40,
      polynomialCoefficients: [4, 1.5],
    });
    expect(
      scaleAspherical(
        {
          kind: "YToroid",
          conicConstant: 0,
          toricSweepRadiusOfCurvature: 20,
          polynomialCoefficients: [8, 12],
        },
        2,
      ),
    ).toEqual({
      kind: "YToroid",
      conicConstant: 0,
      toricSweepRadiusOfCurvature: 40,
      polynomialCoefficients: [4, 1.5],
    });
  });

  it("collects all policy-owned numbers, including preserved angular and density values", () => {
    const values = collectSurfaceScalingNumericValues(createSurfaceRow());

    expect(values).toEqual([
      10, 2, 5, -1, 2, 12, 15, 4, 0.5, -0.75, -1, 20, 8, 12, 1, 2, 3, 4, 5, 600,
      1,
    ]);
  });

  it("handles absent optional nested values without inventing scaled data", () => {
    const surface = {
      ...createSurfaceRow(),
      clear_aperture: undefined,
      edge_aperture: undefined,
      aspherical: undefined,
      decenter: undefined,
      diffractiveElement: undefined,
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "row-image",
      curvatureRadius: 4,
    };

    expect(scaleSurfaceValueRow(surface, 2)).toMatchObject({
      curvatureRadius: 20,
      thickness: 4,
      semiDiameter: 10,
    });
    expect(scaleSurfaceValueRow(image, 2)).toMatchObject({
      curvatureRadius: 8,
      decenter: undefined,
    });
    expect(collectSurfaceScalingNumericValues(surface)).toEqual([10, 2, 5]);
  });

  it("collects only fields owned by the scaling policy", () => {
    const rowWithUnknownNumericField = {
      ...createSurfaceRow(),
      futureNumericField: 999,
    } as GridRow;

    expect(
      collectSurfaceScalingNumericValues(rowWithUnknownNumericField),
    ).not.toContain(999);
  });

  it("collects Object distance through the object policy", () => {
    expect(
      collectSurfaceScalingNumericValues({
        kind: "object",
        id: "row-object",
        objectDistance: 123,
        medium: "air",
        manufacturer: "",
      }),
    ).toEqual([123]);
  });
});
