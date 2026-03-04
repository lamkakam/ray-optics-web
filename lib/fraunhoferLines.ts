export interface FraunhoferLine {
  readonly symbol: string;
  readonly wavelength: number; // nm
}

/** Fraunhofer lines sorted from longest to shortest wavelength. */
export const FRAUNHOFER_LINES: readonly FraunhoferLine[] = [
  { symbol: "r", wavelength: 706.519 },
  { symbol: "C", wavelength: 656.273 },
  { symbol: "C'", wavelength: 643.847 },
  { symbol: "d", wavelength: 587.562 },
  { symbol: "e", wavelength: 546.073 },
  { symbol: "F", wavelength: 486.133 },
  { symbol: "F'", wavelength: 479.991 },
  { symbol: "g", wavelength: 435.835 },
  { symbol: "h", wavelength: 404.656 },
  { symbol: "i", wavelength: 365.015 },
] as const;

const wavelengthMap = new Map(
  FRAUNHOFER_LINES.map((l) => [l.symbol, l.wavelength])
);

/** Look up a wavelength (nm) by Fraunhofer line symbol. Case-sensitive. */
export function lookupWavelength(symbol: string): number | undefined {
  return wavelengthMap.get(symbol);
}
