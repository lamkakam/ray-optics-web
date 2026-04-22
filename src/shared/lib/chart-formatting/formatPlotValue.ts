export const MINIMUM_NON_ZERO_PLOT_VALUE = 1e-9;
export const MINIMUM_DECIMAL_PLOT_VALUE = 1e-3;
const MAXIMUM_DECIMAL_PLOT_VALUE = 1e3;
const PLOT_VALUE_SIGNIFICANT_FIGURES = 2;

function formatScientificPlotValue(value: number): string {
  return value.toExponential(PLOT_VALUE_SIGNIFICANT_FIGURES - 1).replace(".0e", "e");
}

export function formatPlotValue(value: number): string {
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) < MINIMUM_NON_ZERO_PLOT_VALUE) {
    return "0";
  }

  if (Math.abs(value) < MINIMUM_DECIMAL_PLOT_VALUE) {
    return formatScientificPlotValue(value);
  }

  if (Math.abs(value) > MAXIMUM_DECIMAL_PLOT_VALUE) {
    return formatScientificPlotValue(value);
  }

  return Number(value.toPrecision(PLOT_VALUE_SIGNIFICANT_FIGURES)).toString();
}

export function formatLogScalePlotValue(value: number): string {
  if (!Number.isFinite(value)) {
    return formatScientificPlotValue(MINIMUM_NON_ZERO_PLOT_VALUE);
  }

  if (value <= MINIMUM_NON_ZERO_PLOT_VALUE) {
    return formatScientificPlotValue(MINIMUM_NON_ZERO_PLOT_VALUE);
  }

  return formatPlotValue(value);
}
