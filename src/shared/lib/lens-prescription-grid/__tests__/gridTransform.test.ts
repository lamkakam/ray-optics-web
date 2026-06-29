import { gridRowsToSurfaces, surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { Surfaces } from "@/shared/lib/types/opticalModel";

describe("gridTransform", () => {
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
          clear_aperture: { shape: "circular" },
          edge_aperture: { shape: "circular", radius: 4.5 },
        },
      ],
    };

    const rows = surfacesToGridRows(surfaces);
    const surfaceRow = rows.find((row) => row.kind === "surface");

    expect(surfaceRow).toMatchObject({
      clear_aperture: { shape: "circular" },
      edge_aperture: { shape: "circular", radius: 4.5 },
    });
    expect(gridRowsToSurfaces(rows).surfaces[0]).toMatchObject({
      clear_aperture: { shape: "circular" },
      edge_aperture: { shape: "circular", radius: 4.5 },
    });
  });
});
