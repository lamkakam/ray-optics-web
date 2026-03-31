# `store/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds the current plot image, loading flag, selected field/wavelength indices, and selected plot type that drive the `AnalysisPlotView` component.

## Exports

- `AnalysisPlotState` — interface describing all state fields and actions.
- `createAnalysisPlotSlice` — `StateCreator<AnalysisPlotState>` for composition and DI (used in `page.tsx` via `createStore`).
- `useAnalysisPlotStore` — concrete Zustand store created from the slice (ready-to-use hook for standalone use).

## State

| Field | Type | Default |
|---|---|---|
| `plotImage` | `string \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setPlotImage(image)` — sets or clears the base64 PNG plot image.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/components/composite/AnalysisPlotView`.

## Usages

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "@/store/createStore";
import type { AnalysisPlotState } from "@/store/analysisPlotStore";
import { createAnalysisPlotSlice } from "@/store/analysisPlotStore";
import { AnalysisPlotView } from "@/components/composite/AnalysisPlotView";

export default function LensEditorPage() {
  // Create the store once via useMemo (singleton per render)
  const analysisPlotStore = useMemo(
    () => createStore<AnalysisPlotState>(createAnalysisPlotSlice),
    []
  );

  // Select a piece of state
  const plotImage = useStore(analysisPlotStore, (s) => s.plotImage);
  const selectedFieldIndex = useStore(analysisPlotStore, (s) => s.selectedFieldIndex);

  // Dispatch an action
  const handleFieldChange = (index: number) => {
    analysisPlotStore.getState().setSelectedFieldIndex(index);
  };

  return (
    <div>
      <AnalysisPlotView
        plotImage={plotImage}
        selectedFieldIndex={selectedFieldIndex}
        onFieldChange={handleFieldChange}
      />
    </div>
  );
}
```
