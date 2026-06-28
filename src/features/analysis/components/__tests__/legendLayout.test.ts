import { buildLegendWrapLayout } from "@/features/analysis/components/legendLayout";

describe("buildLegendWrapLayout", () => {
  it("centers one-row legends within the supplied plot bounds", () => {
    expect(buildLegendWrapLayout(
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      60,
      28,
    )).toEqual({
      left: 257,
      right: 225,
      extraTop: 0,
    });
  });
});
