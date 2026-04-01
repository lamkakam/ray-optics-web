"use client";

import React, { useMemo } from "react";
import type { StoreApi } from "zustand";
import type { SpecsConfigurerState } from "@/features/lens-editor/stores/specsConfigurerStore";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { BottomDrawer } from "@/shared/components/layout/BottomDrawer";
import { SpecsConfigurerContainer } from "./SpecsConfigurerContainer";
import { LensPrescriptionContainer } from "./LensPrescriptionContainer";
import { FocusingContainer } from "./FocusingContainer";

interface BottomDrawerContainerProps {
  readonly specsStore: StoreApi<SpecsConfigurerState>;
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
  specsStore,
  getOpticalModel,
  onImportJson,
  onUpdateSystem,
  isReady,
  computing,
  proxy,
  onError,
  draggable,
}: BottomDrawerContainerProps) {
  const tabs = useMemo(
    () => [
      {
        id: "specs",
        label: "System Specs",
        content: <SpecsConfigurerContainer />,
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
            specsStore={specsStore}
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
    [specsStore, getOpticalModel, onImportJson, onUpdateSystem, isReady, computing, proxy, onError]
  );

  return <BottomDrawer tabs={tabs} draggable={draggable} />;
}
