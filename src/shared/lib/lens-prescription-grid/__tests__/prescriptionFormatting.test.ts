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
import {
  collectSurfaceScalingNumericValues,
  IMAGE_VALUE_SCALERS,
  OBJECT_VALUE_SCALERS,
  OBJECT_DISTANCE_INFINITY_THRESHOLD as SURFACE_VALUE_SCALING_INFINITY_THRESHOLD,
  scaleSurfaceValueRow,
  SURFACE_VALUE_SCALERS,
  SURFACE_VALUE_SCALING_POLICY,
} from "@/shared/lib/lens-prescription-grid/lib/surfaceValueScaling";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { OBJECT_ROW_ID } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Surface, Surfaces } from "@/shared/lib/types/opticalModel";

function surfaceRows(rows: GridRow[]): Extract<GridRow, { kind: "surface" }>[] {
  return rows.filter(
    (row): row is Extract<GridRow, { kind: "surface" }> =>
      row.kind === "surface",
  );
}

function editorRows(rows: GridRow[]): Array<
  | { readonly row: "OBJ"; readonly thickness: number; readonly medium: string }
  | {
      readonly row: string;
      readonly curvatureRadius: number;
      readonly thickness: number;
      readonly medium: string;
    }
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
  | {
      readonly row: string;
      readonly curvatureRadius: number;
      readonly thickness: number;
      readonly medium: string;
    }
  | { readonly row: "IMG" }
> {
  return editorRows(rows).map((row) =>
    "curvatureRadius" in row ? { ...row, row: "SURF" } : row,
  );
}

function surfaceRowsWithoutIds(
  rows: GridRow[],
): Array<Omit<Extract<GridRow, { kind: "surface" }>, "id">> {
  return surfaceRows(rows).map(({ id: _id, ...row }) => row);
}

