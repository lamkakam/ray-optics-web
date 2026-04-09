import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { buildSurfaceBySurface3rdOrderChartOption } from "@/features/analysis/components/surfaceBySurface3rdOrderChartOption";
import type { SeidelSurfaceBySurfaceData } from "@/shared/lib/types/opticalModel";

const SURFACE_BY_SURFACE_3RD_ORDER_DEBOUNCE_MS = 500;

interface SurfaceBySurface3rdOrderChartProps {
  readonly surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData;
  readonly autoHeight?: boolean;
}

export function SurfaceBySurface3rdOrderChart({
  surfaceBySurface3rdOrderData,
  autoHeight,
}: SurfaceBySurface3rdOrderChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const chartOption = useMemo(
    () => chartDimensions === undefined
      ? undefined
      : buildSurfaceBySurface3rdOrderChartOption(
        surfaceBySurface3rdOrderData,
        chartDimensions.width,
        chartDimensions.height,
      ),
    [chartDimensions, surfaceBySurface3rdOrderData],
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return undefined;

    const updateChartDimensions = () => {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      const nextChartHeight = autoHeight
        ? Math.max(Math.round(nextWidth * 0.6), 320)
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
    }, SURFACE_BY_SURFACE_3RD_ORDER_DEBOUNCE_MS);

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
      data-testid="surface-by-surface-3rd-order-chart"
      aria-label="Surface by surface 3rd order aberration plot"
      className="max-w-full shrink-0 overflow-hidden"
      style={chartDimensions === undefined
        ? undefined
        : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
    />
  );
}
