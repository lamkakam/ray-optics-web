# `features/lens-editor/lib/zernikeData.ts`

## Purpose

Runtime utilities for rendering Zernike polynomial tables in the lens editor.

## Exports

### Constants

| Export | Type | Description |
|--------|------|-------------|
| `NUM_NOLL_TERMS` | `56` | Number of Noll-ordered terms (n=0..10). |
| `NUM_FRINGE_TERMS` | `37` | Number of Fringe-ordered terms to display. |
| `CLASSICAL_NAMES` | `Record<string, string>` | Maps `"${n},${m}"` keys to human-readable names. Covers all 56 Noll (n,m) pairs. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `nollToNm` | `(j: number) => [number, number]` | Converts Noll index j (1-based) to radial order n and azimuthal frequency m. |
| `fringeToNm` | `(j: number) => [number, number]` | Converts Fringe (University of Arizona) index j (1-based) to (n, m). |
| `zernikeNotation` | `(n: number, m: number) => string` | Returns MathJax-compatible LaTeX string `\(Z_{n}^{m}\)`. |
| `classicalName` | `(n: number, m: number) => string` | Returns the classical name for a Zernike polynomial by (n, m), or `""` when no name is defined. |

## Usage

```ts
import {
  nollToNm,
  zernikeNotation,
  classicalName,
  NUM_NOLL_TERMS,
} from "@/features/lens-editor/lib/zernikeData";
import type { ZernikeData } from "@/features/lens-editor/types/zernikeData";

function renderZernikeTable(zernikeData: ZernikeData) {
  return zernikeData.coefficients.slice(0, NUM_NOLL_TERMS).map((coeff, index) => {
    const [n, m] = nollToNm(index + 1);

    return {
      notation: zernikeNotation(n, m),
      name: classicalName(n, m),
      coefficient: coeff,
    };
  });
}
```

## Notes

- Types for worker payloads and ordering options live in `features/lens-editor/types/zernikeData.ts`.
- This module intentionally contains runtime values and functions only.
