import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("floors non-positive values and toggles point symbols at the one-point boundary", () => {
    const { rerender } = render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={[{ iteration: 4, merit_function_value: 0, log10_merit_function_value: 0 }]}
        onClose={jest.fn()}
      />,
    );

    const onePointOption = mockSetOption.mock.calls.at(-1)?.[0];
    expect(onePointOption.series[0].showSymbol).toBe(true);
    expect(onePointOption.series[0].data).toEqual([[4, 1e-9]]);

    rerender(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={[
          { iteration: 4, merit_function_value: 0, log10_merit_function_value: 0 },
          { iteration: 5, merit_function_value: 2, log10_merit_function_value: Math.log10(2) },
        ]}
        onClose={jest.fn()}
      />,
    );

    const twoPointOption = mockSetOption.mock.calls.at(-1)?.[0];
    expect(twoPointOption.series[0].showSymbol).toBe(false);
    expect(twoPointOption.series[0].data).toEqual([[4, 1e-9], [5, 2]]);
  });

  it("renders a danger Stop button while running and hides OK", () => {
    render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(1)}
        onClose={jest.fn()}
        onStop={jest.fn()}
        isStopping={false}
        canStop={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Stop optimization" })).toHaveTextContent("Stop");
    expect(screen.queryByRole("button", { name: "OK" })).not.toBeInTheDocument();
  });

  it("calls onStop and disables Stop while the stop request is pending", async () => {
    const onStop = jest.fn();
    const { rerender } = render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(1)}
        onClose={jest.fn()}
        onStop={onStop}
        isStopping={false}
        canStop={true}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Stop optimization" }));

    expect(onStop).toHaveBeenCalledTimes(1);

    rerender(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(1)}
        onClose={jest.fn()}
        onStop={onStop}
        isStopping={true}
        canStop={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Stopping optimization" })).toBeDisabled();
  });

  it("disables stopping and reports unsupported interrupts", async () => {
    const onStop = jest.fn();
    render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(1)}
        onClose={jest.fn()}
        onStop={onStop}
        canStop={false}
      />,
    );

    const stopButton = screen.getByRole("button", {
      name: "Stop unavailable: optimization interrupts are unsupported",
    });
    expect(stopButton).toBeDisabled();
    await userEvent.setup().click(stopButton);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("disposes the chart when the modal closes", () => {
    const { rerender } = render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={true}
        progress={makeProgress(1)}
        onClose={jest.fn()}
      />,
    );

    rerender(
      <OptimizationProgressModal
        isOpen={false}
        isOptimizing={false}
        progress={[]}
        onClose={jest.fn()}
      />,
    );

    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it("renders OK and closes after a stopped run completes", async () => {
    const onClose = jest.fn();
    render(
      <OptimizationProgressModal
        isOpen={true}
        isOptimizing={false}
        progress={makeProgress(1)}
        onClose={onClose}
        onStop={jest.fn()}
        isStopping={false}
        canStop={true}
      />,
    );

    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Stop optimization|Stopping optimization/ })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
