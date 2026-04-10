const MINIMUM_NON_ZERO_PLOT_VALUE = 1e-9;
const MINIMUM_DECIMAL_PLOT_VALUE = 1e-4;
const MAXIMUM_DECIMAL_PLOT_VALUE = 1e3;
const PLOT_VALUE_SIGNIFICANT_FIGURES = 2;

export function formatPlotValue(value: number): string {
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) < MINIMUM_NON_ZERO_PLOT_VALUE) {
    return "0";
  }

  if (Math.abs(value) < MINIMUM_DECIMAL_PLOT_VALUE) {
    return value.toExponential(PLOT_VALUE_SIGNIFICANT_FIGURES - 1).replace(".0e", "e");
  }

  if (Math.abs(value) > MAXIMUM_DECIMAL_PLOT_VALUE) {
    return value.toExponential(PLOT_VALUE_SIGNIFICANT_FIGURES - 1).replace(".0e", "e");
  }

  return Number(value.toPrecision(PLOT_VALUE_SIGNIFICANT_FIGURES)).toString();
}
