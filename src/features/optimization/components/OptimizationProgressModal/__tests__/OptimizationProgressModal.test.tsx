import { render, screen } from "@testing-library/react";
import * as echarts from "echarts/core";
import { OptimizationProgressModal } from "@/features/optimization/components/OptimizationProgressModal";
import type { OptimizationProgressEntry } from "@/features/optimization/types/optimizationWorkerTypes";

const mockSetOption = jest.fn();
const mockResize = jest.fn();
const mockDispose = jest.fn();

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: mockSetOption,
    resize: mockResize,
    dispose: mockDispose,
  })),
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

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

function makeProgress(count: number): OptimizationProgressEntry[] {
  return Array.from({ length: count }, (_, iteration) => ({
    iteration,
    merit_function_value: iteration + 1,
    log10_merit_function_value: Math.log10(iteration + 1),
  }));
}

describe("OptimizationProgressModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("plots only the newest 2000 progress points when progress exceeds the chart window", () => {
    render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(2051)}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("optimization-progress-chart")).toBeInTheDocument();
    expect(echarts.init).toHaveBeenCalled();

    const option = mockSetOption.mock.calls[0]?.[0];
    const seriesData = option.series[0].data;

    expect(seriesData).toHaveLength(2000);
    expect(seriesData[0]).toEqual([51, 52]);
    expect(seriesData.at(-1)).toEqual([2050, 2051]);
    expect(option.xAxis.min).toBe(51);
  });
});
