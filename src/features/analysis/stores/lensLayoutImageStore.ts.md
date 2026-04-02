# `features/analysis/stores/lensLayoutImageStore.ts`

## Purpose

Zustand store for managing the lens layout image and its loading state. Holds the base64-encoded lens layout image and a loading flag, following the same pattern as `analysisPlotStore`.

## Exports

- `LensLayoutImageState` — interface describing all state fields and actions.
- `createLensLayoutImageSlice` — `StateCreator<LensLayoutImageState>` for composition into the provider-backed store.

## State

| Field | Type | Default |
|---|---|---|
| `layoutImage` | `string \| undefined` | `undefined` |
| `layoutLoading` | `boolean` | `false` |

## Actions

- `setLayoutImage(image)` — sets or clears the base64 PNG/SVG lens layout image.
- `setLayoutLoading(loading)` — sets the loading flag.

## Dependencies

- `StateCreator` from `zustand`.

## Usages

```tsx
import { useStore } from "zustand";
import { useLensLayoutImageStore } from "@/features/analysis/providers/LensLayoutImageStoreProvider";

function LensLayoutSection() {
  const store = useLensLayoutImageStore();
  const layoutImage = useStore(store, (s) => s.layoutImage);
  const layoutLoading = useStore(store, (s) => s.layoutLoading);

  if (layoutLoading && !layoutImage) {
    return <p>Loading layout...</p>;
  }

  return layoutImage ? (
    <img src={`data:image/png;base64,${layoutImage}`} alt="Lens layout" />
  ) : null;
}
```
