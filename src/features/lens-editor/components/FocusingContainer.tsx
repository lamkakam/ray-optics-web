"use client";

import React, { useState, useMemo } from "react";
import { useStore, type StoreApi } from "zustand";
import { useLensEditorStoreApi } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { SpecsConfigurerState } from "@/features/lens-editor/stores/specsConfigurerStore";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { FocusingPanel } from "@/features/lens-editor/components/FocusingPanel";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";

type Chromaticity = "mono" | "poly";
type Metric = "rmsSpot" | "wavefront";

interface FocusingContainerProps {
  readonly specsStore: StoreApi<SpecsConfigurerState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  readonly onError: () => void;
}

export function FocusingContainer({
  specsStore,
  proxy,
  isReady,
  computing,
  getOpticalModel,
  onUpdateSystem,
  onError,
}: FocusingContainerProps) {
  const lensStoreApi = useLensEditorStoreApi();
  const [chromaticity, setChromaticity] = useState<Chromaticity>("mono");
  const [metric, setMetric] = useState<Metric>("rmsSpot");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [focusing, setFocusing] = useState(false);

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

      const rows = lensStoreApi.getState().rows;
      const lastSurface = [...rows].reverse().find((r) => r.kind === "surface");
      if (lastSurface && lastSurface.kind === "surface") {
        lensStoreApi.getState().updateRow(lastSurface.id, {
          thickness: lastSurface.thickness + result.delta_thi,
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
