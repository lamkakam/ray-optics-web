# `features/lens-editor/types/seidelData.ts`

## Purpose

Defines Seidel aberration payload types used by the lens editor modal and analysis third-order chart.

## Exports

- `SeidelSurfaceBySurfaceData`: per-surface Seidel aberration matrix plus row/column labels.
- `SeidelData`: transverse, wavefront, curvature, and surface-by-surface Seidel data returned by the Pyodide worker.
- `AberrationTypeToLabel`: UI label mapping for Seidel aberration keys.

## Usage

```ts
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
```
