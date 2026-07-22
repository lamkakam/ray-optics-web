"use client";

import { useState, useMemo } from "react";
import { useStore } from "zustand";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { FocusingPanel } from "@/features/lens-editor/components/FocusingPanel";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";

type Chromaticity = "mono" | "poly";
type Metric = "rmsSpot" | "wavefront";

interface FocusingContainerProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  readonly onError: () => void;
}

/**
 * Container for the Focusing tab in the bottom drawer. Manages focusing strategy state, calls the appropriate worker function, updates the last surface thickness in `lensStore`, then calls `onUpdateSystem` to recompute the model.
 *
 * @remarks
 * ## Behavior
 *
 * `handleFocus`:
 * 1. Sets `focusing=true` (shows `LoadingOverlay`, disables `FocusingPanel`).
 * 2. Calls one of four proxy methods based on `chromaticity` × `metric`:
 * - `mono` + `rmsSpot` → `focusByMonoRmsSpot`
 * - `mono` + `wavefront` → `focusByMonoStrehl`
 * - `poly` + `rmsSpot` → `focusByPolyRmsSpot`
 * - `poly` + `wavefront` → `focusByPolyStrehl`
 * 3. Finds the last `kind === "surface"` row in `lensStore` and calls `updateRow` with `thickness + result.delta_thi`, using `optimizationSyncPolicy: "preserveOptimizationModes"` so Optimization keeps existing prescription variable/pickup modes.
 * 4. Calls `onUpdateSystem()` to recompute layout and plots.
 * 5. On any error, calls `onError()`.
 * 6. Sets `focusing=false` in `finally`.
 *
 * The `disabled` prop passed to `FocusingPanel` is `!isReady || computing || focusing`.
 *
 * `fieldOptions` are derived reactively from `useSpecsConfiguratorStore` and Zustand's `useStore` (subscribes to `relativeFields`, `maxField`, `fieldType`). This means the Field dropdown updates immediately when field configuration changes in `specsStore`, even before the user clicks "Update System".
 *
 * Instantiated in `BottomDrawerContainer.tsx` as the "Focusing" tab content.
 *
 *
 *
 * ## Rendering
 *
 * ```tsx
 * <div className="relative p-4">
 * {focusing && <LoadingOverlay title="Focusing…" contents="Optimizing image plane position…" />}
 * <FocusingPanel ... />
 * </div>
 * ```
 */
export function FocusingContainer({
  proxy,
  isReady,
  computing,
  getOpticalModel,
  onUpdateSystem,
  onError,
}: FocusingContainerProps) {
  const lensStore = useLensEditorStore();
  /** Monochromatic or polychromatic focus mode. */
  const [chromaticity, setChromaticity] = useState<Chromaticity>("mono");
  /** RMS-spot or wavefront focus metric. */
  const [metric, setMetric] = useState<Metric>("rmsSpot");
  /** Selected field index for the focusing operation. */
  const [fieldIndex, setFieldIndex] = useState(0);
  /** Whether a focusing worker call is in progress. */
  const [focusing, setFocusing] = useState(false);

  const specsStore = useSpecsConfiguratorStore();
  const relativeFields = useStore(specsStore, (s) => s.relativeFields);
  const maxField = useStore(specsStore, (s) => s.maxField);
  const fieldType = useStore(specsStore, (s) => s.fieldType);

  const fieldOptions = useMemo(() => {
    const unit = fieldType === "angle" ? "°" : " mm";
    return relativeFields.map((rf, i) => ({
      label: `${(rf * maxField).toPrecision(3)}${unit}`,
      value: i,
    }));
  }, [relativeFields, maxField, fieldType]);

  const handleFocus = async () => {
    if (!proxy) return;
    setFocusing(true);
    try {
      const model = getOpticalModel();
      let result;
      if (chromaticity === "mono" && metric === "rmsSpot") {
        result = await proxy.focusByMonoRmsSpot(model, fieldIndex);
      } else if (chromaticity === "mono" && metric === "wavefront") {
        result = await proxy.focusByMonoStrehl(model, fieldIndex);
      } else if (chromaticity === "poly" && metric === "rmsSpot") {
        result = await proxy.focusByPolyRmsSpot(model, fieldIndex);
      } else {
        result = await proxy.focusByPolyStrehl(model, fieldIndex);
      }

      const rows = lensStore.getState().rows;
      const lastSurface = [...rows].reverse().find((r) => r.kind === "surface");
      if (lastSurface && lastSurface.kind === "surface") {
        lensStore.getState().updateRow(lastSurface.id, {
          thickness: lastSurface.thickness + result.delta_thi,
        }, {
          optimizationSyncPolicy: "preserveOptimizationModes",
        });
      }

      await onUpdateSystem();
    } catch {
      onError();
    } finally {
      setFocusing(false);
    }
  };

  return (
    <div className="relative p-4">
      {focusing && (
        <LoadingOverlay
          title="Focusing…"
          contents="Optimizing image plane position…"
        />
      )}
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
