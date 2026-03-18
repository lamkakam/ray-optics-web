# `lib/fraunhoferLines.ts`

## Purpose

Provides the canonical set of Fraunhofer spectral lines used in optical design, and a symbol-to-wavelength lookup function.

## Exports

- `type FraunhoferSymbol`: string literals. Case sensitive

- `interface FraunhoferLine`

- `const FRAUNHOFER_LINES: readonly FraunhoferLine[]`: Fraunhofer lines sorted from longest to shortest wavelength

- `function lookupWavelength(symbol: FraunhoferSymbol): number`: Look up a wavelength (nm) by Fraunhofer line symbol. Case-sensitive.
