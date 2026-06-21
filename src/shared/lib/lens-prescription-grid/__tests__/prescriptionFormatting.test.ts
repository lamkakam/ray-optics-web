import {
  buildReverseSurfaceOptions,
  buildScaleSurfaceOptions,
  formatPrescriptionRows,
  OBJECT_DISTANCE_INFINITY_THRESHOLD,
  reverseRows,
  scaleRows,
} from "@/shared/lib/lens-prescription-grid/lib/prescriptionFormatting";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Surfaces } from "@/shared/lib/types/opticalModel";

function surfaceRows(rows: GridRow[]): Extract<GridRow, { kind: "surface" }>[] {
  return rows.filter((row): row is Extract<GridRow, { kind: "surface" }> => row.kind === "surface");
}

const baseSurfaces: Surfaces = {
  object: { distance: OBJECT_DISTANCE_INFINITY_THRESHOLD, medium: "air", manufacturer: "" },
  image: {
    curvatureRadius: 9,
    decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 0, gamma: 0, offsetX: 3, offsetY: 4 },
  },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 10,
      thickness: 1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
      decenter: { coordinateSystemStrategy: "decenter", alpha: 1, beta: 2, gamma: 3, offsetX: 6, offsetY: 8 },
    },
    {
      label: "Stop",
      curvatureRadius: -20,
      thickness: 2,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 6,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -1,
        polynomialCoefficients: [8, 12],
      },
    },
    {
      label: "Default",
      curvatureRadius: 30,
      thickness: 3,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 7,
      aspherical: {
        kind: "XToroid",
        conicConstant: 0,
        toricSweepRadiusOfCurvature: 11,
        polynomialCoefficients: [16, 32],
      },
    },
    {
      label: "Default",
      curvatureRadius: -40,
      thickness: 4,
      medium: "air",
      manufacturer: "",
      semiDiameter: 8,
    },
  ],
};

describe("prescriptionFormatting", () => {
  it("exports the object distance infinity threshold", () => {
    expect(OBJECT_DISTANCE_INFINITY_THRESHOLD).toBe(1e10);
  });

  it("builds scale and reverse surface selector options", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(buildScaleSurfaceOptions(rows)).toEqual([
      { value: 0, label: "Object" },
      { value: 1, label: "Surface 1" },
      { value: 2, label: "Surface 2" },
      { value: 3, label: "Surface 3" },
      { value: 4, label: "Surface 4" },
      { value: 5, label: "Image" },
    ]);
    expect(buildReverseSurfaceOptions(rows)).toEqual([
      { value: 0, label: "Object" },
      { value: 1, label: "Surface 1" },
      { value: 2, label: "Surface 2" },
      { value: 3, label: "Surface 3" },
      { value: 4, label: "Surface 4" },
    ]);
  });

  it("scales the full Object-to-Image range while preserving object distances at or above 1e10", () => {
    const rows = surfacesToGridRows(baseSurfaces);
    const result = scaleRows(rows, { first: 0, last: 5, factor: 2 });

    expect(result[0].kind === "object" ? result[0].objectDistance : undefined).toBe(OBJECT_DISTANCE_INFINITY_THRESHOLD);
    expect(surfaceRows(result).map((row) => row.curvatureRadius)).toEqual([20, -40, 60, -80]);
    expect(surfaceRows(result).map((row) => row.thickness)).toEqual([2, 4, 6, 8]);
    expect(surfaceRows(result).map((row) => row.semiDiameter)).toEqual([10, 12, 14, 16]);
    const image = result.at(-1);
    expect(image?.kind === "image" ? image.curvatureRadius : undefined).toBe(18);
  });

  it("scales object distance below 1e10 and image decenter offsets when Image is included", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      object: { distance: 500, medium: "air", manufacturer: "" },
    });
    const result = scaleRows(rows, { first: 0, last: 5, factor: 3 });
    const image = result.at(-1);

    expect(result[0].kind === "object" ? result[0].objectDistance : undefined).toBe(1500);
    expect(image?.kind === "image" ? image.decenter?.offsetX : undefined).toBe(9);
    expect(image?.kind === "image" ? image.decenter?.offsetY : undefined).toBe(12);
  });

  it("scales aspherical toroid sweep radius and polynomial coefficients by order", () => {
    const result = scaleRows(surfacesToGridRows(baseSurfaces), { first: 2, last: 3, factor: 2 });
    const surfaces = surfaceRows(result);

    expect(surfaces[1].aspherical).toEqual({
      kind: "RadialPolynomial",
      conicConstant: -1,
      polynomialCoefficients: [8, 6],
    });
    expect(surfaces[2].aspherical).toEqual({
      kind: "XToroid",
      conicConstant: 0,
      toricSweepRadiusOfCurvature: 22,
      polynomialCoefficients: [8, 4],
    });
  });

  it("rejects overflow atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          curvatureRadius: Number.MAX_VALUE,
        },
      ],
    });

    const result = formatPrescriptionRows(rows, { mode: "scale", first: 1, last: 1, factor: 2 });

    expect(result.ok).toBe(false);
    expect(result.rows).toBe(rows);
  });

  it("reverses surface range 2..4 with boundary gaps", () => {
    const result = reverseRows(surfacesToGridRows(baseSurfaces), { first: 2, last: 4 });
    const surfaces = surfaceRows(result);

    expect(surfaces.map((row) => row.curvatureRadius)).toEqual([10, 40, -30, 20]);
    expect(surfaces.map((row) => row.thickness)).toEqual([4, 3, 2, 1]);
    expect(surfaces.map((row) => row.medium)).toEqual(["air", "F2", "N-BK7", "air"]);
    expect(surfaces.map((row) => row.manufacturer)).toEqual(["", "Schott", "Schott", ""]);
    expect(surfaces.map((row) => row.label)).toEqual(["Default", "Default", "Default", "Stop"]);
    expect(surfaces.map((row) => row.aspherical?.kind)).toEqual([undefined, undefined, "XToroid", "RadialPolynomial"]);
    expect(surfaces.map((row) => row.decenter?.offsetX)).toEqual([6, undefined, undefined, undefined]);
  });

  it("reverses Object through the last surface and clears image curvature", () => {
    const result = reverseRows(surfacesToGridRows({
      ...baseSurfaces,
      object: { distance: 100, medium: "air", manufacturer: "" },
    }), { first: 0, last: 4 });
    const surfaces = surfaceRows(result);
    const image = result.at(-1);

    expect(result[0].kind === "object" ? result[0].objectDistance : undefined).toBe(4);
    expect(result[0].kind === "object" ? result[0].medium : undefined).toBe("air");
    expect(surfaces.map((row) => row.curvatureRadius)).toEqual([40, -30, 20, -10]);
    expect(surfaces.map((row) => row.thickness)).toEqual([3, 2, 1, 100]);
    expect(surfaces.map((row) => row.medium)).toEqual(["F2", "N-BK7", "air", "air"]);
    expect(image?.kind === "image" ? image.curvatureRadius : undefined).toBe(0);
  });

  it("rejects same and invalid Reverse selections", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 2, last: 2 }).ok).toBe(false);
    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 3, last: 2 }).ok).toBe(false);
    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 0, last: 5 }).ok).toBe(false);
  });
});
