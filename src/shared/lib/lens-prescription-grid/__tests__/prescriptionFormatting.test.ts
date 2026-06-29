import {
  buildReverseSurfaceOptions,
  buildScaleSurfaceOptions,
  formatPrescriptionRows,
  firstSurfaceNeedsReferenceSurface,
  insertReferenceSurfaceAfterObject,
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

function editorRows(rows: GridRow[]): Array<
  | { readonly row: "OBJ"; readonly thickness: number; readonly medium: string }
  | { readonly row: string; readonly curvatureRadius: number; readonly thickness: number; readonly medium: string }
  | { readonly row: "IMG" }
> {
  let surfaceIndex = 0;
  return rows.map((row) => {
    if (row.kind === "object") {
      return { row: "OBJ", thickness: row.objectDistance, medium: row.medium };
    }
    if (row.kind === "image") {
      return { row: "IMG" };
    }

    surfaceIndex += 1;
    return {
      row: `SURF${surfaceIndex}`,
      curvatureRadius: row.curvatureRadius,
      thickness: row.thickness,
      medium: row.medium,
    };
  });
}

function canonicalEditorRows(rows: GridRow[]): Array<
  | { readonly row: "OBJ"; readonly thickness: number; readonly medium: string }
  | { readonly row: string; readonly curvatureRadius: number; readonly thickness: number; readonly medium: string }
  | { readonly row: "IMG" }
> {
  return editorRows(rows).map((row) => "curvatureRadius" in row
    ? { ...row, row: "SURF" }
    : row);
}

function surfaceRowsWithoutIds(rows: GridRow[]): Array<Omit<Extract<GridRow, { kind: "surface" }>, "id">> {
  return surfaceRows(rows).map(({ id: _id, ...row }) => row);
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

  it("scales aperture dimensional fields on selected surfaces", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: { shape: "annular", obstructionRadius: 2, offsetX: -1, offsetY: 1.5 },
          edge_aperture: { shape: "circular", radius: 4, offsetX: 0.5, offsetY: -0.75 },
        },
        {
          ...baseSurfaces.surfaces[1],
          clear_aperture: { shape: "circular", offsetX: 2, offsetY: 3 },
        },
      ],
    });

    const result = scaleRows(rows, { first: 1, last: 1, factor: 2 });
    const surfaces = surfaceRows(result);

    expect(surfaces[0].clear_aperture).toEqual({
      shape: "annular",
      obstructionRadius: 4,
      offsetX: -2,
      offsetY: 3,
    });
    expect(surfaces[0].edge_aperture).toEqual({
      shape: "circular",
      radius: 8,
      offsetX: 1,
      offsetY: -1.5,
    });
    expect(surfaces[1].clear_aperture).toEqual({
      shape: "circular",
      offsetX: 2,
      offsetY: 3,
    });
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

  it("rejects dimensional precision underflow atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{ ...baseSurfaces.surfaces[0], curvatureRadius: 0.1 }],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: Number.MIN_VALUE,
    });

    expect(result).toEqual({
      ok: false,
      rows,
      error: "Formatting was not applied because one or more nonzero transformed numeric values underflowed to zero.",
    });
    expect(result.rows).toBe(rows);
  });

  it("rejects high-order aspheric coefficient precision underflow atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{
        ...baseSurfaces.surfaces[0],
        curvatureRadius: 0,
        thickness: 0,
        semiDiameter: 0,
        decenter: undefined,
        aspherical: {
          kind: "EvenAspherical",
          conicConstant: 0,
          polynomialCoefficients: [0, 1],
        },
      }],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: Number.MAX_VALUE,
    });

    expect(result.ok).toBe(false);
    expect(result.rows).toBe(rows);
    expect(result.ok ? undefined : result.error).toMatch(/underflowed to zero/);
  });

  it("rejects aperture dimensional precision underflow atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{
        ...baseSurfaces.surfaces[0],
        curvatureRadius: 0,
        thickness: 0,
        semiDiameter: 0,
        decenter: undefined,
        clear_aperture: { shape: "annular", obstructionRadius: 0.1, offsetX: 0, offsetY: 0 },
      }],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: Number.MIN_VALUE,
    });

    expect(result.ok).toBe(false);
    expect(result.rows).toBe(rows);
    expect(result.ok ? undefined : result.error).toMatch(/underflowed to zero/);
  });

  it("rejects aspheric coefficient overflow caused by a tiny factor", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{
        ...baseSurfaces.surfaces[0],
        aspherical: {
          kind: "EvenAspherical",
          conicConstant: 0,
          polynomialCoefficients: [1],
        },
      }],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: Number.MIN_VALUE,
    });

    expect(result.ok).toBe(false);
    expect(result.rows).toBe(rows);
    expect(result.ok ? undefined : result.error).toMatch(/invalid or exceed/);
  });

  it("allows selected source values that are already zero to remain zero", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{
        ...baseSurfaces.surfaces[0],
        curvatureRadius: 0,
        thickness: 0,
        semiDiameter: 0,
      }],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: Number.MIN_VALUE,
    });

    expect(result.ok).toBe(true);
    expect(result.rows).not.toBe(rows);
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

  it("detects nonzero first-surface tilt or decenter", () => {
    const rowsWithTilt = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 1, gamma: 0, offsetX: 0, offsetY: 0 },
        },
      ],
    });
    const rowsWithDecenter = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 0, gamma: 0, offsetX: -2, offsetY: 0 },
        },
      ],
    });

    expect(firstSurfaceNeedsReferenceSurface(rowsWithTilt)).toBe(true);
    expect(firstSurfaceNeedsReferenceSurface(rowsWithDecenter)).toBe(true);
  });

  it("does not detect a needed reference surface when first-surface decenter is absent or all zero", () => {
    const rowsWithoutDecenter = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{ ...baseSurfaces.surfaces[0], decenter: undefined }],
    });
    const rowsWithZeroDecenter = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          decenter: { coordinateSystemStrategy: "decenter", alpha: 0, beta: 0, gamma: 0, offsetX: 0, offsetY: 0 },
        },
      ],
    });

    expect(firstSurfaceNeedsReferenceSurface(rowsWithoutDecenter)).toBe(false);
    expect(firstSurfaceNeedsReferenceSurface(rowsWithZeroDecenter)).toBe(false);
  });

  it("inserts one flat air reference surface after Object while preserving the original first surface", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          semiDiameter: 12,
          decenter: { coordinateSystemStrategy: "decenter", alpha: 3, beta: 0, gamma: 0, offsetX: 2, offsetY: 0 },
          aspherical: { kind: "Conic", conicConstant: -1 },
          diffractionGrating: { lpmm: 600, order: 1 },
        },
        ...baseSurfaces.surfaces.slice(1),
      ],
    });
    const originalFirstSurface = surfaceRows(rows)[0];

    const result = insertReferenceSurfaceAfterObject(rows);
    const surfaces = surfaceRows(result);

    expect(result[0]).toBe(rows[0]);
    expect(surfaces).toHaveLength(surfaceRows(rows).length + 1);
    expect(surfaces[0]).toEqual({
      id: expect.any(String),
      kind: "surface",
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 12,
    });
    expect(surfaces[0].decenter).toBeUndefined();
    expect(surfaces[0].aspherical).toBeUndefined();
    expect(surfaces[0].diffractionGrating).toBeUndefined();
    expect(surfaces[1]).toEqual(originalFirstSurface);
  });

  it("reverses Object through folded mirror surfaces while preserving mirror count and propagation media", () => {
    const rows = surfacesToGridRows({
      object: { distance: 1e10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: -1370 },
      surfaces: [
        {
          label: "Stop",
          curvatureRadius: 0,
          thickness: 6,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 100,
        },
        {
          label: "Default",
          curvatureRadius: 0,
          thickness: 860,
          medium: "air",
          manufacturer: "",
          semiDiameter: 100.034477,
        },
        {
          label: "Default",
          curvatureRadius: -2000,
          thickness: -800,
          medium: "REFL",
          manufacturer: "",
          semiDiameter: 107.539583,
          aspherical: {
            kind: "Conic",
            conicConstant: -1,
          },
        },
        {
          label: "Default",
          curvatureRadius: 0,
          thickness: 200.000100215,
          medium: "REFL",
          manufacturer: "",
          semiDiameter: 28.489411,
          decenter: {
            coordinateSystemStrategy: "bend",
            alpha: 45,
            beta: 0,
            gamma: 0,
            offsetX: 0,
            offsetY: 0,
          },
        },
      ],
    });

    expect(editorRows(rows)).toEqual([
      { row: "OBJ", thickness: 1e10, medium: "air" },
      { row: "SURF1", curvatureRadius: 0, thickness: 6, medium: "N-BK7" },
      { row: "SURF2", curvatureRadius: 0, thickness: 860, medium: "air" },
      { row: "SURF3", curvatureRadius: -2000, thickness: -800, medium: "REFL" },
      { row: "SURF4", curvatureRadius: 0, thickness: 200.000100215, medium: "REFL" },
      { row: "IMG" },
    ]);

    const result = reverseRows(rows, { first: 0, last: 4 });
    const resultSurfaces = surfaceRows(result);

    expect(resultSurfaces.filter((row) => row.medium === "REFL")).toHaveLength(2);
    expect(resultSurfaces[1].aspherical).toEqual({ kind: "Conic", conicConstant: -1 });
    expect(resultSurfaces[2]).toEqual({
      id: expect.any(String),
      kind: "surface",
      label: "Default",
      curvatureRadius: 0,
      thickness: 860,
      medium: "air",
      manufacturer: "",
      semiDiameter: 107.539583,
    });
    expect(editorRows(result)).toEqual([
      { row: "OBJ", thickness: 200.000100215, medium: "air" },
      { row: "SURF1", curvatureRadius: 0, thickness: -800, medium: "REFL" },
      { row: "SURF2", curvatureRadius: 2000, thickness: 0, medium: "REFL" },
      { row: "SURF3", curvatureRadius: 0, thickness: 860, medium: "air" },
      { row: "SURF4", curvatureRadius: 0, thickness: 6, medium: "N-BK7" },
      { row: "SURF5", curvatureRadius: 0, thickness: 1e10, medium: "air" },
      { row: "IMG" },
    ]);

    const formatted = formatPrescriptionRows(rows, { mode: "reverse", first: 0, last: 4 });
    expect(formatted.ok).toBe(true);
    expect(formatted.ok ? editorRows(formatted.rows) : undefined).toEqual(editorRows(result));

    const reversedBack = reverseRows(result, { first: 0, last: 5 });
    expect(canonicalEditorRows(reversedBack)).toEqual(canonicalEditorRows(rows));
    expect(surfaceRowsWithoutIds(reversedBack)).toEqual(surfaceRowsWithoutIds(rows));

    const formattedBack = formatPrescriptionRows(result, { mode: "reverse", first: 0, last: 5 });
    expect(formattedBack.ok).toBe(true);
    expect(formattedBack.ok ? canonicalEditorRows(formattedBack.rows) : undefined).toEqual(canonicalEditorRows(rows));
  });

  it("rejects same and invalid Reverse selections", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 2, last: 2 }).ok).toBe(false);
    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 3, last: 2 }).ok).toBe(false);
    expect(formatPrescriptionRows(rows, { mode: "reverse", first: 0, last: 5 }).ok).toBe(false);
  });
});
