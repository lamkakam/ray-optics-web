import {
  formatLogScalePlotValue,
  formatPlotValue,
} from "@/shared/lib/chart-formatting/formatPlotValue";

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

  it("clamps values smaller than 1e-9 to 0", () => {
    expect(formatPlotValue(1e-10)).toBe("0");
    expect(formatPlotValue(-1e-10)).toBe("0");
  });

  it("uses scientific notation for values between 1e-9 and 1e-3", () => {
    expect(formatPlotValue(1e-8)).toBe("1e-8");
    expect(formatPlotValue(-1e-8)).toBe("-1e-8");
    expect(formatPlotValue(5e-4)).toBe("5e-4");
    expect(formatPlotValue(-5e-4)).toBe("-5e-4");
  });

  it("keeps the 1e-9 boundary value formatable", () => {
    expect(formatPlotValue(1e-9)).toBe("1e-9");
    expect(formatPlotValue(-1e-9)).toBe("-1e-9");
  });

  it("keeps the 1e-3 boundary out of scientific notation", () => {
    expect(formatPlotValue(1e-3)).toBe("0.001");
    expect(formatPlotValue(-1e-3)).toBe("-0.001");
  });

  it("uses scientific notation for values larger than 1000", () => {
    expect(formatPlotValue(1000.1)).toBe("1e+3");
    expect(formatPlotValue(-1000.1)).toBe("-1e+3");
  });
});

describe("formatLogScalePlotValue", () => {
  it("floors non-finite values to the minimum non-zero scientific format", () => {
    expect(formatLogScalePlotValue(Number.NaN)).toBe("1e-9");
    expect(formatLogScalePlotValue(Number.POSITIVE_INFINITY)).toBe("1e-9");
    expect(formatLogScalePlotValue(Number.NEGATIVE_INFINITY)).toBe("1e-9");
  });

  it("floors zero and sub-threshold finite values to 1e-9", () => {
    expect(formatLogScalePlotValue(0)).toBe("1e-9");
    expect(formatLogScalePlotValue(1e-10)).toBe("1e-9");
    expect(formatLogScalePlotValue(1e-9)).toBe("1e-9");
  });

  it("formats values above the floor with the shared plot formatter", () => {
    expect(formatLogScalePlotValue(5e-4)).toBe("5e-4");
    expect(formatLogScalePlotValue(1e-3)).toBe("0.001");
    expect(formatLogScalePlotValue(10)).toBe("10");
  });
});
