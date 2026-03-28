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

- `app/page.tsx` — creates an instance via `createStore<LensLayoutImageState>(createLensLayoutImageSlice)` inside `useMemo`, passes it to `LensEditor`.
- `components/page/LensEditor.tsx` — reads `layoutImage`/`layoutLoading` reactively via `useStore(lensLayoutImageStore, selector)`, dispatches actions via `lensLayoutImageStore.getState().setXxx(...)`.