const baseSurfaces: Surfaces = {
  object: {
    distance: OBJECT_DISTANCE_INFINITY_THRESHOLD,
    medium: "air",
    manufacturer: "",
  },
  image: {
    curvatureRadius: 9,
    decenter: {
      coordinateSystemStrategy: "decenter",
      alpha: 0,
      beta: 0,
      gamma: 0,
      offsetX: 3,
      offsetY: 4,
    },
  },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 10,
      thickness: 1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
      decenter: {
        coordinateSystemStrategy: "decenter",
        alpha: 1,
        beta: 2,
        gamma: 3,
        offsetX: 6,
        offsetY: 8,
      },
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
  it("preserves surface comments through scaling and moves them with surfaces during reversal", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: baseSurfaces.surfaces.slice(0, 2).map((surface, index) => ({
        ...surface,
        comment: index === 0 ? "First surface" : "Second surface",
      })),
    });

    expect(
      surfaceRows(scaleRows(rows, { first: 1, last: 2, factor: 2 })).map(
        (row) => row.comment,
      ),
    ).toEqual(["First surface", "Second surface"]);
    expect(
      surfaceRows(reverseRows(rows, { first: 1, last: 2 })).map(
        (row) => row.comment,
      ),
    ).toEqual(["Second surface", "First surface"]);
  });

  it("preserves complete diffractive-element wrappers through scaling and reversal", () => {
    const firstWrapper = { diffractionGrating: { lpmm: 600, order: 1 } };
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: baseSurfaces.surfaces.slice(0, 2).map((surface, index) => ({
        ...surface,
        diffractiveElement: index === 0 ? firstWrapper : {},
      })),
    });

    expect(
      surfaceRows(scaleRows(rows, { first: 1, last: 2, factor: 2 })).map(
        (row) => row.diffractiveElement,
      ),
    ).toEqual([firstWrapper, {}]);
    expect(
      surfaceRows(reverseRows(rows, { first: 1, last: 2 })).map(
        (row) => row.diffractiveElement,
      ),
    ).toEqual([{}, firstWrapper]);
  });

  it("exports the object distance infinity threshold", () => {
    expect(OBJECT_DISTANCE_INFINITY_THRESHOLD).toBe(1e10);
  });

  it("re-exports the centralized object distance infinity threshold", () => {
    expect(OBJECT_DISTANCE_INFINITY_THRESHOLD).toBe(
      SURFACE_VALUE_SCALING_INFINITY_THRESHOLD,
    );
  });

  it("keeps scaleable surface values and validation values in one central policy", () => {
    expect(SURFACE_VALUE_SCALING_POLICY.object).toEqual({
      distance: expect.any(Function),
    });
    expect(SURFACE_VALUE_SCALING_POLICY.image).toMatchObject({
      curvatureRadius: expect.any(Function),
      decenter: {
        alpha: undefined,
        beta: undefined,
        gamma: undefined,
        offsetX: expect.any(Function),
        offsetY: expect.any(Function),
      },
    });
    expect(SURFACE_VALUE_SCALING_POLICY.surface).toMatchObject({
      curvatureRadius: expect.any(Function),
      thickness: expect.any(Function),
      semiDiameter: expect.any(Function),
      clear_aperture: {
        lpmm: undefined,
        rotation: undefined,
        offsetX: expect.any(Function),
        offsetY: expect.any(Function),
      },
      diffractiveElement: {
        diffractionGrating: {
          lpmm: undefined,
          order: undefined,
        },
      },
    });
  });

  it("uses optical model keyed scaler maps for executable scale behavior", () => {
    expect(Object.keys(OBJECT_VALUE_SCALERS)).toEqual(["distance"]);
    expect(Object.keys(IMAGE_VALUE_SCALERS)).toEqual([
      "curvatureRadius",
      "decenter",
    ]);
    expect(Object.keys(SURFACE_VALUE_SCALERS)).toEqual([
      "curvatureRadius",
      "thickness",
      "semiDiameter",
      "clear_aperture",
      "edge_aperture",
      "aspherical",
      "decenter",
      "diffractiveElement",
    ]);

    expect(OBJECT_VALUE_SCALERS.distance(500, 2)).toBe(1000);
    expect(SURFACE_VALUE_SCALERS.diffractiveElement).toEqual({
      diffractionGrating: { lpmm: undefined, order: undefined },
    });
  });

  it("scales a surface row from the centralized policy while preserving grating values", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        },
      ],
    });
    const surface = surfaceRows(rows)[0];

    const result = scaleSurfaceValueRow(surface, 2);

    expect(result).toMatchObject({
      curvatureRadius: 20,
      thickness: 2,
      semiDiameter: 10,
      diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
    });
  });

  it("collects validation numeric values from the centralized policy", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: {
            shape: "rectangular",
            xHalfWidth: 4,
            yHalfWidth: 2,
            rotation: 15,
            offsetX: -1,
            offsetY: 1.5,
          },
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        },
      ],
    });

    expect(collectSurfaceScalingNumericValues(surfaceRows(rows)[0])).toEqual(
      expect.arrayContaining([
        10, 1, 5, 1, 2, 3, 6, 8, 4, 2, 15, -1, 1.5, 600, 1,
      ]),
    );
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

    expect(
      result[0].kind === "object" ? result[0].objectDistance : undefined,
    ).toBe(OBJECT_DISTANCE_INFINITY_THRESHOLD);
    expect(surfaceRows(result).map((row) => row.curvatureRadius)).toEqual([
      20, -40, 60, -80,
    ]);
    expect(surfaceRows(result).map((row) => row.thickness)).toEqual([
      2, 4, 6, 8,
    ]);
    expect(surfaceRows(result).map((row) => row.semiDiameter)).toEqual([
      10, 12, 14, 16,
    ]);
    const image = result.at(-1);
    expect(image?.kind === "image" ? image.curvatureRadius : undefined).toBe(
      18,
    );
  });

  it("scales aperture dimensional fields on selected surfaces", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 2,
            offsetX: -1,
            offsetY: 1.5,
          },
          edge_aperture: {
            shape: "circular",
            radius: 4,
            offsetX: 0.5,
            offsetY: -0.75,
          },
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

  it("scales circular clear aperture offsets on selected surfaces", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: { shape: "circular", offsetX: 2, offsetY: -3 },
        },
      ],
    });

    const result = scaleRows(rows, { first: 1, last: 1, factor: 1.5 });
    const surfaces = surfaceRows(result);

    expect(surfaces[0].clear_aperture).toEqual({
      shape: "circular",
      offsetX: 3,
      offsetY: -4.5,
    });
  });

  it("scales rectangular aperture half widths and offsets while preserving rotation", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: {
            shape: "rectangular",
            xHalfWidth: 4,
            yHalfWidth: 2,
            rotation: 15,
            offsetX: -1,
            offsetY: 1.5,
          },
          edge_aperture: {
            shape: "rectangular",
            xHalfWidth: 5,
            yHalfWidth: 3,
            rotation: -30,
            offsetX: 0.5,
            offsetY: -0.75,
          },
        },
      ],
    });

    const result = scaleRows(rows, { first: 1, last: 1, factor: 2 });
    const surfaces = surfaceRows(result);

    expect(surfaces[0].clear_aperture).toEqual({
      shape: "rectangular",
      xHalfWidth: 8,
      yHalfWidth: 4,
      rotation: 15,
      offsetX: -2,
      offsetY: 3,
    });
    expect(surfaces[0].edge_aperture).toEqual({
      shape: "rectangular",
      xHalfWidth: 10,
      yHalfWidth: 6,
      rotation: -30,
      offsetX: 1,
      offsetY: -1.5,
    });
  });

  it("scales a Ronchi ruling envelope and offsets while preserving density and rotation", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: {
            shape: "ronchi",
            lpmm: 12.5,
            rotation: 15,
            offsetX: -1,
            offsetY: 1.5,
          },
        },
      ],
    });

    const result = scaleRows(rows, { first: 1, last: 1, factor: 2 });
    const surface = surfaceRows(result)[0];

    expect(surface.semiDiameter).toBe(10);
    expect(surface.clear_aperture).toEqual({
      shape: "ronchi",
      lpmm: 12.5,
      rotation: 15,
      offsetX: -2,
      offsetY: 3,
    });
    expect(collectSurfaceScalingNumericValues(surface)).toEqual(
      expect.arrayContaining([12.5, 15, -2, 3]),
    );
  });

  it("scales object distance below 1e10 and image decenter offsets when Image is included", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      object: { distance: 500, medium: "air", manufacturer: "" },
    });
    const result = scaleRows(rows, { first: 0, last: 5, factor: 3 });
    const image = result.at(-1);

    expect(
      result[0].kind === "object" ? result[0].objectDistance : undefined,
    ).toBe(1500);
    expect(image?.kind === "image" ? image.decenter?.offsetX : undefined).toBe(
      9,
    );
    expect(image?.kind === "image" ? image.decenter?.offsetY : undefined).toBe(
      12,
    );
  });

  it("scales aspherical toroid sweep radius and polynomial coefficients by order", () => {
    const result = scaleRows(surfacesToGridRows(baseSurfaces), {
      first: 2,
      last: 3,
      factor: 2,
    });
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

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: 2,
    });

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
      error:
        "Formatting was not applied because one or more nonzero transformed numeric values underflowed to zero.",
    });
    expect(result.rows).toBe(rows);
  });

  it("rejects high-order aspheric coefficient precision underflow atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
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
        },
      ],
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
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          curvatureRadius: 0,
          thickness: 0,
          semiDiameter: 0,
          decenter: undefined,
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 0.1,
            offsetX: 0,
            offsetY: 0,
          },
        },
      ],
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
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: 0,
            polynomialCoefficients: [1],
          },
        },
      ],
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
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          curvatureRadius: 0,
          thickness: 0,
          semiDiameter: 0,
        },
      ],
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
    const result = reverseRows(surfacesToGridRows(baseSurfaces), {
      first: 2,
      last: 4,
    });
    const surfaces = surfaceRows(result);

    expect(surfaces.map((row) => row.curvatureRadius)).toEqual([
      10, 40, -30, 20,
    ]);
    expect(surfaces.map((row) => row.thickness)).toEqual([4, 3, 2, 1]);
    expect(surfaces.map((row) => row.medium)).toEqual([
      "air",
      "F2",
      "N-BK7",
      "air",
    ]);
    expect(surfaces.map((row) => row.manufacturer)).toEqual([
      "",
      "Schott",
      "Schott",
      "",
    ]);
    expect(surfaces.map((row) => row.label)).toEqual([
      "Default",
      "Default",
      "Default",
      "Stop",
    ]);
    expect(surfaces.map((row) => row.aspherical?.kind)).toEqual([
      undefined,
      undefined,
      "XToroid",
      "RadialPolynomial",
    ]);
    expect(surfaces.map((row) => row.decenter?.offsetX)).toEqual([
      6,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("reverses Object through the last surface and clears image curvature", () => {
    const result = reverseRows(
      surfacesToGridRows({
        ...baseSurfaces,
        object: { distance: 100, medium: "air", manufacturer: "" },
      }),
      { first: 0, last: 4 },
    );
    const surfaces = surfaceRows(result);
    const image = result.at(-1);

    expect(
      result[0].kind === "object" ? result[0].objectDistance : undefined,
    ).toBe(4);
    expect(result[0].kind === "object" ? result[0].medium : undefined).toBe(
      "air",
    );
    expect(surfaces.map((row) => row.curvatureRadius)).toEqual([
      40, -30, 20, -10,
    ]);
    expect(surfaces.map((row) => row.thickness)).toEqual([3, 2, 1, 100]);
    expect(surfaces.map((row) => row.medium)).toEqual([
      "F2",
      "N-BK7",
      "air",
      "air",
    ]);
    expect(image?.kind === "image" ? image.curvatureRadius : undefined).toBe(0);
  });

  it("detects nonzero first-surface tilt or decenter", () => {
    const rowsWithTilt = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 0,
            beta: 1,
            gamma: 0,
            offsetX: 0,
            offsetY: 0,
          },
        },
      ],
    });
    const rowsWithDecenter = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 0,
            beta: 0,
            gamma: 0,
            offsetX: -2,
            offsetY: 0,
          },
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
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 0,
            beta: 0,
            gamma: 0,
            offsetX: 0,
            offsetY: 0,
          },
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
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 3,
            beta: 0,
            gamma: 0,
            offsetX: 2,
            offsetY: 0,
          },
          aspherical: { kind: "Conic", conicConstant: -1 },
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
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
    expect(surfaces[0].diffractiveElement).toBeUndefined();
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
      {
        row: "SURF4",
        curvatureRadius: 0,
        thickness: 200.000100215,
        medium: "REFL",
      },
      { row: "IMG" },
    ]);

    const result = reverseRows(rows, { first: 0, last: 4 });
    const resultSurfaces = surfaceRows(result);

    expect(resultSurfaces.filter((row) => row.medium === "REFL")).toHaveLength(
      2,
    );
    expect(resultSurfaces[1].aspherical).toEqual({
      kind: "Conic",
      conicConstant: -1,
    });
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

    const formatted = formatPrescriptionRows(rows, {
      mode: "reverse",
      first: 0,
      last: 4,
    });
    expect(formatted.ok).toBe(true);
    expect(formatted.ok ? editorRows(formatted.rows) : undefined).toEqual(
      editorRows(result),
    );

    const reversedBack = reverseRows(result, { first: 0, last: 5 });
    expect(canonicalEditorRows(reversedBack)).toEqual(
      canonicalEditorRows(rows),
    );
    expect(surfaceRowsWithoutIds(reversedBack)).toEqual(
      surfaceRowsWithoutIds(rows),
    );

    const formattedBack = formatPrescriptionRows(result, {
      mode: "reverse",
      first: 0,
      last: 5,
    });
    expect(formattedBack.ok).toBe(true);
    expect(
      formattedBack.ok ? canonicalEditorRows(formattedBack.rows) : undefined,
    ).toEqual(canonicalEditorRows(rows));
  });

  it("rejects same and invalid Reverse selections", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(
      formatPrescriptionRows(rows, { mode: "reverse", first: 2, last: 2 }).ok,
    ).toBe(false);
    expect(
      formatPrescriptionRows(rows, { mode: "reverse", first: 3, last: 2 }).ok,
    ).toBe(false);
    expect(
      formatPrescriptionRows(rows, { mode: "reverse", first: 0, last: 5 }).ok,
    ).toBe(false);
  });

  it("scales exactly the selected Object or Image endpoint and leaves other rows untouched", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      object: { distance: 100, medium: "air", manufacturer: "" },
    });

    const objectOnly = scaleRows(rows, { first: 0, last: 0, factor: 2 });
    expect(objectOnly[0]).toMatchObject({
      kind: "object",
      objectDistance: 200,
    });
    expect(objectOnly[1]).toBe(rows[1]);
    expect(objectOnly.at(-1)).toBe(rows.at(-1));

    const imageOnly = scaleRows(rows, { first: 5, last: 5, factor: 2 });
    expect(imageOnly[0]).toBe(rows[0]);
    expect(imageOnly.at(-1)).toMatchObject({
      kind: "image",
      curvatureRadius: 18,
    });
    expect(imageOnly[1]).toBe(rows[1]);
  });

  it.each([
    [
      Number.NaN,
      "Formatting was not applied because the scale factor must be a positive finite number.",
    ],
    [
      Number.POSITIVE_INFINITY,
      "Formatting was not applied because the scale factor must be a positive finite number.",
    ],
    [
      0,
      "Formatting was not applied because the scale factor must be a positive finite number.",
    ],
    [
      -1,
      "Formatting was not applied because the scale factor must be a positive finite number.",
    ],
  ])(
    "rejects an invalid scale factor %s before transforming rows",
    (factor, error) => {
      const rows = surfacesToGridRows(baseSurfaces);
      const result = formatPrescriptionRows(rows, {
        mode: "scale",
        first: 1,
        last: 2,
        factor,
      });

      expect(result).toEqual({ ok: false, rows: [...rows], error });
    },
  );

  it.each([
    [3, 2],
    [-1, 1],
    [0, 6],
  ])("rejects an invalid scale range %s..%s", (first, last) => {
    const rows = surfacesToGridRows(baseSurfaces);
    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first,
      last,
      factor: 2,
    });

    expect(result).toEqual({
      ok: false,
      rows: [...rows],
      error:
        "Formatting was not applied because the selected surface range is invalid.",
    });
  });

  it("rejects non-finite preserved values as an atomic formatting failure", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          clear_aperture: {
            shape: "ronchi",
            lpmm: Number.POSITIVE_INFINITY,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
          },
        },
      ],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 1,
      last: 1,
      factor: 2,
    });

    expect(result).toEqual({
      ok: false,
      rows,
      error:
        "Formatting was not applied because one or more transformed numeric values are invalid or exceed JavaScript finite number limits.",
    });
  });

  it("returns false for all missing or zero first-surface reference inputs", () => {
    const noRows: GridRow[] = [
      {
        kind: "object",
        id: "row-object",
        objectDistance: 1e10,
        medium: "air",
        manufacturer: "",
      },
      { kind: "image", id: "row-image", curvatureRadius: 0 },
    ];
    const noDecenter = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [{ ...baseSurfaces.surfaces[0], decenter: undefined }],
    });

    expect(firstSurfaceNeedsReferenceSurface(noRows)).toBe(false);
    expect(firstSurfaceNeedsReferenceSurface(noDecenter)).toBe(false);
  });

  it("inserts a reference surface at the start when Object is absent", () => {
    const image: GridRow = {
      kind: "image",
      id: "row-image",
      curvatureRadius: 0,
    };
    const surface: GridRow = {
      kind: "surface",
      id: "surface-1",
      label: "Default",
      curvatureRadius: 4,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 7,
    };

    const result = insertReferenceSurfaceAfterObject([image, surface]);

    expect(result[0]).toMatchObject({
      kind: "surface",
      curvatureRadius: 0,
      semiDiameter: 7,
    });
    expect(result[1]).toBe(image);
    expect(result[2]).toBe(surface);
  });

  it("uses a zero semi-diameter when a reference surface has no physical source", () => {
    const rows: GridRow[] = [
      {
        kind: "object",
        id: "row-object",
        objectDistance: 10,
        medium: "air",
        manufacturer: "",
      },
      { kind: "image", id: "row-image", curvatureRadius: 0 },
    ];

    const result = insertReferenceSurfaceAfterObject(rows);

    expect(result[1]).toMatchObject({ kind: "surface", semiDiameter: 0 });
  });

  it("locates the insertion point by row kind and reserved id", () => {
    const surface: Extract<GridRow, { kind: "surface" }> = {
      kind: "surface",
      id: "before-object",
      label: "Default",
      curvatureRadius: 1,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
    };
    const customObject: Extract<GridRow, { kind: "object" }> = {
      kind: "object",
      id: "custom-object-id",
      objectDistance: 10,
      medium: "air",
      manufacturer: "",
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "custom-image-id",
      curvatureRadius: 0,
    };

    const afterCustomObject = insertReferenceSurfaceAfterObject([
      surface,
      customObject,
      image,
    ]);
    expect(afterCustomObject[0]).toBe(surface);
    expect(afterCustomObject[1]).toBe(customObject);
    expect(afterCustomObject[2]).toMatchObject({ kind: "surface" });
    expect(afterCustomObject[3]).toBe(image);

    const reservedSurface = { ...surface, id: OBJECT_ROW_ID };
    const afterReservedId = insertReferenceSurfaceAfterObject([
      reservedSurface,
      image,
    ]);
    expect(afterReservedId[0]).toBe(reservedSurface);
    expect(afterReservedId[1]).toMatchObject({ kind: "surface" });
    expect(afterReservedId[2]).toBe(image);
  });

  it("scales custom-id Object and Image rows according to their row kinds", () => {
    const surface: Extract<GridRow, { kind: "surface" }> = {
      kind: "surface",
      id: "surface-before-endpoints",
      label: "Default",
      curvatureRadius: 3,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
    };
    const object: Extract<GridRow, { kind: "object" }> = {
      kind: "object",
      id: "custom-object-id",
      objectDistance: 10,
      medium: "air",
      manufacturer: "",
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "custom-image-id",
      curvatureRadius: 7,
    };
    const rows = [surface, object, image] satisfies GridRow[];

    const objectResult = scaleRows(rows, { first: 0, last: 0, factor: 2 });
    expect(objectResult[0]).toMatchObject({ curvatureRadius: 3 });
    expect(objectResult[1]).toMatchObject({ objectDistance: 20 });

    const imageResult = scaleRows(rows, { first: 2, last: 2, factor: 2 });
    expect(imageResult[2]).toMatchObject({ curvatureRadius: 14 });
  });

  it("uses the actual Object row when endpoint rows are not in canonical order", () => {
    const surface: Extract<GridRow, { kind: "surface" }> = {
      kind: "surface",
      id: "surface-first",
      label: "Default",
      curvatureRadius: 1,
      thickness: 2,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 5,
    };
    const object: Extract<GridRow, { kind: "object" }> = {
      kind: "object",
      id: "custom-object",
      objectDistance: 10,
      medium: "air",
      manufacturer: "Original",
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "row-image",
      curvatureRadius: 0,
    };

    const result = reverseRows([surface, object, image], { first: 0, last: 0 });

    expect(result[1]).toMatchObject({
      kind: "object",
      objectDistance: 2,
      medium: "N-BK7",
      manufacturer: "Schott",
    });
    expect(result[0]).toMatchObject({
      kind: "surface",
      thickness: 10,
      medium: "air",
      manufacturer: "Original",
    });
  });

  it("preserves non-default Object gap fields in an Object-only reversal", () => {
    const rows = surfacesToGridRows({
      object: { distance: 123, medium: "N-BK7", manufacturer: "Schott" },
      image: { curvatureRadius: 0 },
      surfaces: [],
    });

    const result = reverseRows(rows, { first: 0, last: 0 });

    expect(result[0]).toMatchObject({
      kind: "object",
      objectDistance: 123,
      medium: "N-BK7",
      manufacturer: "Schott",
    });
  });

  it("uses the Object row even when a full mirror reversal starts with a surface row", () => {
    const surface: Extract<GridRow, { kind: "surface" }> = {
      kind: "surface",
      id: "surface-first",
      label: "Default",
      curvatureRadius: 1,
      thickness: 2,
      medium: "REFL",
      manufacturer: "Mirror",
      semiDiameter: 5,
    };
    const object: Extract<GridRow, { kind: "object" }> = {
      kind: "object",
      id: "custom-object",
      objectDistance: 10,
      medium: "air",
      manufacturer: "Original",
    };
    const image: Extract<GridRow, { kind: "image" }> = {
      kind: "image",
      id: "row-image",
      curvatureRadius: 0,
    };

    const result = reverseRows(
      [
        surface,
        object,
        { ...surface, id: "surface-last", curvatureRadius: 2 },
        image,
      ],
      {
        first: 0,
        last: 2,
      },
    );

    expect(result[1]).toMatchObject({
      kind: "object",
      medium: "air",
      manufacturer: "Original",
    });
  });

  it("chooses the nearest non-mirror surface before the selected mirror endpoint", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "N-BK7",
          manufacturer: "First",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "Mirror",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 3,
          thickness: 4,
          medium: "F2",
          manufacturer: "After",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 2 });

    expect(result[0]).toMatchObject({
      kind: "object",
      medium: "N-BK7",
      manufacturer: "First",
    });
  });

  it("does not add a second propagation gap when the assigned gap is a mirror", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 4,
          medium: "REFL",
          manufacturer: "M1",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "M2",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 2 });

    expect(surfaceRows(result)).toHaveLength(2);
    expect(surfaceRows(result).map((row) => row.medium)).toEqual([
      "REFL",
      "REFL",
    ]);
  });

  it("does not add a propagation gap when the assigned gap has zero thickness", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 0,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "M2",
          semiDiameter: 5,
        },
      ],
    });

    expect(surfaceRows(reverseRows(rows, { first: 0, last: 2 }))).toHaveLength(
      2,
    );
  });

  it.each([
    ["previous surface is not a mirror", { previous: { medium: "air" } }],
    ["previous mirror has a nonzero thickness", { previous: { thickness: 1 } }],
    ["candidate is not Default", { candidate: { label: "Stop" } }],
    ["candidate is curved", { candidate: { curvatureRadius: 1 } }],
    ["candidate has zero thickness", { candidate: { thickness: 0 } }],
    [
      "candidate has a different semi-diameter",
      { candidate: { semiDiameter: 6 } },
    ],
    ["candidate has a comment", { candidate: { comment: "explicit" } }],
    [
      "candidate has aspherical data",
      { candidate: { aspherical: { kind: "Conic", conicConstant: 0 } } },
    ],
    [
      "candidate has decenter data",
      {
        candidate: {
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 0,
            beta: 0,
            gamma: 0,
            offsetX: 1,
            offsetY: 0,
          },
        },
      },
    ],
    [
      "candidate has a diffraction grating",
      {
        candidate: {
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        },
      },
    ],
  ] as Array<
    [string, { previous?: Partial<Surface>; candidate?: Partial<Surface> }]
  >)(
    "keeps a nonmatching mirror-following row physical when %s",
    (_reason, overrides) => {
      const previous: Surface = {
        label: "Default",
        curvatureRadius: 2,
        thickness: 0,
        medium: "REFL",
        manufacturer: "Mirror",
        semiDiameter: 5,
        ...overrides.previous,
      };
      const candidate: Surface = {
        label: "Default",
        curvatureRadius: 0,
        thickness: 2,
        medium: "air",
        manufacturer: "",
        semiDiameter: 5,
        ...overrides.candidate,
      };
      const rows = surfacesToGridRows({
        object: { distance: 10, medium: "air", manufacturer: "" },
        image: { curvatureRadius: 0 },
        surfaces: [previous, candidate],
      });

      const result = reverseRows(rows, { first: 1, last: 2 });

      expect(surfaceRows(result)).toHaveLength(2);
    },
  );

  it("reverses only the requested physical span", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(
      surfaceRows(reverseRows(rows, { first: 1, last: 2 })).map(
        (row) => row.curvatureRadius,
      ),
    ).toEqual([20, -10, 30, -40]);
    expect(
      surfaceRows(reverseRows(rows, { first: 1, last: 3 })).map(
        (row) => row.curvatureRadius,
      ),
    ).toEqual([-30, 20, -10, -40]);
    expect(
      surfaceRows(reverseRows(rows, { first: 2, last: 3 })).map(
        (row) => row.curvatureRadius,
      ),
    ).toEqual([10, -30, 20, -40]);
  });

  it("keeps image curvature when a reversal does not cover both endpoints", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(
      (
        reverseRows(rows, { first: 1, last: 4 }).at(-1) as Extract<
          GridRow,
          { kind: "image" }
        >
      ).curvatureRadius,
    ).toBe(9);
    expect(
      (
        reverseRows(rows, { first: 0, last: 3 }).at(-1) as Extract<
          GridRow,
          { kind: "image" }
        >
      ).curvatureRadius,
    ).toBe(9);
  });

  it("does not restore Object media when a full endpoint reversal ends at a non-mirror", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "F2",
          manufacturer: "Ohara",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 2 });

    expect(result[0]).toMatchObject({
      kind: "object",
      medium: "F2",
      manufacturer: "Ohara",
    });
  });

  it("falls back to the original Object medium when a full reversal contains only mirrors", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "REFL",
          manufacturer: "M1",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "M2",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 2 });

    expect(result[0]).toMatchObject({
      kind: "object",
      medium: "air",
      manufacturer: "Original",
    });
  });

  it("does not restore Object media for a partial span whose old last surface is a mirror", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "F2",
          manufacturer: "Ohara",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 3,
          thickness: 4,
          medium: "REFL",
          manufacturer: "Mirror",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 2, last: 3 });

    expect(result[0]).toMatchObject({
      kind: "object",
      medium: "air",
      manufacturer: "Original",
    });
  });

  it("uses default Object gap values when the Object row is missing", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "N-BK7", manufacturer: "Schott" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "F2",
          manufacturer: "Ohara",
          semiDiameter: 5,
        },
      ],
    }).filter((row) => row.kind !== "object");

    expect(() => reverseRows(rows, { first: 0, last: 1 })).not.toThrow();
  });

  it("keeps Object-medium restoration optional when a full mirror reversal has no Object row", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "REFL",
          manufacturer: "M1",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "M2",
          semiDiameter: 5,
        },
      ],
    }).filter((row) => row.kind !== "object");

    expect(() => reverseRows(rows, { first: 0, last: 2 })).not.toThrow();
    expect(
      surfaceRows(reverseRows(rows, { first: 0, last: 2 })).map(
        (row) => row.medium,
      ),
    ).toEqual(["REFL", "REFL"]);
  });

  it("preserves an explicit mirror propagation gap while normalizing and reversing rows", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 10,
          thickness: 5,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 8,
        },
        {
          label: "Default",
          curvatureRadius: -20,
          thickness: 0,
          medium: "REFL",
          manufacturer: "Mirror",
          semiDiameter: 8,
        },
        {
          label: "Default",
          curvatureRadius: 0,
          thickness: 7,
          medium: "air",
          manufacturer: "",
          semiDiameter: 8,
        },
        {
          label: "Stop",
          curvatureRadius: 30,
          thickness: 2,
          medium: "F2",
          manufacturer: "Schott",
          semiDiameter: 9,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 4 });
    const surfaces = surfaceRows(result);

    expect(surfaces.map((row) => [row.medium, row.thickness])).toEqual([
      ["air", 7],
      ["REFL", 0],
      ["N-BK7", 5],
      ["air", 10],
    ]);
    expect(surfaces.filter((row) => row.medium === "REFL")).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "object",
      objectDistance: 2,
      medium: "F2",
      manufacturer: "Schott",
    });
  });

  it("uses the nearest non-mirror surface to restore the Object medium after a full mirror reversal", () => {
    const rows = surfacesToGridRows({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 1,
          thickness: 2,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 5,
        },
        {
          label: "Default",
          curvatureRadius: 2,
          thickness: 3,
          medium: "REFL",
          manufacturer: "MirrorCo",
          semiDiameter: 5,
        },
      ],
    });

    const result = reverseRows(rows, { first: 0, last: 2 });

    expect(result[0]).toMatchObject({
      kind: "object",
      medium: "N-BK7",
      manufacturer: "Schott",
    });
  });

  it("rejects invalid reverse ranges at both lower and upper boundaries", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    expect(
      formatPrescriptionRows(rows, { mode: "reverse", first: -1, last: 2 }),
    ).toEqual({
      ok: false,
      rows: [...rows],
      error:
        "Formatting was not applied because Last Surface must be after First Surface.",
    });
    expect(
      formatPrescriptionRows(rows, { mode: "reverse", first: 1, last: 5 }),
    ).toEqual({
      ok: false,
      rows: [...rows],
      error:
        "Formatting was not applied because Last Surface must be after First Surface.",
    });
  });

  it("accepts the inclusive Object-to-Image scale range through the formatting validator", () => {
    const rows = surfacesToGridRows(baseSurfaces);

    const result = formatPrescriptionRows(rows, {
      mode: "scale",
      first: 0,
      last: 5,
      factor: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.rows.at(-1) : undefined).toMatchObject({
      kind: "image",
      curvatureRadius: 18,
    });
  });

  it("reports non-finite values from a reverse transformation atomically", () => {
    const rows = surfacesToGridRows({
      ...baseSurfaces,
      surfaces: [
        {
          ...baseSurfaces.surfaces[0],
          curvatureRadius: Number.POSITIVE_INFINITY,
        },
      ],
    });

    const result = formatPrescriptionRows(rows, {
      mode: "reverse",
      first: 0,
      last: 1,
    });

    expect(result).toEqual({
      ok: false,
      rows,
      error:
        "Formatting was not applied because one or more transformed numeric values are invalid or exceed JavaScript finite number limits.",
    });
  });
});
