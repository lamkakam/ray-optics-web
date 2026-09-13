"use client";

import React from "react";
import type { DecenterConfig, OpticalModel } from "@/shared/lib/types/opticalModel";
import type { AsphereMode, DecenterOptimizationState } from "@/features/optimization/stores/optimizationStore";
import { ModeSelectField } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields";
import { getRadiusPickupSourceSurfaceOptions, minLessThanMaxRule } from "@/features/optimization/lib/modalHelpers";
import { getVariableModeFieldsRenderer } from "@/features/optimization/lib/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";

const TYPE_OPTIONS = ["bend", "dec and return", "decenter", "reverse"].map((value) => ({ value, label: value }));
const COMPONENTS = [["alpha", "Alpha"], ["beta", "Beta"], ["gamma", "Gamma"], ["x", "Offset X"], ["y", "Offset Y"]] as const;
type ComponentKey = typeof COMPONENTS[number][0];

interface Props {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly decenterState: DecenterOptimizationState | undefined;
  readonly canUseBounds?: boolean;
  readonly onSave: (surfaceIndex: number, state: DecenterOptimizationState) => void;
  readonly onClose: () => void;
}

/** Edits five independent tilt/decenter modes in a cancelable local draft. */
export function TiltDecenterVarModal({ isOpen, optimizationModel, surfaceIndex, decenterState, canUseBounds = true, onSave, onClose }: Props) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || decenterState === undefined) {
    return <Modal isOpen={false} title="Tilt & Decenter Variable / Pickup" />;
  }
  return <Editor key={`${surfaceIndex}:${JSON.stringify(decenterState)}`} model={optimizationModel} state={decenterState} canUseBounds={canUseBounds} onSave={onSave} onClose={onClose} />;
}

function Editor({ model, state, canUseBounds, onSave, onClose }: { readonly model: OpticalModel; readonly state: DecenterOptimizationState; readonly canUseBounds: boolean; readonly onSave: Props["onSave"]; readonly onClose: () => void }) {
  const [draft, setDraft] = React.useState(state);
  const VariableFields = getVariableModeFieldsRenderer(canUseBounds);
  const sources = getRadiusPickupSourceSurfaceOptions(model.surfaces.length, state.surfaceIndex);
  const setMode = (component: ComponentKey, mode: AsphereMode) => setDraft((current) => ({ ...current, [component]: mode }));
  const invalid = canUseBounds && COMPONENTS.some(([component, label]) => {
    const mode = draft[component];
    return mode.mode === "variable" && minLessThanMaxRule(label, mode.min, mode.max) !== undefined;
  });
  return <Modal isOpen title="Tilt & Decenter Variable / Pickup" size="lg" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={invalid} onClick={() => { onSave(state.surfaceIndex, draft); onClose(); }}>Confirm</Button></div>}>
    <div className="space-y-4">
      <div><Label htmlFor="decenter-type">Type</Label><Select id="decenter-type" aria-label="Tilt and decenter type" value={draft.type} disabled={draft.lockedType} options={TYPE_OPTIONS} onChange={(event) => { const type = event.target.value as DecenterConfig["coordinateSystemStrategy"]; const constant = { mode: "constant" } as const; setDraft({ ...draft, type, alpha: constant, beta: constant, gamma: constant, x: constant, y: constant }); }} /></div>
      {COMPONENTS.map(([component, label]) => { const mode = draft[component]; return <div key={component} className="space-y-2"><div className="flex items-center gap-3"><span className="w-36 shrink-0 text-sm font-medium">{label}</span><ModeSelectField id={`${component}-mode`} ariaLabel={`${label} mode`} value={mode.mode} onChange={(next) => setMode(component, next === "constant" ? { mode: "constant" } : next === "variable" ? { mode: "variable", min: mode.mode === "variable" ? mode.min : "0", max: mode.mode === "variable" ? mode.max : "0" } : { mode: "pickup", sourceSurfaceIndex: mode.mode === "pickup" ? mode.sourceSurfaceIndex : String(sources[0]?.value ?? ""), scale: mode.mode === "pickup" ? mode.scale : "1", offset: mode.mode === "pickup" ? mode.offset : "0" })} /></div>
        {mode.mode === "variable" && <VariableFields.Component idPrefix={`decenter-${component}`} minAriaLabel={`${label} Min.`} minValue={mode.min} maxAriaLabel={`${label} Max.`} maxValue={mode.max} onMinChange={(value) => setMode(component, { ...mode, min: value })} onMaxChange={(value) => setMode(component, { ...mode, max: value })} errorText={canUseBounds ? minLessThanMaxRule(label, mode.min, mode.max) : undefined} className="ml-36 grid gap-3 pl-3" inputRowClassName="grid gap-3 md:grid-cols-2" />}
        {mode.mode === "pickup" && <PickupModeFields idPrefix={`decenter-${component}`} sourceSurfaceLabel="Source surface" sourceSurfaceAriaLabel={`${label} source surface`} sourceSurfaceValue={mode.sourceSurfaceIndex} sourceSurfaceOptions={sources} onSourceSurfaceChange={(value) => setMode(component, { ...mode, sourceSurfaceIndex: value })} scaleLabel="Scale" scaleAriaLabel={`${label} scale`} scaleValue={mode.scale} onScaleChange={(value) => setMode(component, { ...mode, scale: value })} offsetLabel="Offset" offsetAriaLabel={`${label} offset`} offsetValue={mode.offset} onOffsetChange={(value) => setMode(component, { ...mode, offset: value })} className="ml-36 grid gap-3 pl-3" scaleOffsetLayout="two-column" />}
      </div>; })}
    </div>
  </Modal>;
}
