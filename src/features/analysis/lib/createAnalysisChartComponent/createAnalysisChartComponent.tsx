/**
# `features/analysis/lib/createAnalysisChartComponent/createAnalysisChartComponent.tsx`

## Dependencies

- `echarts/core`
- `useTheme()` from `shared/components/providers/ThemeProvider`
- `useDebouncedCallback()` from `shared/hooks/useDebouncedCallback`
- `globalTokens` from `shared/tokens/styleTokens`
*/
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useDebouncedCallback } from "@/shared/hooks/useDebouncedCallback";
import { globalTokens } from "@/shared/tokens/styleTokens";

type ChartDimensions = {
  readonly width: number;
  readonly height: number;
};

type ChartSizingInput = {
  readonly parentWidth: number;
  readonly parentHeight: number;
  readonly autoHeight?: boolean;
};

type ChartDimensionValidationInput = {
  readonly width: number;
  readonly height: number;
};

type CreateAnalysisChartComponentConfig<
  Props extends { readonly autoHeight?: boolean },
  BuilderArgs,
  RuntimeContext,
> = {
  readonly displayName: string;
  readonly testId: string;
  readonly ariaLabel: string;
  readonly debounceMs: number;
  readonly useRuntimeContext?: () => RuntimeContext;
  readonly getBuilderArgs: (props: Props, runtimeContext: RuntimeContext) => BuilderArgs;
  readonly getChartHeight: (input: ChartSizingInput, runtimeContext: RuntimeContext) => number;
  readonly buildOption: (
    builderArgs: BuilderArgs,
    chartWidth: number,
    chartHeight: number,
    chartTextColor: string,
  ) => EChartsCoreOption;
  readonly isDimensionValid?: (input: ChartDimensionValidationInput) => boolean;
};

const DEFAULT_DIMENSION_VALIDATION = ({ width }: ChartDimensionValidationInput) => width > 0;

/**
## Purpose

Provides a higher-order factory that returns typed analysis chart function components with a shared Apache ECharts lifecycle. The factory centralizes responsive parent measurement, injected sizing policy evaluation, theme-aware text color selection, debounced chart updates, and ECharts disposal.

## Key Behaviors

- Measures the parent element with `ResizeObserver`.
- Optionally calls `useRuntimeContext()` inside the generated component so chart implementations can derive hook-based context such as responsive breakpoints.
- Passes the runtime context into `getBuilderArgs(...)` and `getChartHeight(...)`.
- Delegates chart height calculation to the injected `getChartHeight(...)` arrow function.
- Uses `isDimensionValid(...)` to decide whether dimensions should be committed or cleared.
- Reads the active app theme via `useTheme()` and resolves the ECharts text color from `globalTokens`.
- Lazily initializes one canvas-based ECharts instance and reuses it until unmount.
- Resizes an already-initialized ECharts instance immediately when measured dimensions change so drag-resized containers do not leave the canvas at a stale size between debounced option rebuilds.
- Debounces `echarts.init(...)/setOption(...)/resize()` using `useDebouncedCallback(...)` and the supplied `debounceMs`.
- Resizes the live chart instance on window resize and disposes it during cleanup.
*/
export function createAnalysisChartComponent<
  Props extends { readonly autoHeight?: boolean },
  BuilderArgs,
  RuntimeContext = undefined,
>({
  displayName,
  testId,
  ariaLabel,
  debounceMs,
  useRuntimeContext,
  getBuilderArgs,
  getChartHeight,
  buildOption,
  isDimensionValid = DEFAULT_DIMENSION_VALIDATION,
}: CreateAnalysisChartComponentConfig<Props, BuilderArgs, RuntimeContext>) {
  function AnalysisChartComponent(props: Props) {
    const { theme } = useTheme();
    const runtimeContext = useRuntimeContext?.() as RuntimeContext;
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
    const [chartDimensions, setChartDimensions] = useState<ChartDimensions | undefined>(undefined);
    const chartTextColor = theme === "dark"
      ? globalTokens.echarts.text.dark
      : globalTokens.echarts.text.light;
    const builderArgs = useMemo(() => getBuilderArgs(props, runtimeContext), [props, runtimeContext]);
    const chartOption = useMemo(
      () => chartDimensions === undefined
        ? undefined
        : buildOption(builderArgs, chartDimensions.width, chartDimensions.height, chartTextColor),
      [builderArgs, chartDimensions, chartTextColor],
    );
    const {
      run: runDebouncedChartUpdate,
      cancel: cancelDebouncedChartUpdate,
    } = useDebouncedCallback((
      container: HTMLDivElement,
      nextChartOption: EChartsCoreOption,
    ) => {
      if (!chartRef.current) {
        chartRef.current = echarts.init(container, undefined, { renderer: "canvas" });
      }
      chartRef.current.setOption(nextChartOption, true);
      chartRef.current.resize();
    }, debounceMs);

    useEffect(() => {
      const container = chartContainerRef.current;
      const parent = container?.parentElement;
      if (!container || !parent) return undefined;

      const updateChartDimensions = () => {
        const nextWidth = parent.clientWidth;
        const nextHeight = getChartHeight({
          parentWidth: nextWidth,
          parentHeight: parent.clientHeight,
          autoHeight: props.autoHeight,
        }, runtimeContext);

        if (isDimensionValid({ width: nextWidth, height: nextHeight })) {
          setChartDimensions({
            width: nextWidth,
            height: nextHeight,
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
    }, [props.autoHeight, runtimeContext]);

    useEffect(() => {
      const container = chartContainerRef.current;
      if (!container || chartOption === undefined) return undefined;

      runDebouncedChartUpdate(container, chartOption);
      return () => {
        cancelDebouncedChartUpdate();
      };
    }, [chartOption, runDebouncedChartUpdate, cancelDebouncedChartUpdate]);

    useEffect(() => {
      if (chartRef.current === undefined || chartDimensions === undefined) {
        return;
      }

      chartRef.current.resize({
        width: chartDimensions.width,
        height: chartDimensions.height,
      });
    }, [chartDimensions]);

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
        data-testid={testId}
        aria-label={ariaLabel}
        className="max-w-full shrink-0 overflow-hidden"
        style={chartDimensions === undefined
          ? undefined
          : { width: `${chartDimensions.width}px`, height: `${chartDimensions.height}px` }}
      />
    );
  }

  AnalysisChartComponent.displayName = displayName;

  return AnalysisChartComponent;
}
