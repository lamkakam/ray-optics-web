# `lib/zernikeData.ts`

## Purpose

TypeScript types and utilities for Zernike polynomial data. Provides the `ZernikeData` interface, Noll-index conversion, classical names for 56 Noll-ordered terms, and MathJax notation helpers.

## Exports

### Types

```ts
interface ZernikeData {
  readonly coefficients: readonly number[];
  readonly rms_normalized_coefficients: readonly number[];
  readonly rms_wfe: number;
  readonly pv_wfe: number;
  readonly strehl_ratio: number;
  readonly num_terms: number;
  readonly field_index: number;
  readonly wavelength_nm: number;
}
```

### Constants

| Export | Type | Description |
|--------|------|-------------|
| `NUM_NOLL_TERMS` | `56` | Number of Noll-ordered Zernike terms covered (Fringe 36 = Noll j=56) |
| `NOLL_CLASSICAL_NAMES` | `Record<number, string>` | Maps Noll index j=1..56 to human-readable names (e.g. "Piston", "Defocus", "Vertical Coma"). Naming convention: m>0 (even j, cos term) → "X" suffix; m<0 (odd j, sin term) → "Y" suffix; m=0 → radially symmetric (no suffix). |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `nollToNm` | `(j: number) => [number, number]` | Converts Noll index j (1-based) to radial order n and azimuthal frequency m. Port of the Python `noll_to_nm`. |
| `zernikeNotation` | `(n: number, m: number) => string` | Returns MathJax-compatible LaTeX string `\(Z_{n}^{m}\)` |

## Usages

- `ZernikeData` is the return type of `getZernikeCoefficients` in the worker API.
- `nollToNm`, `zernikeNotation`, and `NOLL_CLASSICAL_NAMES` are used by `ZernikeTermsModal` to render the Zernike coefficient table.
