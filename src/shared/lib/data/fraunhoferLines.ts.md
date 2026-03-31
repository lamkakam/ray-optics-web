# `lib/fraunhoferLines.ts`

## Purpose

Provides the canonical set of Fraunhofer spectral lines used in optical design, and a symbol-to-wavelength lookup function.

## Exports

- `type FraunhoferSymbol`: string literals. Case sensitive

- `interface FraunhoferLine`

- `const FRAUNHOFER_LINES: readonly FraunhoferLine[]`: Fraunhofer lines sorted from longest to shortest wavelength

- `function lookupWavelength(symbol: FraunhoferSymbol): number`: Look up a wavelength (nm) by Fraunhofer line symbol. Case-sensitive.

## Usages

```ts
import { FRAUNHOFER_LINES, lookupWavelength } from "@/lib/fraunhoferLines";

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
