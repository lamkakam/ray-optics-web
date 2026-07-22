/**
# `features/lens-editor/components/BottomDrawerContainer/BottomDrawerContainer.tsx`

## Internal Logic

Builds a `tabs` array via `useMemo` containing:
1. **System Specs** — `<SpecsConfiguratorContainer />`
2. **Prescription** — `<LensPrescriptionContainer getOpticalModel={...} />`
3. **Focusing** — `<FocusingContainer .../>`
4. **Image Reference** — `<ImageReferencePanel />`

Reads `activeBottomDrawerTabId` from the lens editor Zustand store and passes it to `BottomDrawer` as a controlled tab value. On tab change, writes the selected tab id back into `setActiveBottomDrawerTabId`, allowing Lens Editor to restore the previously selected drawer tab after navigation.

Reads `bottomDrawerHeight` from the lens editor store via `lensStore.getState()` and forwards it to `BottomDrawer` as `initialHeight`. This is a persistence snapshot rather than a reactive subscription, so drag-resize updates do not cause the container to re-render while the drawer is mounted.

Passes `onHeightCommit={(height) => lensStore.getState().setBottomDrawerHeight(height)}` so the most recent settled drawer height is restored after the Lens Editor route remounts.

Renders `<BottomDrawer tabs={tabs} draggable={draggable} activeTabId={...} onTabChange={...} initialHeight={...} onHeightCommit={...} />`.
*/
"use client";

import { useMemo } from "react";
import { useStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { BottomDrawer } from "@/shared/components/layout/BottomDrawer";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { SpecsConfiguratorContainer } from "@/features/lens-editor/components/SpecsConfiguratorContainer";
import { LensPrescriptionContainer } from "@/features/lens-editor/components/LensPrescriptionContainer";
import { FocusingContainer } from "@/features/lens-editor/components/FocusingContainer";
import { ImageReferencePanel } from "@/features/lens-editor/components/ImageReferencePanel";

/**
## Props

```ts
interface BottomDrawerContainerProps {
  getOpticalModel: () => OpticalModel;
  onUpdateSystem: () => Promise<void>;
  isReady: boolean;
  computing: boolean;
  proxy: PyodideWorkerAPI | undefined;
  onError: () => void;
  draggable: boolean;
}
```

`SpecsConfiguratorContainer`, `LensPrescriptionContainer`, and `FocusingContainer` read their stores through the provider hooks, so this container only forwards the callbacks and worker state they still need.

| Prop | Type | Required | Description |
|---|---|---|---|
| `getOpticalModel` | `() => OpticalModel` | Yes | Callback to build the current optical model from store state |
| `onUpdateSystem` | `() => Promise<void>` | Yes | Triggers a full system update (submit) |
| `isReady` | `boolean` | Yes | Whether Pyodide is initialized |
| `computing` | `boolean` | Yes | Whether a computation is in progress |
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy |
| `onError` | `() => void` | Yes | Called when an async operation throws |
| `draggable` | `boolean` | Yes | Whether the drawer is draggable (true for LG layout, false for SM) |
*/
interface BottomDrawerContainerProps {
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly onError: () => void;
  readonly draggable: boolean;
}

/**
## Purpose

Container component that composes the four drawer tabs (System Specs, Prescription, Focusing, Image Reference) and renders them inside `BottomDrawer`. Extracts `drawerTabs` construction from `page.tsx` to encapsulate bottom-drawer concerns.

## Usages

Used in `LensEditor.tsx` for both LG and SM layouts, with `draggable` toggled by breakpoint.
*/
export function BottomDrawerContainer({
  getOpticalModel,
  onUpdateSystem,
  isReady,
  computing,
  proxy,
  onError,
  draggable,
}: BottomDrawerContainerProps) {
  const lensStore = useLensEditorStore();
  const activeBottomDrawerTabId = useStore(lensStore, (state) => state.activeBottomDrawerTabId);
  const initialBottomDrawerHeight = lensStore.getState().bottomDrawerHeight;
  const tabs = useMemo(
    () => [
      {
        id: "specs",
        label: "System Specs",
        content: <SpecsConfiguratorContainer />,
      },
      {
        id: "prescription",
        label: "Prescription",
        content: (
          <LensPrescriptionContainer
            getOpticalModel={getOpticalModel}
          />
        ),
      },
      {
        id: "focusing",
        label: "Focusing",
        content: (
          <FocusingContainer
            proxy={proxy}
            isReady={isReady}
            computing={computing}
            getOpticalModel={getOpticalModel}
            onUpdateSystem={onUpdateSystem}
            onError={onError}
          />
        ),
      },
      {
        id: "image-reference",
        label: "Image Reference",
        content: <ImageReferencePanel />,
      },
    ],
    [getOpticalModel, onUpdateSystem, isReady, computing, proxy, onError]
  );

  return (
    <BottomDrawer
      tabs={tabs}
      draggable={draggable}
      activeTabId={activeBottomDrawerTabId}
      onTabChange={(tabId) => lensStore.getState().setActiveBottomDrawerTabId(tabId)}
      initialHeight={initialBottomDrawerHeight}
      onHeightCommit={(height) => lensStore.getState().setBottomDrawerHeight(height)}
    />
  );
}
