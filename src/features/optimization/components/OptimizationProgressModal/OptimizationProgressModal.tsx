"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import {
  formatLogScalePlotValue,
  MINIMUM_NON_ZERO_PLOT_VALUE,
} from "@/shared/lib/chart-formatting/formatPlotValue";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { OptimizationProgressEntry } from "@/features/optimization/types/optimizationWorkerTypes";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const OPTIMIZATION_PROGRESS_CHART_POINT_LIMIT = 2000;

interface OptimizationProgressModalProps {
  readonly isOpen: boolean;
  readonly isOptimizing: boolean;
  readonly progress: ReadonlyArray<OptimizationProgressEntry>;
  readonly onClose: () => void;
  readonly onStop?: () => void;
  readonly isStopping?: boolean;
  readonly canStop?: boolean;
}

function buildOptimizationProgressOption(
  progress: ReadonlyArray<OptimizationProgressEntry>,
  textColor: string,
): EChartsCoreOption {
  const plottedProgress = progress.slice(-OPTIMIZATION_PROGRESS_CHART_POINT_LIMIT);
  const firstPlottedIteration = plottedProgress[0]?.iteration;

  return {
    animation: false,
    grid: {
      left: 56,
      right: 24,
      top: 24,
      bottom: 56,
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "value",
      min: firstPlottedIteration,
      minInterval: 1,
      name: "Iteration",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: textColor },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: "log",
      name: "Total merit function value",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: { color: textColor },
      axisLabel: {
        color: textColor,
        formatter: formatLogScalePlotValue,
      },
    },
    series: [
      {
        type: "line",
        smooth: false,
        showSymbol: plottedProgress.length <= 1,
        data: plottedProgress.map((entry) => [
          entry.iteration,
          Math.max(entry.merit_function_value, MINIMUM_NON_ZERO_PLOT_VALUE),
        ]),
        lineStyle: {
          width: 2,
          color: "#2563eb",
        },
        itemStyle: {
          color: "#2563eb",
        },
      },
    ],
  };
}

/**
 *
 * @remarks
 * ## Behavior
 *
 * - Uses the shared `Modal` primitive with `size="4xl"` and title `Optimization Progress`.
 * - Imports progress entry types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - While `isOptimizing` is `true`, the backdrop is non-dismissible and the footer renders a danger `Stop` button instead of `OK`.
 * - The stop control calls `onStop` when enabled, uses `aria-label="Stop optimization"` normally, switches to disabled `aria-label="Stopping optimization"` while `isStopping` is true, and is disabled with `aria-label="Stop unavailable: optimization interrupts are unsupported"` when `canStop` is false.
 * - After optimization completes, renders an `OK` button and allows backdrop dismissal through `onClose`.
 * - Initializes one ECharts canvas instance per open modal session and updates it whenever `progress` or theme text color changes.
 * - Series data is built from a chart-only window of the newest 2000 `progress` entries; the underlying optimization progress data is not mutated.
 * - Each plotted y value is floored to `MINIMUM_NON_ZERO_PLOT_VALUE` (`1e-9`) before it is sent to the log-scale series.
 *
 *
 * Blocking optimization-status modal for the Optimization page. It renders an Apache ECharts line chart of optimization progress with iteration on the x-axis and raw `total merit function value` on a logarithmic y-axis.
 *
 * ## Chart Conventions
 *
 * - `xAxis.name` is `Iteration`.
 * - `xAxis.min` is the iteration of the first plotted point, so the visible x-axis shifts with the 2000-point chart window.
 * - `yAxis.type` is `log`.
 * - `yAxis.name` is `Total merit function value`.
 * - `yAxis.axisLabel.formatter` uses the shared log-scale plot formatter so `0` and sub-floor values display as `1e-9`.
 * - Uses a single blue line series with tooltip support and no animation so streamed updates stay stable.
 * - Keeps all points through 2000 progress entries. Starting at 2001 entries, the oldest entries are dropped from the rendered ECharts series so only the newest 2000 points are plotted.
 *
 * ## Modal Footer
 *
 * - Stop and OK actions are passed to `Modal.footer` so the active action remains fixed while progress content scrolls.
 */
export function OptimizationProgressModal({
  isOpen,
  isOptimizing,
  progress = [],
  onClose,
  onStop,
  isStopping = false,
  canStop = false,
}: OptimizationProgressModalProps) {
  const { theme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const textColor = theme === "dark"
    ? globalTokens.echarts.text.dark
    : globalTokens.echarts.text.light;

  useEffect(() => {
    if (!isOpen) {
      chartRef.current?.dispose();
      chartRef.current = undefined;
      return;
    }

    const container = chartContainerRef.current;
    if (container === null) {
      return;
    }

    if (chartRef.current === undefined) {
      chartRef.current = echarts.init(container, undefined, { renderer: "canvas" });
    }

    chartRef.current.setOption(buildOptimizationProgressOption(progress, textColor), true);
    chartRef.current.resize();
  }, [isOpen, progress, textColor]);

  useEffect(() => () => {
    chartRef.current?.dispose();
    chartRef.current = undefined;
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      title="Optimization Progress"
      titleId="optimization-progress-modal-title"
      size="4xl"
      onBackdropClick={isOptimizing ? undefined : onClose}
      footer={isOptimizing ? (
        <div className="flex justify-end">
          <Button
            variant="danger"
            aria-label={
              !canStop
                ? "Stop unavailable: optimization interrupts are unsupported"
                : isStopping
                  ? "Stopping optimization"
                  : "Stop optimization"
            }
            disabled={!canStop || isStopping}
            onClick={onStop}
          >
            {isStopping ? "Stopping..." : "Stop"}
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="primary" aria-label="OK" onClick={onClose}>
            OK
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Paragraph>
          {isOptimizing
            ? "Running optimization in Pyodide. The chart updates as new solver states are evaluated."
            : "Optimization finished. Review the merit-function history, then close this dialog."}
        </Paragraph>
        <div
          ref={chartContainerRef}
          data-testid="optimization-progress-chart"
          aria-label="Optimization progress chart"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
          style={{ height: "320px" }}
        />
      </div>
    </Modal>
  );
}
