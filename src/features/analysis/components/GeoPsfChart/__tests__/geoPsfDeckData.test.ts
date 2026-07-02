import { buildGeoPsfPoints } from "@/features/analysis/components/GeoPsfChart/geoPsfDeckData";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

describe("geoPsfDeckData", () => {
  const geoPsfData: GeoPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02, 0.03],
    y: [-0.01, 0, 0.01],
    unitX: "mm",
    unitY: "mm",
  };

  it("pairs x and y samples up to the shorter axis length", () => {
    const prepared = buildGeoPsfPoints(geoPsfData);

    expect(prepared.points).toEqual([
      { x: -0.02, y: -0.01 },
      { x: 0, y: 0 },
      { x: 0.02, y: 0.01 },
    ]);
  });

  it("uses a symmetric axis extent from finite x and y samples", () => {
    const prepared = buildGeoPsfPoints({
      ...geoPsfData,
      x: [-0.1, Number.NaN, 0.03],
      y: [0.02, 0.2, Number.POSITIVE_INFINITY],
    });

    expect(prepared.points).toEqual([
      { x: -0.1, y: 0.02 },
    ]);
    expect(prepared.axisExtent).toBe(0.2);
  });

  it("defaults the axis extent to 1 when no usable finite extent exists", () => {
    const prepared = buildGeoPsfPoints({
      ...geoPsfData,
      x: [Number.NaN, Number.POSITIVE_INFINITY],
      y: [Number.NEGATIVE_INFINITY, Number.NaN],
    });

    expect(prepared.points).toEqual([]);
    expect(prepared.axisExtent).toBe(1);
  });
});
