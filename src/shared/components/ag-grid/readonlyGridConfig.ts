/**
 * Shared AG Grid configuration for readonly, filterable optical-data tables.
 *
 * @remarks
 * Text and number filter choices intentionally exclude AG Grid's `blank` and
 * `notBlank` operators. The formatter accepts optional values so live optical
 * data renders to six decimal places while unavailable values render blank.
 */

/** Text-filter operators that compare only defined cell content. */
export const NO_BLANK_TEXT_FILTER_OPTIONS = [
  "contains",
  "notContains",
  "equals",
  "notEqual",
  "startsWith",
  "endsWith",
] as const;

/** Number-filter operators that compare only defined cell content. */
export const NO_BLANK_NUMBER_FILTER_OPTIONS = [
  "equals",
  "notEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "inRange",
] as const;

/** Formats a defined numeric cell to six decimals and an unavailable cell as blank. */
export function formatOptionalSixDecimal({ value }: { readonly value: unknown }): string {
  return value === undefined ? "" : Number(value).toFixed(6);
}
