# `store/lensLayoutImageStore.ts`

## Purpose

Zustand store for managing the lens layout image and its loading state. Holds the base64-encoded lens layout image and a loading flag, following the same pattern as `analysisPlotStore`.

## Exports

- `LensLayoutImageState` — interface describing all state fields and actions.
- `createLensLayoutImageSlice` — `StateCreator<LensLayoutImageState>` for composition and DI (used in `page.tsx` via `createStore`).
- `useLensLayoutImageStore` — concrete Zustand store created from the slice (ready-to-use hook for standalone use).

## State

| Field | Type | Default |
|---|---|---|
| `layoutImage` | `string \| undefined` | `undefined` |
| `layoutLoading` | `boolean` | `false` |

## Actions

- `setLayoutImage(image)` — sets or clears the base64 PNG/SVG lens layout image.
- `setLayoutLoading(loading)` — sets the loading flag.

## Dependencies

- `create`, `StateCreator` from `zustand`.

## Usages

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "@/store/createStore";
import type { LensLayoutImageState } from "@/store/lensLayoutImageStore";
import { createLensLayoutImageSlice } from "@/store/lensLayoutImageStore";
import { LensLayoutPanel } from "@/features/lens-editor/components/LensLayoutPanel";

export default function LensEditorPage() {
  // Create the store once
  const lensLayoutStore = useMemo(
    () => createStore<LensLayoutImageState>(createLensLayoutImageSlice),
    []
  );

  // Read state
  const layoutImage = useStore(lensLayoutStore, (s) => s.layoutImage);
  const layoutLoading = useStore(lensLayoutStore, (s) => s.layoutLoading);

  // Dispatch actions
  const handleSetImage = (base64Image: string) => {
    lensLayoutStore.getState().setLayoutImage(base64Image);
  };

  return (
    <div>
      {layoutLoading && <p>Loading layout...</p>}
      {layoutImage && (
        <LensLayoutPanel
          image={layoutImage}
          onImageChange={handleSetImage}
        />
      )}
    </div>
  );
}
```
