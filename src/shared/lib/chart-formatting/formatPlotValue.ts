/** Smallest magnitude rendered as non-zero by linear chart formatters. */
export const MINIMUM_NON_ZERO_PLOT_VALUE = 1e-9;
/** Smallest magnitude rendered with decimal rather than scientific notation. */
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
 * Returns `"0"` for:
 * - non-finite values
 * - exact zero
 * - any value whose absolute magnitude is smaller than `1e-9`
 * Values between the non-zero and decimal floors, or above 1000, use scientific
 * notation. Other values use two significant figures without trailing zeroes.
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

/** Formats finite log-axis values at or below the floor as `1e-9`; non-finite values become `0`. */
export function formatLogScalePlotValue(value: number): string {
  if (!Number.isFinite(value)) {
    return formatScientificPlotValue(MINIMUM_NON_ZERO_PLOT_VALUE);
  }

  if (value <= MINIMUM_NON_ZERO_PLOT_VALUE) {
    return formatScientificPlotValue(MINIMUM_NON_ZERO_PLOT_VALUE);
  }

  return formatPlotValue(value);
}
