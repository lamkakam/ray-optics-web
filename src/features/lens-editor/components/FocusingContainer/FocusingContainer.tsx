"use client";

import { useState, useMemo } from "react";
import { useStore } from "zustand";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { FocusingPanel } from "@/features/lens-editor/components/FocusingPanel";
import {
  applyFocusingDelta,
  dispatchFocusing,
  type FocusingChromaticity,
  type FocusingMetric,
} from "@/features/lens-editor/lib/focusing";

interface FocusingContainerProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly computing: boolean;
  /** Whether any focus request, including its recomputation, is in progress. */
  readonly focusing: boolean;
  /** Starts the Lens Editor-level focus lifecycle. */
  readonly onFocusStart: () => void;
  /** Ends the Lens Editor-level focus lifecycle. */
  readonly onFocusEnd: () => void;
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  /** Forwards the failure to the shell for shared safe-message presentation. */
  readonly onError: (error?: unknown) => void;
}

/**
 * Container for the Focusing tab in the bottom drawer. Manages focusing strategy state, calls the appropriate worker function, updates the last surface thickness in `lensStore`, then calls `onUpdateSystem` to recompute the model. The parent owns the focus lifecycle so the loading overlay remains visible when another drawer tab is active.
 *
 * @remarks
 * ## Behavior
 *
 * `handleFocus`:
 * 1. Calls `onFocusStart` so the parent can show the Lens Editor-level focus overlay and disable related controls.
 * 2. Dispatches through the shared four-way `dispatchFocusing` helper based on `chromaticity` × `metric`.
 * 3. Applies the returned delta through the shared `applyFocusingDelta` helper to the last physical surface, using `optimizationSyncPolicy: "preserveOptimizationModes"` so Optimization keeps existing prescription variable/pickup modes.
 * 4. Calls `onUpdateSystem()` to recompute layout and plots.
 * 5. On any error, forwards it through `onError(error)` for safe shell presentation.
 * 6. Calls `onFocusEnd` in `finally`.
 *
 * The controlled `focusing` and `computing` props both participate in the
 * `disabled` value passed to `FocusingPanel`: `!isReady || computing || focusing`.
 *
 * `fieldOptions` are derived reactively from `useSpecsConfiguratorStore` and Zustand's `useStore` (subscribes to `fields`, `isRelative`, `maxField`, and `fieldType`). Relative samples are scaled by `maxField`; absolute samples are displayed directly. This means the Field dropdown updates immediately when field configuration changes in `specsStore`, even before the user clicks "Update System".
 *
 * Instantiated in `BottomDrawerContainer.tsx` as the "Focusing" tab content.
 *
 *
 *
 * ## Rendering
 *
 * `FocusingContainer` renders only the panel. `LensEditor` renders the
 * `LoadingOverlay` outside the drawer so it is independent of the selected tab.
 */
export function FocusingContainer({
  proxy,
  isReady,
  computing,
  focusing,
  onFocusStart,
  onFocusEnd,
  getOpticalModel,
  onUpdateSystem,
  onError,
}: FocusingContainerProps) {
  const lensStore = useLensEditorStore();
  /** Monochromatic or polychromatic focus mode. */
  const [chromaticity, setChromaticity] =
    useState<FocusingChromaticity>("mono");
  /** RMS-spot or wavefront focus metric. */
  const [metric, setMetric] = useState<FocusingMetric>("rmsSpot");
  /** Selected field index for the focusing operation. */
  const [fieldIndex, setFieldIndex] = useState(0);

  const specsStore = useSpecsConfiguratorStore();
  const fields = useStore(specsStore, (s) => s.fields);
  const isRelative = useStore(specsStore, (s) => s.isRelative);
  const maxField = useStore(specsStore, (s) => s.maxField);
  const fieldType = useStore(specsStore, (s) => s.fieldType);

  const fieldOptions = useMemo(() => {
    const unit = fieldType === "angle" ? "°" : " mm";
    return fields.map((field, i) => ({
      label: `${(isRelative ? field * maxField : field).toPrecision(3)}${unit}`,
      value: i,
    }));
  }, [fields, isRelative, maxField, fieldType]);

  const handleFocus = async () => {
    if (!proxy || focusing || computing) return;
    onFocusStart();
    try {
      const model = getOpticalModel();
      const result = await dispatchFocusing(proxy, model, {
        chromaticity,
        metric,
        fieldIndex,
      });
      applyFocusingDelta(lensStore, result);

      await onUpdateSystem();
    } catch (error) {
      onError(error);
    } finally {
      onFocusEnd();
    }
  };

  return (
    <div className="relative p-4">
      <FocusingPanel
        chromaticity={chromaticity}
        metric={metric}
        fieldIndex={fieldIndex}
        fieldOptions={fieldOptions}
        onChromaticityChange={setChromaticity}
        onMetricChange={setMetric}
        onFieldIndexChange={setFieldIndex}
        onFocus={handleFocus}
        disabled={!isReady || computing || focusing}
      />
    </div>
  );
}
