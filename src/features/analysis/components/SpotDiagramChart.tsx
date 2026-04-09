import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { buildSpotDiagramOption } from "@/features/analysis/components/spotDiagramChartOption";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

const SPOT_DIAGRAM_DEBOUNCE_MS = 500;

interface SpotDiagramChartProps {
  readonly spotDiagramData: SpotDiagramData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export function SpotDiagramChart({
  spotDiagramData,
  wavelengthLabels,
  autoHeight,
}: SpotDiagramChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const chartOption = useMemo(
    () => chartDimensions === undefined
      ? undefined
      : buildSpotDiagramOption(spotDiagramData, wavelengthLabels, chartDimensions.width, chartDimensions.height),
    [chartDimensions, spotDiagramData, wavelengthLabels],
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return undefined;

    const updateChartDimensions = () => {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      const nextChartHeight = autoHeight
        ? nextWidth
        : Math.max(0, Math.min(nextWidth, nextHeight));

      if (nextWidth > 0) {
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
    }, SPOT_DIAGRAM_DEBOUNCE_MS);

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
      data-testid="spot-diagram-chart"
      aria-label="Spot diagram plot"
      className="max-w-full shrink-0 overflow-hidden"
      style={chartDimensions === undefined
        ? undefined
        : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
    />
  );
}
