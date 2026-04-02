"use client";

import React, { useCallback } from "react";
import { useStore, type StoreApi } from "zustand";
import {
  type SpecsConfiguratorState,
  type PupilSpace,
  type PupilType,
  type FieldSpace,
  type FieldType,
  type WavelengthWeights,
  type ReferenceIndex,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { SpecsConfiguratorPanel } from "@/features/lens-editor/components/SpecsConfiguratorPanel";
import { FieldConfigModal } from "@/features/lens-editor/components/FieldConfigModal";
import { WavelengthConfigModal } from "@/features/lens-editor/components/WavelengthConfigModal";

export function SpecsConfiguratorContainer() {
  const store= useSpecsConfiguratorStore();

  const pupilSpace = useStore(store, (s) => s.pupilSpace);
  const pupilType = useStore(store, (s) => s.pupilType);
  const pupilValue = useStore(store, (s) => s.pupilValue);
  const fieldSpace = useStore(store, (s) => s.fieldSpace);
  const fieldType = useStore(store, (s) => s.fieldType);
  const maxField = useStore(store, (s) => s.maxField);
  const relativeFields = useStore(store, (s) => s.relativeFields);
  const wavelengthWeights = useStore(store, (s) => s.wavelengthWeights);
  const referenceIndex = useStore(store, (s) => s.referenceIndex);
  const fieldModalOpen = useStore(store, (s) => s.fieldModalOpen);
  const wavelengthModalOpen = useStore(store, (s) => s.wavelengthModalOpen);

  const fieldSummary = `${relativeFields.length} field${relativeFields.length !== 1 ? "s" : ""}, ${maxField}${fieldType === "angle" ? "°" : "mm"} max`;
  const wavelengthSummary = `${wavelengthWeights.length} wavelength${wavelengthWeights.length !== 1 ? "s" : ""}`;

  const handleApertureChange = useCallback(
    (patch: {
      pupilSpace?: PupilSpace;
      pupilType?: PupilType;
      pupilValue?: number;
    }) => {
      store.getState().setAperture(patch);
    },
    [store]
  );

  const handleFieldApply = useCallback(
    (result: {
      space: FieldSpace;
      type: FieldType;
      maxField: number;
      relativeFields: number[];
    }) => {
      store.getState().setField(result);
      store.getState().closeFieldModal();
    },
    [store]
  );

  const handleWavelengthApply = useCallback(
    (result: { weights: WavelengthWeights; referenceIndex: ReferenceIndex }) => {
      store.getState().setWavelengths(result);
      store.getState().closeWavelengthModal();
    },
    [store]
  );

  return (
    <div>
      <SpecsConfiguratorPanel
        pupilSpace={pupilSpace}
        pupilType={pupilType}
        pupilValue={pupilValue}
        fieldSummary={fieldSummary}
        wavelengthSummary={wavelengthSummary}
        onApertureChange={handleApertureChange}
        onOpenFieldModal={() => store.getState().openFieldModal()}
        onOpenWavelengthModal={() => store.getState().openWavelengthModal()}
      />

      <FieldConfigModal
        isOpen={fieldModalOpen}
        initialSpace={fieldSpace}
        initialType={fieldType}
        initialMaxField={maxField}
        initialRelativeFields={relativeFields}
        onApply={handleFieldApply}
        onClose={() => store.getState().closeFieldModal()}
      />

      <WavelengthConfigModal
        isOpen={wavelengthModalOpen}
        initialWeights={wavelengthWeights}
        initialReferenceIndex={referenceIndex}
        onApply={handleWavelengthApply}
        onClose={() => store.getState().closeWavelengthModal()}
      />
    </div>
  );
}
