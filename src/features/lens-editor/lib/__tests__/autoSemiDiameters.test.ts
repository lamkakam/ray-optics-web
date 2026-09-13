import { mapPhysicalSurfaceSemiDiameters } from "@/features/lens-editor/lib/autoSemiDiameters";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

const rows: GridRow[] = [
  {
    id: "row-object",
    kind: "object",
    objectDistance: 1e10,
    medium: "air",
    manufacturer: "",
  },
  {
    id: "surface-1",
    kind: "surface",
    label: "Default",
    curvatureRadius: 10,
    thickness: 2,
    medium: "air",
    manufacturer: "",
    semiDiameter: 4,
  },
  {
    id: "surface-2",
    kind: "surface",
    label: "Default",
    curvatureRadius: 20,
    thickness: 3,
    medium: "air",
    manufacturer: "",
    semiDiameter: 5,
  },
  { id: "row-image", kind: "image", curvatureRadius: 0 },
];

describe("mapPhysicalSurfaceSemiDiameters", () => {
  it("maps sequential worker values to physical surface IDs and omits endpoints", () => {
    expect(mapPhysicalSurfaceSemiDiameters(rows, [100, 11, 12, 200])).toEqual({
      "surface-1": 11,
      "surface-2": 12,
    });
  });

  it("rejects a worker result whose endpoint-inclusive length does not match the rows", () => {
    expect(() => mapPhysicalSurfaceSemiDiameters(rows, [100, 11, 12])).toThrow(
      "Expected 4 sequential semi-diameters, received 3.",
    );
  });
});
