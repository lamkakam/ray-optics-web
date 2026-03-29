# `store/analysisDataStore.ts`

## Purpose

Zustand store for analysis results computed after each successful submit. Holds Seidel aberration data and first-order optical data returned by the Pyodide worker.

## Exports

- `AnalysisDataState` — interface describing all state fields and actions.
- `createAnalysisDataSlice` — `StateCreator<AnalysisDataState>` for composition.
- `useAnalysisDataStore` — concrete Zustand store created from the slice (ready-to-use hook).

## State

| Field | Type | Default |
|---|---|---|
| `seidelData` | `SeidelData \| undefined` | `undefined` |
| `firstOrderData` | `Record<string, number> \| undefined` | `undefined` |

## Actions

- `setSeidelData(data)` — stores or clears the 3rd-order Seidel aberration data returned by `proxy.get3rdOrderSeidelData`. Populated after each successful submit; controls visibility of the Seidel and Zernike buttons.
- `setFirstOrderData(data)` — stores or clears the first-order optical data (e.g. EFL, f-number) returned by `proxy.getFirstOrderData`. Populated after each successful submit.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `SeidelData` from `lib/opticalModel`.

## Usages

Used by `LensEditor` (reads and writes both fields after submit) and any future consumers that need analysis result data.
