/**
# `shared/lib/data/fraunhoferLines.ts`

## Exports

- `type FraunhoferSymbol`: string literals. Case sensitive

- `interface FraunhoferLine`

- `const FRAUNHOFER_LINES: readonly FraunhoferLine[]`: Fraunhofer lines sorted from longest to shortest wavelength

- `function lookupWavelength(symbol: FraunhoferSymbol): number`: Look up a wavelength (nm) by Fraunhofer line symbol. Case-sensitive.
*/
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
/**
## Purpose

Provides the canonical set of Fraunhofer spectral lines used in optical design, and a symbol-to-wavelength lookup function.

## Usages

```ts
import { FRAUNHOFER_LINES, lookupWavelength } from "@/shared/lib/data/fraunhoferLines";

// Look up a specific wavelength
const eLineWavelength = lookupWavelength("e"); // 546.073 nm
const dLineWavelength = lookupWavelength("d"); // 587.562 nm

// Iterate through all available lines
FRAUNHOFER_LINES.forEach(({ symbol, wavelength_nm }) => {
  console.log(`${symbol}: ${wavelength_nm} nm`);
});

// Use in wavelength configuration
const wavelengths = {
  weights: [
    [lookupWavelength("F"), 1],  // 486.133 nm
    [lookupWavelength("d"), 1],  // 587.562 nm
    [lookupWavelength("C"), 1],  // 656.273 nm
  ],
  referenceIndex: 1, // d-line as reference
};
```
*/
export function lookupWavelength(symbol: FraunhoferSymbol): number {
  return wavelengthMap.get(symbol)!;
}
