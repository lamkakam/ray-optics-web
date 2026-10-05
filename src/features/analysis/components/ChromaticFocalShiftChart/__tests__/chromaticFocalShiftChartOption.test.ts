import { buildChromaticFocalShiftOption } from "@/features/analysis/components/ChromaticFocalShiftChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { ChromaticFocalShiftData } from "@/features/analysis/types/plotData";

jest.mock(
  "echarts/core",
  () => ({
    use: jest.fn(),
  }),
  { virtual: true },
);

jest.mock(
  "echarts/charts",
  () => ({
    LineChart: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/components",
  () => ({
    GridComponent: {},
    TitleComponent: {},
    TooltipComponent: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/renderers",
  () => ({
    CanvasRenderer: {},
  }),
  { virtual: true },
);

describe("chromaticFocalShiftChartOption", () => {
  const chromaticFocalShiftData: ChromaticFocalShiftData = {
    fieldIdx: 1,
    x: [0.02, 0, -0.01],
    y: [486.1, 587.6, 656.3],
    unitX: "mm",
    unitY: "nm",
    referenceWavelength: 587.6,
    maxFocalShiftRange: 0.03,
  };

  it("plots focal shift against wavelength with the wavelength axis pinned to the sampled range", () => {
    const option = buildChromaticFocalShiftOption(
      chromaticFocalShiftData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis.name).toBe("Focal Shift (mm)");
    expect(option.yAxis.name).toBe("Wavelength (nm)");
    expect(option.yAxis.min).toBe(486.1);
    expect(option.yAxis.max).toBe(656.3);
    expect(option.series[0]).toEqual(
      expect.objectContaining({
        name: "Focal Shift",
        type: "line",
        showSymbol: false,
        data: [
          [0.02, 486.1],
          [0, 587.6],
          [-0.01, 656.3],
        ],
      }),
    );
  });

  it("draws a dashed zero-shift reference line across the wavelength range", () => {
    const option = buildChromaticFocalShiftOption(
      chromaticFocalShiftData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.series[1]).toEqual(
      expect.objectContaining({
        type: "line",
        silent: true,
        data: [
          [0, 486.1],
          [0, 656.3],
        ],
        lineStyle: expect.objectContaining({ type: "dashed" }),
      }),
    );
  });

  it("summarizes the reference wavelength and maximum focal shift range", () => {
    const option = buildChromaticFocalShiftOption(
      chromaticFocalShiftData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.title.text).toBe(
      "Reference wavelength: 587.6 nm · Max. focal shift range: 0.03 mm",
    );
  });

  it("leaves gaps for failed samples and reports an unavailable range", () => {
    const option = buildChromaticFocalShiftOption(
      {
        ...chromaticFocalShiftData,
        x: [
          0.02,
          // JSON null from the worker marks a failed sample.
          null as unknown as undefined,
          undefined,
        ],
        maxFocalShiftRange: undefined,
      },
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0].data).toEqual([
      [0.02, 486.1],
      ["-", 587.6],
      ["-", 656.3],
    ]);
    expect(option.title.text).toBe(
      "Reference wavelength: 587.6 nm · Max. focal shift range: n/a",
    );
  });

  it("labels afocal payloads as output vergence shift in diopters", () => {
    const option = buildChromaticFocalShiftOption(
      { ...chromaticFocalShiftData, unitX: "D", maxFocalShiftRange: 0.25 },
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis.name).toBe("Output Vergence Shift (D)");
    expect(option.title.text).toBe(
      "Reference wavelength: 587.6 nm · Max. focal shift range: 0.25 D",
    );
  });
});
