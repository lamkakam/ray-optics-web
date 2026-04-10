import { formatPlotValue } from "@/features/analysis/shared/formatPlotValue";

describe("formatPlotValue", () => {
  it("formats finite values to 2 significant figures", () => {
    expect(formatPlotValue(0.1234)).toBe("0.12");
    expect(formatPlotValue(987.6)).toBe("990");
  });

  it("returns 0 for zero and non-finite values", () => {
    expect(formatPlotValue(0)).toBe("0");
    expect(formatPlotValue(Number.NaN)).toBe("0");
    expect(formatPlotValue(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatPlotValue(Number.NEGATIVE_INFINITY)).toBe("0");
  });

  it("clamps values smaller than 1e-7 to 0", () => {
    expect(formatPlotValue(1e-8)).toBe("0");
    expect(formatPlotValue(-1e-8)).toBe("0");
  });

  it("keeps the 1e-7 boundary value formatable", () => {
    expect(formatPlotValue(1e-7)).toBe("1e-7");
    expect(formatPlotValue(-1e-7)).toBe("-1e-7");
  });
});
