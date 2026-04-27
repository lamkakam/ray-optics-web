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

interface BottomDrawerContainerProps {
  readonly getOpticalModel: () => OpticalModel;
  readonly onImportJson: (data: OpticalModel) => void;
  readonly onUpdateSystem: () => Promise<void>;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly onError: () => void;
  readonly draggable: boolean;
}

export function BottomDrawerContainer({
  getOpticalModel,
  onImportJson,
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
            onImportJson={onImportJson}
            onUpdateSystem={onUpdateSystem}
            isUpdateSystemDisabled={!isReady || computing}
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
    ],
    [getOpticalModel, onImportJson, onUpdateSystem, isReady, computing, proxy, onError]
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
