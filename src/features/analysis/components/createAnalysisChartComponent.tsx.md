# `features/analysis/components/createAnalysisChartComponent.tsx`

## Purpose

Provides a higher-order factory that returns typed analysis chart function components with a shared Apache ECharts lifecycle. The factory centralizes responsive parent measurement, injected sizing policy evaluation, theme-aware text color selection, debounced chart updates, and ECharts disposal.

## Factory Contract

```ts
createAnalysisChartComponent<Props extends { autoHeight?: boolean }, BuilderArgs>({
  displayName,
  testId,
  ariaLabel,
  debounceMs,
  getBuilderArgs,
  getChartHeight,
  buildOption,
  isDimensionValid?,
})
```

## Key Behaviors

- Measures the parent element with `ResizeObserver`.
- Delegates chart height calculation to the injected `getChartHeight(...)` arrow function.
- Uses `isDimensionValid(...)` to decide whether dimensions should be committed or cleared.
- Reads the active app theme via `useTheme()` and resolves the ECharts text color from `globalTokens`.
- Lazily initializes one canvas-based ECharts instance and reuses it until unmount.
- Resizes an already-initialized ECharts instance immediately when measured dimensions change so drag-resized containers do not leave the canvas at a stale size between debounced option rebuilds.
- Debounces `echarts.init(...)/setOption(...)/resize()` using the supplied `debounceMs`.
- Resizes the live chart instance on window resize and disposes it during cleanup.

## Dependencies

- `echarts/core`
- `useTheme()` from `shared/components/providers/ThemeProvider`
- `globalTokens` from `shared/tokens/styleTokens`
