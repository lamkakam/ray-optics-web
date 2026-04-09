import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { buildOpdFanChartOption } from "@/features/analysis/components/opdFanChartOption";
import type { OpdFanData } from "@/shared/lib/types/opticalModel";

const OPD_FAN_DEBOUNCE_MS = 500;

interface OpdFanChartProps {
  readonly opdFanData: OpdFanData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export function OpdFanChart({
  opdFanData,
  wavelengthLabels,
  autoHeight,
}: OpdFanChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const chartOption = useMemo(
    () => chartDimensions === undefined
      ? undefined
      : buildOpdFanChartOption(opdFanData, wavelengthLabels, chartDimensions.width, chartDimensions.height),
    [chartDimensions, opdFanData, wavelengthLabels],
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return undefined;

    const updateChartDimensions = () => {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      const nextChartHeight = autoHeight
        ? Math.max(Math.round(nextWidth / 2), 320)
        : Math.max(0, nextHeight);

      if (nextWidth > 0 && nextChartHeight > 0) {
        setChartDimensions({
          width: nextWidth,
          height: nextChartHeight,
        });
        return;
      }

      setChartDimensions(undefined);
    };

    updateChartDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateChartDimensions();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoHeight]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || chartOption === undefined) return undefined;

    const timeoutId = window.setTimeout(() => {
      if (!chartRef.current) {
        chartRef.current = echarts.init(container, undefined, { renderer: "canvas" });
      }
      chartRef.current.setOption(chartOption, true);
      chartRef.current.resize();
    }, OPD_FAN_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chartOption]);

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.dispose();
      chartRef.current = undefined;
    };
  }, []);

  return (
    <div
      ref={chartContainerRef}
      data-testid="opd-fan-chart"
      aria-label="OPD fan plot"
      className="max-w-full shrink-0 overflow-hidden"
      style={chartDimensions === undefined
        ? undefined
        : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
    />
  );
}
