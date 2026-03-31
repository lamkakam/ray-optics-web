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

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "@/store/createStore";
import type { AnalysisDataState } from "@/store/analysisDataStore";
import { createAnalysisDataSlice } from "@/store/analysisDataStore";
import { SeidelAberrModal } from "@/components/composite/SeidelAberrModal";

export default function LensEditorPage() {
  // Create the store once
  const analysisDataStore = useMemo(
    () => createStore<AnalysisDataState>(createAnalysisDataSlice),
    []
  );

  // Read state
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);
  const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);

  // After a successful submit, populate the data
  const handleSubmit = async (model: OpticalModel) => {
    const seidel = await proxy.get3rdOrderSeidelData(model);
    const firstOrder = await proxy.getFirstOrderData(model);

    analysisDataStore.getState().setSeidelData(seidel);
    analysisDataStore.getState().setFirstOrderData(firstOrder);
  };

  return (
    <div>
      {seidelData && <SeidelAberrModal seidelData={seidelData} />}
      {firstOrderData && (
        <div>
          <p>EFL: {firstOrderData.EFL}</p>
          <p>f/#: {firstOrderData["f/"]}</p>
        </div>
      )}
    </div>
  );
}
```
