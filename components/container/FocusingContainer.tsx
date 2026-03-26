"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/store/lensEditorStore";
import type { SpecsConfigurerState } from "@/store/specsConfigurerStore";
import type { OpticalModel } from "@/lib/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import { FocusingPanel } from "@/components/composite/FocusingPanel";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";

type Chromaticity = "mono" | "poly";
type Metric = "rmsSpot" | "wavefront";

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

export function FocusingContainer({
  lensStore,
  specsStore,
  proxy,
  isReady,
  computing,
  getOpticalModel,
  onUpdateSystem,
  onError,
}: FocusingContainerProps) {
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

      const rows = lensStore.getState().rows;
      const lastSurface = [...rows].reverse().find((r) => r.kind === "surface");
      if (lastSurface && lastSurface.kind === "surface") {
        lensStore.getState().updateRow(lastSurface.id, {
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
