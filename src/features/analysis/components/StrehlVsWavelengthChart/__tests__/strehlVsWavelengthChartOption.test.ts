import { buildStrehlVsWavelengthOption } from "@/features/analysis/components/StrehlVsWavelengthChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { StrehlVsWavelengthData } from "@/features/analysis/types/plotData";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  LineChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("strehlVsWavelengthChartOption", () => {
  const strehlVsWavelengthData: StrehlVsWavelengthData = {
    fieldIdx: 0,
    x: [486.1, 587.6, 656.3],
    y: [0.72, 0.94, 0.81],
    unitX: "nm",
    unitY: "",
  };

  it("builds a symbol-free Strehl line with wavelength and Strehl ratio axes", () => {
    const option = buildStrehlVsWavelengthOption(
      strehlVsWavelengthData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis.name).toBe("Wavelength (nm)");
    expect(option.yAxis.name).toBe("Strehl Ratio");
    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(1);
    expect(option.series).toEqual([
      expect.objectContaining({
        name: "Strehl",
        type: "line",
        showSymbol: false,
        data: [[486.1, 0.72], [587.6, 0.94], [656.3, 0.81]],
      }),
    ]);
  });
});
