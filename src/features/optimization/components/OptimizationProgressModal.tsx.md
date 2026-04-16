# `features/optimization/components/OptimizationProgressModal.tsx`

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
- While `isOptimizing` is `true`, the backdrop is non-dismissible and the footer does not render an `OK` button.
- After optimization completes, renders an `OK` button and allows backdrop dismissal through `onClose`.
- Initializes one ECharts canvas instance per open modal session and updates it whenever `progress` or theme text color changes.
- Series data is built directly from `progress.map(({ iteration, merit_function_value }) => [iteration, merit_function_value])`.

## Chart Conventions

- `xAxis.name` is `Iteration`.
- `yAxis.type` is `log`.
- `yAxis.name` is `Total merit function value`.
- Uses a single blue line series with tooltip support and no animation so streamed updates stay stable.
