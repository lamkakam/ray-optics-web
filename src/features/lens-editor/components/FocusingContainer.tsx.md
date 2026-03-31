# `features/lens-editor/components/FocusingContainer.tsx`

## Purpose

Container for the Focusing tab in the bottom drawer. Manages focusing strategy state, calls the appropriate worker function, updates the last surface thickness in `lensStore`, then calls `onUpdateSystem` to recompute the model.

## Props

```ts
interface FocusingContainerProps {
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfigurerState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  readonly onError: () => void;
}
```

## Internal State

- `chromaticity: "mono" | "poly"` (default `"mono"`)
- `metric: "rmsSpot" | "wavefront"` (default `"rmsSpot"`)
- `fieldIndex: number` (default `0`)
- `focusing: boolean` (default `false`)

## Behavior

`handleFocus`:
1. Sets `focusing=true` (shows `LoadingOverlay`, disables `FocusingPanel`).
2. Calls one of four proxy methods based on `chromaticity` × `metric`:
   - `mono` + `rmsSpot` → `focusByMonoRmsSpot`
   - `mono` + `wavefront` → `focusByMonoStrehl`
   - `poly` + `rmsSpot` → `focusByPolyRmsSpot`
   - `poly` + `wavefront` → `focusByPolyStrehl`
3. Finds the last `kind === "surface"` row in `lensStore` and calls `updateRow` with `thickness + result.delta_thi`.
4. Calls `onUpdateSystem()` to recompute layout and plots.
5. On any error, calls `onError()`.
6. Sets `focusing=false` in `finally`.

The `disabled` prop passed to `FocusingPanel` is `!isReady || computing || focusing`.

`fieldOptions` are derived reactively from `specsStore` via `useStore` (subscribes to `relativeFields`, `maxField`, `fieldType`). This means the Field dropdown updates immediately when field configuration changes in `specsStore`, even before the user clicks "Update System".

## Rendering

```tsx
<div className="relative p-4">
  {focusing && <LoadingOverlay title="Focusing…" contents="Optimizing image plane position…" />}
  <FocusingPanel ... />
</div>
```

## Usages

Instantiated in `app/page.tsx` as a tab in `BottomDrawer`.
