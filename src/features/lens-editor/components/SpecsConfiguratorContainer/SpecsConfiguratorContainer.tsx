"use client";

import { useCallback } from "react";
import { useStore } from "zustand";
import type {
  PupilSpace,
  PupilType,
  FieldConfig,
  WavelengthWeights,
  ReferenceIndex,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { SpecsConfiguratorPanel } from "@/features/lens-editor/components/SpecsConfiguratorPanel";
import { FieldConfigModal } from "@/features/lens-editor/components/FieldConfigModal";
import { WavelengthConfigModal } from "@/features/lens-editor/components/WavelengthConfigModal";

/**
 * Container that connects the `specsConfiguratorStore` to `SpecsConfiguratorPanel` and its two config modals (`FieldConfigModal`, `WavelengthConfigModal`). Derives human-readable summaries for the visible Half-Field section and wavelength section.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Subscribes to all relevant store slices individually with `useStore(store, selector)` for granular reactivity.
 * - Computes `fieldSummary` (e.g. `"3 fields, 20° max"`) for the visible Half-Field section, deriving the maximum magnitude from absolute samples, and `wavelengthSummary` (e.g. `"3 wavelengths"`) inline.
 * - Subscribes to `fields`, `isRelative`, `maxField`, and `isWideAngle` and passes the field draft into `FieldConfigModal`; absolute samples and their mode are preserved across reopenings and applies.
 * - All store mutation callbacks (`handleApertureChange`, `handleFieldApply`, `handleWavelengthApply`) are wrapped in `useCallback` with `[store]` dependency and call `store.getState().<action>` to avoid stale closures.
 * - Modal open/close is driven by `fieldModalOpen` and `wavelengthModalOpen` state from the store.
 *
 * - Mounted once in the main page inside the `BottomDrawer` tabs, alongside `LensPrescriptionContainer`.
 *
 *
 *
 * ## Injected Dependencies
 * Imperative access to specs actions is via `useSpecsConfiguratorStore()` (stable, non-reactive). For reactive states, use `useSpecsConfiguratorStore` with Zustand's `useStore`.
 */
export function SpecsConfiguratorContainer() {
  const store = useSpecsConfiguratorStore();

  const pupilSpace = useStore(store, (s) => s.pupilSpace);
  const pupilType = useStore(store, (s) => s.pupilType);
  const pupilValue = useStore(store, (s) => s.pupilValue);
  const fieldSpace = useStore(store, (s) => s.fieldSpace);
  const fieldType = useStore(store, (s) => s.fieldType);
  const maxField = useStore(store, (s) => s.maxField);
  const fields = useStore(store, (s) => s.fields);
  const isRelative = useStore(store, (s) => s.isRelative);
  const isWideAngle = useStore(store, (s) => s.isWideAngle);
  const wavelengthWeights = useStore(store, (s) => s.wavelengthWeights);
  const referenceIndex = useStore(store, (s) => s.referenceIndex);
  const fieldModalOpen = useStore(store, (s) => s.fieldModalOpen);
  const wavelengthModalOpen = useStore(store, (s) => s.wavelengthModalOpen);

  const absoluteMaximum = fields.reduce(
    (largest, sample) => Math.max(largest, Math.abs(sample)),
    0,
  );
  const fieldMaximum = isRelative ? maxField : absoluteMaximum;
  const fieldSummary = `${fields.length} field${fields.length !== 1 ? "s" : ""}, ${fieldMaximum}${fieldType === "angle" ? "°" : "mm"} max`;
  const wavelengthSummary = `${wavelengthWeights.length} wavelength${wavelengthWeights.length !== 1 ? "s" : ""}`;

  const handleApertureChange = useCallback(
    (patch: {
      pupilSpace?: PupilSpace;
      pupilType?: PupilType;
      pupilValue?: number;
    }) => {
      store.getState().setAperture(patch);
    },
    [store],
  );

  const handleFieldApply = useCallback(
    (result: FieldConfig) => {
      store.getState().setField(result);
      store.getState().closeFieldModal();
    },
    [store],
  );

  const handleWavelengthApply = useCallback(
    (result: {
      weights: WavelengthWeights;
      referenceIndex: ReferenceIndex;
    }) => {
      store.getState().setWavelengths(result);
      store.getState().closeWavelengthModal();
    },
    [store],
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
        initialFields={fields}
        initialIsRelative={isRelative}
        initialIsWideAngle={isWideAngle}
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
