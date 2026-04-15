"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { OptimizationProgressEntry } from "@/shared/lib/types/optimization";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface OptimizationProgressModalProps {
  readonly isOpen: boolean;
  readonly isOptimizing: boolean;
  readonly progress: ReadonlyArray<OptimizationProgressEntry>;
  readonly onClose: () => void;
}

function buildOptimizationProgressOption(
  progress: ReadonlyArray<OptimizationProgressEntry>,
  textColor: string,
): EChartsCoreOption {
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
      minInterval: 1,
      name: "Iteration",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: textColor },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: "value",
      name: "log10(Total merit function value)",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: { color: textColor },
      axisLabel: { color: textColor },
    },
    series: [
      {
        type: "line",
        smooth: false,
        showSymbol: progress.length <= 1,
        data: progress.map((entry) => [entry.iteration, entry.log10_merit_function_value]),
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

export function OptimizationProgressModal({
  isOpen,
  isOptimizing,
  progress = [],
  onClose,
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
        {isOptimizing ? null : (
          <div className="flex justify-end">
            <Button variant="primary" aria-label="OK" onClick={onClose}>
              OK
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
