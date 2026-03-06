"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import { createStore, useStore } from "zustand";
import type { OpticalSpecs } from "@/lib/opticalModel";
import {
  createSpecsConfigurerSlice,
  type SpecsConfigurerState,
  type PupilSpace,
  type PupilType,
  type FieldSpace,
  type FieldType,
  type WavelengthWeights,
  type ReferenceIndex,
} from "@/store/specsConfigurerStore";
import { SpecsConfigurerPanel } from "@/components/composite/SpecsConfigurerPanel";
import { FieldConfigModal } from "@/components/composite/FieldConfigModal";
import { WavelengthConfigModal } from "@/components/composite/WavelengthConfigModal";

interface SpecsConfigurerContainerProps {
  readonly initialSpecs: OpticalSpecs;
  readonly onSpecsChange: (specs: OpticalSpecs) => void;
}

export function SpecsConfigurerContainer({
  initialSpecs,
  onSpecsChange,
}: SpecsConfigurerContainerProps) {
  const store = useMemo(
    () => createStore<SpecsConfigurerState>(createSpecsConfigurerSlice),
    []
  );

  // Initialize from props
  useEffect(() => {
    store.getState().loadFromSpecs(initialSpecs);
  }, [initialSpecs, store]);

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
      const specs = store.getState().toOpticalSpecs();
      onSpecsChange(specs);
    },
    [store, onSpecsChange]
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
      const specs = store.getState().toOpticalSpecs();
      onSpecsChange(specs);
    },
    [store, onSpecsChange]
  );

  const handleWavelengthApply = useCallback(
    (result: { weights: WavelengthWeights; referenceIndex: ReferenceIndex }) => {
      store.getState().setWavelengths(result);
      store.getState().closeWavelengthModal();
      const specs = store.getState().toOpticalSpecs();
      onSpecsChange(specs);
    },
    [store, onSpecsChange]
  );

  return (
    <div>
      <SpecsConfigurerPanel
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
