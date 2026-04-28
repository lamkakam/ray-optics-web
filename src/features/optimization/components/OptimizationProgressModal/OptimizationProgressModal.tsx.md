# `features/optimization/components/OptimizationProgressModal/OptimizationProgressModal.tsx`

Blocking optimization-status modal for the Optimization page. It renders an Apache ECharts line chart of optimization progress with iteration on the x-axis and raw `total merit function value` on a logarithmic y-axis.

## Props

```ts
interface OptimizationProgressModalProps {
  isOpen: boolean;
  isOptimizing: boolean;
  progress: ReadonlyArray<OptimizationProgressEntry>;
  onClose: () => void;
}
```

## Behavior

- Uses the shared `Modal` primitive with `size="4xl"` and title `Optimization Progress`.
- Imports progress entry types from `features/optimization/types/optimizationWorkerTypes.ts`.
- While `isOptimizing` is `true`, the backdrop is non-dismissible and the footer does not render an `OK` button.
- After optimization completes, renders an `OK` button and allows backdrop dismissal through `onClose`.
- Initializes one ECharts canvas instance per open modal session and updates it whenever `progress` or theme text color changes.
- Series data is built from a chart-only window of the newest 2000 `progress` entries; the underlying optimization progress data is not mutated.
- Each plotted y value is floored to `MINIMUM_NON_ZERO_PLOT_VALUE` (`1e-9`) before it is sent to the log-scale series.

## Chart Conventions

- `xAxis.name` is `Iteration`.
- `xAxis.min` is the iteration of the first plotted point, so the visible x-axis shifts with the 2000-point chart window.
- `yAxis.type` is `log`.
- `yAxis.name` is `Total merit function value`.
- `yAxis.axisLabel.formatter` uses the shared log-scale plot formatter so `0` and sub-floor values display as `1e-9`.
- Uses a single blue line series with tooltip support and no animation so streamed updates stay stable.
- Keeps all points through 2000 progress entries. Starting at 2001 entries, the oldest entries are dropped from the rendered ECharts series so only the newest 2000 points are plotted.
