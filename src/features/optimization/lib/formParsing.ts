/** Parsers for string-backed Optimization form values; each throws a labeled, user-facing error. */

/** Parses a positive integer, e.g. a 1-based surface index. */
export function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

/** Parses a non-negative integer, e.g. a zero-based coefficient index. */
export function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

/** Parses any finite number. */
export function parseFloatValue(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}
