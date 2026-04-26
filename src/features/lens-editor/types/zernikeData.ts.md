# `features/lens-editor/types/zernikeData.ts`

## Purpose

TypeScript types and utilities for Zernike polynomial data. Provides the `ZernikeData` interface, Noll and Fringe index conversion, classical names keyed by (n, m), and MathJax notation helpers.

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

type ZernikeOrdering = "noll" | "fringe";
```

### Constants

| Export | Type | Description |
|--------|------|-------------|
| `NUM_NOLL_TERMS` | `56` | Number of Noll-ordered terms (n=0..10) |
| `NUM_FRINGE_TERMS` | `37` | Number of Fringe-ordered terms to display |
| `CLASSICAL_NAMES` | `Record<string, string>` | Maps `"${n},${m}"` string keys to human-readable names (e.g. `"0,0"` → "Piston", `"2,0"` → "Defocus"). Covers all 56 Noll (n,m) pairs. Naming convention: m>0 (cos term) → "X" suffix; m<0 (sin term) → "Y" suffix; m=0 → radially symmetric (no suffix). |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `nollToNm` | `(j: number) => [number, number]` | Converts Noll index j (1-based) to radial order n and azimuthal frequency m. Port of the Python `noll_to_nm`. |
| `fringeToNm` | `(j: number) => [number, number]` | Converts Fringe (University of Arizona) index j (1-based) to (n, m). Port of the Python `fringe_to_nm`. |
| `zernikeNotation` | `(n: number, m: number) => string` | Returns MathJax-compatible LaTeX string `\(Z_{n}^{m}\)` |
| `classicalName` | `(n: number, m: number) => string` | Returns the classical name for a Zernike polynomial by (n, m). Returns `""` if no name is defined (e.g. for high-order Fringe terms not in CLASSICAL_NAMES). |

## Usages

```ts
import {
  nollToNm,
  fringeToNm,
  zernikeNotation,
  classicalName,
  NUM_NOLL_TERMS,
} from "@/features/lens-editor/types/zernikeData";
import type { ZernikeData } from "@/features/lens-editor/types/zernikeData";

// Fetch from worker
const zernikeData: ZernikeData = await proxy.getZernikeCoefficients(
  model,
  fieldIndex,
  wavelengthIndex,
  56 // numTerms
);

// Render terms in a modal
function renderZernikeTable() {
  return (
    <table>
      <tbody>
        {zernikeData.coefficients.map((coeff, index) => {
          const [n, m] = nollToNm(index + 1); // 1-based
          const name = classicalName(n, m);
          const notation = zernikeNotation(n, m);

          return (
            <tr key={index}>
              <td>{notation}</td>
              <td>{name || "—"}</td>
              <td>{coeff.toFixed(4)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// RMS and peak-valley wavefront
console.log("RMS WFE:", zernikeData.rms_wfe);
console.log("P-V WFE:", zernikeData.pv_wfe);
console.log("Strehl Ratio:", zernikeData.strehl_ratio);
```

- `ZernikeData` is the return type of `getZernikeCoefficients` in the worker API.
- Utility functions are used by `ZernikeTermsModal` to render coefficient tables.
