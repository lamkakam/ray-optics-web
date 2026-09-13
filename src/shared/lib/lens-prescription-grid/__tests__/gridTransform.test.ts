import {
  generateRowId,
  gridRowsToSurfaces,
  surfacesToGridRows,
} from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { Surfaces } from "@/shared/lib/types/opticalModel";

describe("gridTransform", () => {
  it("generates distinct sequential surface ids", () => {
    const first = Number(generateRowId().replace("row-surface-", ""));
    const second = Number(generateRowId().replace("row-surface-", ""));

    expect(second).toBe(first + 1);
  });

  it("round-trips defined surface comments while preserving omitted comments", () => {
    const surfaces: Surfaces = {
      object: { distance: 1e10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          comment: "Front element",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
        },
        {
          label: "Stop",
          curvatureRadius: -12,
          thickness: 2,
          medium: "air",
          manufacturer: "",
          semiDiameter: 4,
        },
      ],
    };

    const rows = surfacesToGridRows(surfaces);

    expect(rows[1]).toMatchObject({
      kind: "surface",
      comment: "Front element",
    });
    expect(rows[2]).not.toHaveProperty("comment");
    expect(gridRowsToSurfaces(rows).surfaces).toEqual(surfaces.surfaces);
  });

  it("preserves aperture fields between surfaces and grid rows", () => {
    const surfaces: Surfaces = {
      object: { distance: 1e10, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
          edge_aperture: {
            shape: "circular",
            radius: 4.5,
            offsetX: 3,
            offsetY: -4,
          },
        },
      ],
    };

    const rows = surfacesToGridRows(surfaces);
    const surfaceRow = rows.find((row) => row.kind === "surface");

    expect(surfaceRow).toMatchObject({
      clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
      edge_aperture: {
        shape: "circular",
        radius: 4.5,
        offsetX: 3,
        offsetY: -4,
      },
    });
    expect(gridRowsToSurfaces(rows).surfaces[0]).toMatchObject({
      clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
      edge_aperture: {
        shape: "circular",
        radius: 4.5,
        offsetX: 3,
        offsetY: -4,
      },
    });
  });

  it("preserves every optional surface and image field when converting both directions", () => {
    const surfaces: Surfaces = {
      object: { distance: 20, medium: "air", manufacturer: "" },
      image: {
        curvatureRadius: -4,
        decenter: {
          coordinateSystemStrategy: "reverse",
          alpha: 1,
          beta: 2,
          gamma: 3,
          offsetX: 4,
          offsetY: 5,
        },
      },
      surfaces: [
        {
          label: "Stop",
          comment: "all optional fields",
          curvatureRadius: 12,
          thickness: 3,
          medium: "N-BK7",
          manufacturer: "Schott",
          semiDiameter: 5,
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 2,
            offsetX: 1,
            offsetY: -1,
          },
          edge_aperture: {
            shape: "circular",
            radius: 4,
            offsetX: 2,
            offsetY: -2,
          },
          aspherical: { kind: "Conic", conicConstant: -1 },
          decenter: {
            coordinateSystemStrategy: "bend",
            alpha: 1,
            beta: 2,
            gamma: 3,
            offsetX: 4,
            offsetY: 5,
          },
          diffractiveElement: { diffractionGrating: { lpmm: 600, order: 1 } },
        },
      ],
    };

    const rows = surfacesToGridRows(surfaces);
    expect(rows[0]).toEqual({
      id: "row-object",
      kind: "object",
      objectDistance: 20,
      medium: "air",
      manufacturer: "",
    });
    expect(rows.at(-1)).toEqual({
      id: "row-image",
      kind: "image",
      curvatureRadius: -4,
      decenter: surfaces.image.decenter,
    });
    expect(gridRowsToSurfaces(rows)).toEqual(surfaces);
  });

  it("uses editor defaults when endpoint rows are absent and keeps omitted optional fields omitted", () => {
    const row = {
      id: "surface-1",
      kind: "surface",
      label: undefined,
      curvatureRadius: undefined,
      thickness: undefined,
      medium: undefined,
      manufacturer: undefined,
      semiDiameter: undefined,
    } as unknown as GridRow;

    const converted = gridRowsToSurfaces([row]);

    expect(converted).toEqual({
      object: { distance: 0, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 0 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 0,
          thickness: 0,
          medium: "air",
          manufacturer: "",
          semiDiameter: 1,
        },
      ],
    });
    expect(converted.surfaces[0]).not.toHaveProperty("comment");
    expect(converted.surfaces[0]).not.toHaveProperty("clear_aperture");
    expect(converted.surfaces[0]).not.toHaveProperty("edge_aperture");
    expect(converted.surfaces[0]).not.toHaveProperty("aspherical");
    expect(converted.surfaces[0]).not.toHaveProperty("decenter");
    expect(converted.surfaces[0]).not.toHaveProperty("diffractiveElement");
    expect(converted.image).not.toHaveProperty("decenter");
  });

  it("finds Object by its discriminant when rows are supplied in a noncanonical order", () => {
    const surface = {
      id: "surface-first",
      kind: "surface" as const,
      label: "Default",
      curvatureRadius: 1,
      thickness: 2,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 5,
    } satisfies Extract<GridRow, { kind: "surface" }>;
    const object = {
      id: "custom-object",
      kind: "object" as const,
      objectDistance: 10,
      medium: "air",
      manufacturer: "Original",
    } satisfies Extract<GridRow, { kind: "object" }>;

    expect(gridRowsToSurfaces([surface, object])).toMatchObject({
      object: { distance: 10, medium: "air", manufacturer: "Original" },
    });
  });

  it("omits every optional field when converting a surface without optional data", () => {
    const rows = surfacesToGridRows({
      object: { distance: 20, medium: "air", manufacturer: "" },
      image: { curvatureRadius: 4 },
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 10,
          thickness: 2,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
        },
      ],
    });

    expect(rows[1]).not.toHaveProperty("comment");
    expect(rows[1]).not.toHaveProperty("clear_aperture");
    expect(rows[1]).not.toHaveProperty("edge_aperture");
    expect(rows[1]).not.toHaveProperty("aspherical");
    expect(rows[1]).not.toHaveProperty("decenter");
    expect(rows[1]).not.toHaveProperty("diffractiveElement");
    expect(rows[2]).not.toHaveProperty("decenter");
  });
});
