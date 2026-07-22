export const MINIMUM_NON_ZERO_PLOT_VALUE = 1e-9;
export const MINIMUM_DECIMAL_PLOT_VALUE = 1e-3;
const MAXIMUM_DECIMAL_PLOT_VALUE = 1e3;
const PLOT_VALUE_SIGNIFICANT_FIGURES = 2;

function formatScientificPlotValue(value: number): string {
  return value.toExponential(PLOT_VALUE_SIGNIFICANT_FIGURES - 1).replace(".0e", "e");
}

/**
 * Defines shared numeric formatters for chart labels, tooltips, and rounded axis extents, including log-scale axis labels that must stay renderable at the minimum non-zero plot floor.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - `MINIMUM_NON_ZERO_PLOT_VALUE` is `1e-9`.
 * - `MINIMUM_DECIMAL_PLOT_VALUE` is `1e-3`.
 * - `formatPlotValue` returns `"0"` for:
 * - non-finite values
 * - exact zero
 * - any value whose absolute magnitude is smaller than `1e-9`
 * - `formatPlotValue` formats values whose absolute magnitude is at least `1e-9` but smaller than `1e-3` in scientific notation.
 * - `formatPlotValue` formats values whose absolute magnitude is larger than `1000` in scientific notation.
 * - `formatPlotValue` formats all other values to 2 significant figures.
 * - `formatPlotValue` normalizes the formatted output through `Number(...).toString()`, so insignificant trailing zeroes are removed.
 * - `formatLogScalePlotValue` returns `"0"` for non-finite values.
 * - `formatLogScalePlotValue` returns `"1e-9"` for any finite value less than or equal to `1e-9`, so log-axis labels never show an unplottable zero floor.
 * - `formatLogScalePlotValue` delegates larger values to `formatPlotValue`.
 */
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
