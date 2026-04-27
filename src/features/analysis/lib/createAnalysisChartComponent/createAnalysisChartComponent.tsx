import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
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

type CreateAnalysisChartComponentConfig<Props extends { readonly autoHeight?: boolean }, BuilderArgs> = {
  readonly displayName: string;
  readonly testId: string;
  readonly ariaLabel: string;
  readonly debounceMs: number;
  readonly getBuilderArgs: (props: Props) => BuilderArgs;
  readonly getChartHeight: (input: ChartSizingInput) => number;
  readonly buildOption: (
    builderArgs: BuilderArgs,
    chartWidth: number,
    chartHeight: number,
    chartTextColor: string,
  ) => EChartsCoreOption;
  readonly isDimensionValid?: (input: ChartDimensionValidationInput) => boolean;
};

const DEFAULT_DIMENSION_VALIDATION = ({ width }: ChartDimensionValidationInput) => width > 0;

export function createAnalysisChartComponent<Props extends { readonly autoHeight?: boolean }, BuilderArgs>({
  displayName,
  testId,
  ariaLabel,
  debounceMs,
  getBuilderArgs,
  getChartHeight,
  buildOption,
  isDimensionValid = DEFAULT_DIMENSION_VALIDATION,
}: CreateAnalysisChartComponentConfig<Props, BuilderArgs>) {
  function AnalysisChartComponent(props: Props) {
    const { theme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<ReturnType<typeof echarts.init> | undefined>(undefined);
    const [chartDimensions, setChartDimensions] = useState<ChartDimensions | undefined>(undefined);
    const chartTextColor = theme === "dark"
      ? globalTokens.echarts.text.dark
      : globalTokens.echarts.text.light;
    const builderArgs = useMemo(() => getBuilderArgs(props), [props]);
    const chartOption = useMemo(
      () => chartDimensions === undefined
        ? undefined
        : buildOption(builderArgs, chartDimensions.width, chartDimensions.height, chartTextColor),
      [builderArgs, chartDimensions, chartTextColor],
    );

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
        });

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
    }, [props.autoHeight]);

    useEffect(() => {
      const container = chartContainerRef.current;
      if (!container || chartOption === undefined) return undefined;

      const timeoutId = window.setTimeout(() => {
        if (!chartRef.current) {
          chartRef.current = echarts.init(container, undefined, { renderer: "canvas" });
        }
        chartRef.current.setOption(chartOption, true);
        chartRef.current.resize();
      }, debounceMs);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, [chartOption]);

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
