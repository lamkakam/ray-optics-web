import { gridRowsToSurfaces, surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { Surfaces } from "@/shared/lib/types/opticalModel";

describe("gridTransform", () => {
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

    expect(rows[1]).toMatchObject({ kind: "surface", comment: "Front element" });
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
          edge_aperture: { shape: "circular", radius: 4.5, offsetX: 3, offsetY: -4 },
        },
      ],
    };

    const rows = surfacesToGridRows(surfaces);
    const surfaceRow = rows.find((row) => row.kind === "surface");

    expect(surfaceRow).toMatchObject({
      clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
      edge_aperture: { shape: "circular", radius: 4.5, offsetX: 3, offsetY: -4 },
    });
    expect(gridRowsToSurfaces(rows).surfaces[0]).toMatchObject({
      clear_aperture: { shape: "circular", offsetX: -1, offsetY: 2 },
      edge_aperture: { shape: "circular", radius: 4.5, offsetX: 3, offsetY: -4 },
    });
  });
});
