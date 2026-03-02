import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { OBJECT_ROW_ID, IMAGE_ROW_ID, type GridRow } from "@/lib/gridTypes";
import type { Surfaces } from "@/lib/opticalModel";

// Cooke Triplet demo surfaces for testing
const DEMO_SURFACES: Surfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 26.777,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -200.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "air",
      semiDiameter: 12.5,
    },
    {
      label: "Stop",
      curvatureRadius: -35.0,
      thickness: 2.0,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 35.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "air",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 200.0,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -26.777,
      thickness: 68.0,
      medium: "air",
      manufacturer: "air",
      semiDiameter: 12.5,
    },
  ],
};

describe("surfacesToGridRows", () => {
  it("converts Surfaces to GridRow[] with object, surface, and image rows", () => {
    const rows = surfacesToGridRows(DEMO_SURFACES);

    expect(rows).toHaveLength(8); // 1 object + 6 surfaces + 1 image

    // Object row
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: OBJECT_ROW_ID,
        kind: "object",
        objectDistance: 1e10,
      })
    );

    // First surface row
    expect(rows[1]).toEqual(
      expect.objectContaining({
        kind: "surface",
        label: "Default",
        curvatureRadius: 26.777,
        thickness: 6.0,
        medium: "SK16",
        manufacturer: "Schott",
        semiDiameter: 12.5,
      })
    );

    // Stop surface (row index 3)
    expect(rows[3]).toEqual(
      expect.objectContaining({
        kind: "surface",
        label: "Stop",
        curvatureRadius: -35.0,
        medium: "F2",
      })
    );

    // Image row
    expect(rows[7]).toEqual(
      expect.objectContaining({
        id: IMAGE_ROW_ID,
        kind: "image",
        curvatureRadius: 0,
      })
    );
  });

  it("assigns unique IDs to surface rows", () => {
    const rows = surfacesToGridRows(DEMO_SURFACES);
    const surfaceRows = rows.filter((r) => r.kind === "surface");
    const ids = surfaceRows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles a single surface", () => {
    const single: Surfaces = {
      object: { distance: 100 },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 50,
          thickness: 5,
          medium: "air",
          manufacturer: "air",
          semiDiameter: 10,
        },
      ],
    };
    const rows = surfacesToGridRows(single);
    expect(rows).toHaveLength(3);
    expect(rows[0].kind).toBe("object");
    expect(rows[1].kind).toBe("surface");
    expect(rows[2].kind).toBe("image");
  });

  it("handles zero surfaces", () => {
    const empty: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0 },
      surfaces: [],
    };
    const rows = surfacesToGridRows(empty);
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("object");
    expect(rows[1].kind).toBe("image");
  });

  it("preserves aspherical data", () => {
    const withAsph: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 50,
          thickness: 5,
          medium: "air",
          manufacturer: "air",
          semiDiameter: 10,
          aspherical: {
            conicConstant: -1.5,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };
    const rows = surfacesToGridRows(withAsph);
    expect(rows[1].aspherical).toEqual({
      conicConstant: -1.5,
      polynomialCoefficients: [0.001, 0.0002],
    });
  });
});

describe("gridRowsToSurfaces", () => {
  it("converts GridRow[] back to Surfaces", () => {
    const rows: GridRow[] = [
      { id: OBJECT_ROW_ID, kind: "object", objectDistance: 1e10 },
      {
        id: "s1",
        kind: "surface",
        label: "Default",
        curvatureRadius: 50,
        thickness: 5,
        medium: "BK7",
        manufacturer: "Schott",
        semiDiameter: 10,
      },
      { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
    ];

    const surfaces = gridRowsToSurfaces(rows);
    expect(surfaces.object.distance).toBe(1e10);
    expect(surfaces.image.curvatureRadius).toBe(0);
    expect(surfaces.surfaces).toHaveLength(1);
    expect(surfaces.surfaces[0]).toEqual({
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    });
  });

  it("excludes aspherical key when undefined", () => {
    const rows: GridRow[] = [
      { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 },
      {
        id: "s1",
        kind: "surface",
        label: "Default",
        curvatureRadius: 0,
        thickness: 0,
        medium: "air",
        manufacturer: "air",
        semiDiameter: 1,
      },
      { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
    ];

    const surfaces = gridRowsToSurfaces(rows);
    expect(surfaces.surfaces[0]).not.toHaveProperty("aspherical");
  });
});

describe("round-trip", () => {
  it("surfacesToGridRows → gridRowsToSurfaces preserves data", () => {
    const result = gridRowsToSurfaces(surfacesToGridRows(DEMO_SURFACES));
    expect(result).toEqual(DEMO_SURFACES);
  });

  it("round-trips surfaces with aspherical data", () => {
    const withAsph: Surfaces = {
      object: { distance: 100 },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 50,
          thickness: 5,
          medium: "air",
          manufacturer: "air",
          semiDiameter: 10,
          aspherical: {
            conicConstant: -1.0,
            polynomialCoefficients: [0.001, 0, 0.0003],
          },
        },
      ],
    };
    const result = gridRowsToSurfaces(surfacesToGridRows(withAsph));
    expect(result).toEqual(withAsph);
  });

  it("round-trips zero surfaces", () => {
    const empty: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0 },
      surfaces: [],
    };
    const result = gridRowsToSurfaces(surfacesToGridRows(empty));
    expect(result).toEqual(empty);
  });
});
