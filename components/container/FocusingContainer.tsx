"use client";

import React, { useState, useMemo } from "react";
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/store/lensEditorStore";
import type { OpticalSpecs, OpticalModel } from "@/lib/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import { FocusingPanel } from "@/components/composite/FocusingPanel";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";

type Chromaticity = "mono" | "poly";
type Metric = "rmsSpot" | "wavefront";

interface FocusingContainerProps {
  readonly lensStore: StoreApi<LensEditorState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly computing: boolean;
  readonly committedSpecs: OpticalSpecs;
  readonly getOpticalModel: () => OpticalModel;
  readonly onUpdateSystem: () => Promise<void>;
  readonly onError: () => void;
}

export function FocusingContainer({
  lensStore,
  proxy,
  isReady,
  computing,
  committedSpecs,
  getOpticalModel,
  onUpdateSystem,
  onError,
}: FocusingContainerProps) {
  const [chromaticity, setChromaticity] = useState<Chromaticity>("mono");
  const [metric, setMetric] = useState<Metric>("rmsSpot");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [focusing, setFocusing] = useState(false);

  const fieldOptions = useMemo(() => {
    const { fields, maxField, type } = committedSpecs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toPrecision(3)}${unit}`,
      value: i,
    }));
  }, [committedSpecs.field]);

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
