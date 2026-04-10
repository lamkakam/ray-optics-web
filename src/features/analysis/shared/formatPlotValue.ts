const MINIMUM_NON_ZERO_PLOT_VALUE = 1e-7;
const PLOT_VALUE_SIGNIFICANT_FIGURES = 2;

export function formatPlotValue(value: number): string {
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) < MINIMUM_NON_ZERO_PLOT_VALUE) {
    return "0";
  }

  return Number(value.toPrecision(PLOT_VALUE_SIGNIFICANT_FIGURES)).toString();
}
