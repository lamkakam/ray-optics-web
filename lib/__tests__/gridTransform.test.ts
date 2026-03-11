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
      manufacturer: "",
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
      manufacturer: "",
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
      manufacturer: "",
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
          manufacturer: "",
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

  it("preserves decenter data on image row", () => {
    const decenter = {
      posAndOrientation: "decenter" as const,
      alpha: 1.0,
      beta: 2.0,
      gamma: 3.0,
      offsetX: 0.5,
      offsetY: -0.5,
    };
    const withImageDecenter: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0, decenter },
      surfaces: [],
    };
    const rows = surfacesToGridRows(withImageDecenter);
    const imageRow = rows.find((r) => r.kind === "image");
    expect(imageRow).toBeDefined();
    if (imageRow?.kind === "image") {
      expect(imageRow.decenter).toEqual(decenter);
    }
  });

  it("omits decenter from image row when not set", () => {
    const rows = surfacesToGridRows(DEMO_SURFACES);
    const imageRow = rows.find((r) => r.kind === "image");
    expect(imageRow).toBeDefined();
    if (imageRow?.kind === "image") {
      expect(imageRow.decenter).toBeUndefined();
    }
  });

  it("preserves decenter data on surface rows", () => {
    const withDecenter: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 50,
          thickness: 5,
          medium: "air",
          manufacturer: "",
          semiDiameter: 10,
          decenter: {
            posAndOrientation: "decenter",
            alpha: 1.0,
            beta: 2.0,
            gamma: 3.0,
            offsetX: 0.5,
            offsetY: -0.5,
          },
        },
      ],
    };
    const rows = surfacesToGridRows(withDecenter);
    const surfaceRow = rows[1];
    if (surfaceRow.kind === "surface") {
      expect(surfaceRow.decenter).toEqual({
        posAndOrientation: "decenter",
        alpha: 1.0,
        beta: 2.0,
        gamma: 3.0,
        offsetX: 0.5,
        offsetY: -0.5,
      });
    }
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
          manufacturer: "",
          semiDiameter: 10,
          aspherical: {
            conicConstant: -1.5,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };
    const rows = surfacesToGridRows(withAsph);
    const surfaceRow = rows[1];
    if (surfaceRow.kind === "surface") {
      expect(surfaceRow.aspherical).toEqual({
        conicConstant: -1.5,
        polynomialCoefficients: [0.001, 0.0002],
      });
    }
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

  it("excludes decenter key when undefined (surface row)", () => {
    const rows: GridRow[] = [
      { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 },
      {
        id: "s1",
        kind: "surface",
        label: "Default",
        curvatureRadius: 0,
        thickness: 0,
        medium: "air",
        manufacturer: "",
        semiDiameter: 1,
      },
      { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
    ];

    const surfaces = gridRowsToSurfaces(rows);
    expect(surfaces.surfaces[0]).not.toHaveProperty("decenter");
  });

  it("preserves decenter on image row", () => {
    const decenter = {
      posAndOrientation: "bend" as const,
      alpha: 0,
      beta: 1.5,
      gamma: 0,
      offsetX: 0.1,
      offsetY: 0.2,
    };
    const rows: GridRow[] = [
      { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 },
      { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0, decenter },
    ];
    const surfaces = gridRowsToSurfaces(rows);
    expect(surfaces.image.decenter).toEqual(decenter);
  });

  it("excludes decenter key from image when undefined", () => {
    const rows: GridRow[] = [
      { id: OBJECT_ROW_ID, kind: "object", objectDistance: 0 },
      { id: IMAGE_ROW_ID, kind: "image", curvatureRadius: 0 },
    ];
    const surfaces = gridRowsToSurfaces(rows);
    expect(surfaces.image).not.toHaveProperty("decenter");
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
        manufacturer: "",
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
          manufacturer: "",
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

  it("round-trips surfaces with decenter data", () => {
    const withDecenter: Surfaces = {
      object: { distance: 0 },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 50,
          thickness: 5,
          medium: "air",
          manufacturer: "",
          semiDiameter: 10,
          decenter: {
            posAndOrientation: "bend",
            alpha: 0,
            beta: 5.0,
            gamma: 0,
            offsetX: 1.0,
            offsetY: 0,
          },
        },
      ],
    };
    const result = gridRowsToSurfaces(surfacesToGridRows(withDecenter));
    expect(result).toEqual(withDecenter);
  });

  it("round-trips image decenter data", () => {
    const withImageDecenter: Surfaces = {
      object: { distance: 0 },
      image: {
        curvatureRadius: 0,
        decenter: {
          posAndOrientation: "dec and return",
          alpha: 1.0,
          beta: 0,
          gamma: 0,
          offsetX: 0.5,
          offsetY: 0.5,
        },
      },
      surfaces: [],
    };
    const result = gridRowsToSurfaces(surfacesToGridRows(withImageDecenter));
    expect(result).toEqual(withImageDecenter);
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
