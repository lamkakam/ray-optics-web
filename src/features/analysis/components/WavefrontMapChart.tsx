import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { buildWavefrontMapOption } from "@/features/analysis/components/wavefrontMapChartOption";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { WavefrontMapData } from "@/shared/lib/types/opticalModel";

const WAVEFRONT_MAP_DEBOUNCE_MS = 500;

interface WavefrontMapChartProps {
  readonly wavefrontMapData: WavefrontMapData;
  readonly autoHeight?: boolean;
}

export function WavefrontMapChart({
  wavefrontMapData,
  autoHeight,
}: WavefrontMapChartProps) {
  const { theme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const chartTextColor = theme === "dark"
    ? globalTokens.echarts.text.dark
    : globalTokens.echarts.text.light;
  const chartOption = useMemo(
    () => chartDimensions === undefined
      ? undefined
      : buildWavefrontMapOption(wavefrontMapData, chartDimensions.width, chartDimensions.height, chartTextColor),
    [chartDimensions, chartTextColor, wavefrontMapData],
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
    }, WAVEFRONT_MAP_DEBOUNCE_MS);

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
      data-testid="wavefront-map-chart"
      aria-label="Wavefront Map plot"
      className="max-w-full shrink-0 overflow-hidden"
      style={chartDimensions === undefined
        ? undefined
        : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
    />
  );
}
