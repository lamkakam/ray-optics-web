import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  /** Pixel insets for content beneath the canvas; each defaults to zero. */
  readonly extraContentInsets?: {
    readonly left?: number;
    readonly right?: number;
  };
  readonly useRuntimeContext?: () => RuntimeContext;
  readonly getBuilderArgs: (
    props: Props,
    runtimeContext: RuntimeContext,
  ) => BuilderArgs;
  readonly getChartHeight: (
    input: ChartSizingInput,
    runtimeContext: RuntimeContext,
  ) => number;
  readonly buildOption: (
    builderArgs: BuilderArgs,
    chartWidth: number,
    chartHeight: number,
    chartTextColor: string,
  ) => EChartsCoreOption;
  readonly isDimensionValid?: (input: ChartDimensionValidationInput) => boolean;
};

const DEFAULT_DIMENSION_VALIDATION = ({
  width,
}: ChartDimensionValidationInput) => width > 0;

/**
 * Provides a higher-order factory that returns typed analysis chart function components with a shared Apache ECharts lifecycle. The factory centralizes responsive parent measurement, injected sizing policy evaluation, theme-aware text color selection, debounced chart updates, and ECharts disposal.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Measures the parent element with `ResizeObserver`.
 * - Accepts optional `extraContent` below the canvas, outside its image role, in a stable outer wrapper.
 * - Observes the footer's measured height (including wrapping) and reserves it before fixed-height sizing; automatic-height charts grow with the footer. Omitted content takes no space.
 * - Applies optional horizontal footer insets to align content with a chart's plot band.
 * - Optionally calls `useRuntimeContext()` inside the generated component so chart implementations can derive hook-based context such as responsive breakpoints.
 * - Passes the runtime context into `getBuilderArgs(...)` and `getChartHeight(...)`.
 * - Delegates chart height calculation to the injected `getChartHeight(...)` arrow function.
 * - Uses `isDimensionValid(...)` to decide whether dimensions should be committed or cleared.
 * - Reads the active app theme via `useTheme()` and resolves the ECharts text color from `globalTokens`.
 * - Lazily initializes one canvas-based ECharts instance and reuses it until unmount.
 * - Resizes an already-initialized ECharts instance immediately when measured dimensions change so drag-resized containers do not leave the canvas at a stale size between debounced option rebuilds.
 * - Debounces `echarts.init(...)/setOption(...)/resize()` using `useDebouncedCallback(...)` and the supplied `debounceMs`.
 * - Resizes the live chart instance on window resize and disposes it during cleanup.
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
  extraContentInsets,
  useRuntimeContext,
  getBuilderArgs,
  getChartHeight,
  buildOption,
  isDimensionValid = DEFAULT_DIMENSION_VALIDATION,
}: CreateAnalysisChartComponentConfig<Props, BuilderArgs, RuntimeContext>) {
  function AnalysisChartComponent(
    props: Props & { readonly extraContent?: ReactNode },
  ) {
    const { theme } = useTheme();
    const runtimeContext = useRuntimeContext?.() as RuntimeContext;
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const extraContentRef = useRef<HTMLDivElement | null>(null);
    const hasExtraContent =
      props.extraContent !== undefined &&
      props.extraContent !== null &&
      props.extraContent !== false;
    const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(
      undefined,
    );
    const [chartDimensions, setChartDimensions] = useState<
      ChartDimensions | undefined
    >(undefined);
    const chartTextColor =
      theme === "dark"
        ? globalTokens.echarts.text.dark
        : globalTokens.echarts.text.light;
    const builderArgs = useMemo(
      () => getBuilderArgs(props, runtimeContext),
      [props, runtimeContext],
    );
    const chartOption = useMemo(
      () =>
        chartDimensions === undefined
          ? undefined
          : buildOption(
              builderArgs,
              chartDimensions.width,
              chartDimensions.height,
              chartTextColor,
            ),
      [builderArgs, chartDimensions, chartTextColor],
    );
    const { run: runDebouncedChartUpdate, cancel: cancelDebouncedChartUpdate } =
      useDebouncedCallback(
        (container: HTMLDivElement, nextChartOption: EChartsCoreOption) => {
          if (!chartRef.current) {
            chartRef.current = echarts.init(container, undefined, {
              renderer: "canvas",
            });
          }
          chartRef.current.setOption(nextChartOption, true);
          chartRef.current.resize();
        },
        debounceMs,
      );

    useEffect(() => {
      const parent = wrapperRef.current?.parentElement;
      if (!parent) return undefined;
      const extraContent = hasExtraContent
        ? extraContentRef.current
        : undefined;

      const updateChartDimensions = () => {
        const nextWidth = parent.clientWidth;
        const nextHeight = getChartHeight(
          {
            parentWidth: nextWidth,
            parentHeight: props.autoHeight
              ? parent.clientHeight
              : Math.max(
                  0,
                  parent.clientHeight - (extraContent?.offsetHeight ?? 0),
                ),
            autoHeight: props.autoHeight,
          },
          runtimeContext,
        );

        if (isDimensionValid({ width: nextWidth, height: nextHeight })) {
          setChartDimensions((previous) =>
            previous?.width === nextWidth && previous.height === nextHeight
              ? previous
              : { width: nextWidth, height: nextHeight },
          );
          return;
        }

        setChartDimensions(undefined);
      };

      updateChartDimensions();

      const resizeObserver = new ResizeObserver(() => {
        updateChartDimensions();
      });

      resizeObserver.observe(parent);
      if (extraContent) resizeObserver.observe(extraContent);

      return () => {
        resizeObserver.disconnect();
      };
    }, [props.autoHeight, hasExtraContent, runtimeContext]);

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
        ref={wrapperRef}
        className="flex w-full min-w-0 shrink-0 flex-col items-center"
      >
        <div
          role="img"
          ref={chartContainerRef}
          data-testid={testId}
          aria-label={ariaLabel}
          className="max-w-full shrink-0 overflow-hidden"
          style={
            chartDimensions === undefined
              ? undefined
              : {
                  width: `${chartDimensions.width}px`,
                  height: `${chartDimensions.height}px`,
                }
          }
        />
        {hasExtraContent && (
          <div
            ref={extraContentRef}
            className="w-full min-w-0"
            style={{
              paddingLeft: extraContentInsets?.left ?? 0,
              paddingRight: extraContentInsets?.right ?? 0,
            }}
          >
            {props.extraContent}
          </div>
        )}
      </div>
    );
  }

  AnalysisChartComponent.displayName = displayName;

  return AnalysisChartComponent;
}
