export type FraunhoferSymbol = "t" | "s" | "A'" | "r" | "C" | "C'" | "D" | "d" | "e" | "F" | "F'" | "g" | "h" | "i";

export interface FraunhoferLine {
  readonly symbol: FraunhoferSymbol;
  readonly wavelength: number; // nm
}

/** Fraunhofer lines sorted from longest to shortest wavelength. */
export const FRAUNHOFER_LINES: readonly FraunhoferLine[] = [
  { symbol: "t", wavelength: 1013.98 },
  { symbol: "s", wavelength: 852.11 },
  { symbol: "A'", wavelength: 768.19 },
  { symbol: "r", wavelength: 706.519 },
  { symbol: "C", wavelength: 656.273 },
  { symbol: "C'", wavelength: 643.847 },
  { symbol: "D", wavelength: 589.294 }, // mean of D1 and D2
  { symbol: "d", wavelength: 587.562 },
  { symbol: "e", wavelength: 546.073 },
  { symbol: "F", wavelength: 486.133 },
  { symbol: "F'", wavelength: 479.991 },
  { symbol: "g", wavelength: 435.835 },
  { symbol: "h", wavelength: 404.656 },
  { symbol: "i", wavelength: 365.015 },
] as const;

const wavelengthMap = new Map<FraunhoferSymbol, number>(
  FRAUNHOFER_LINES.map((l) => [l.symbol, l.wavelength])
);

/** Look up a wavelength (nm) by Fraunhofer line symbol. Case-sensitive. */
/** Provides the canonical set of Fraunhofer spectral lines used in optical design, and a symbol-to-wavelength lookup function. */
export function lookupWavelength(symbol: FraunhoferSymbol): number {
  return wavelengthMap.get(symbol)!;
}
