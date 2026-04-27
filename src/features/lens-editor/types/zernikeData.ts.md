# `features/lens-editor/types/zernikeData.ts`

## Purpose

TypeScript types for Zernike coefficient data exchanged between the lens editor UI and Pyodide worker.

## Exports

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

## Usage

```ts
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";

async function fetchZernikeData(ordering: ZernikeOrdering): Promise<ZernikeData> {
  return proxy.getZernikeCoefficients(model, 0, 0, 56, ordering);
}
```

## Notes

- `ZernikeData` is the return type of `getZernikeCoefficients` in the worker API.
- Runtime constants and helpers are defined in `features/lens-editor/lib/zernikeData.ts`.
