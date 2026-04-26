"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";
import type { AsphereOptimizationState, AsphereMode, AsphereTermKey } from "@/features/optimization/stores/optimizationStore";
import { ModeSelectField } from "@/features/optimization/components/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/PickupModeFields";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  curvatureRadiusCrossesZero,
  getCurvatureRadiusBoundsErrorText,
  getThicknessPickupSourceSurfaceOptions,
} from "@/features/optimization/lib/modalHelpers";
import { getVariableModeFieldsRenderer } from "@/features/optimization/lib/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";

type TermKind = "conic" | "toricSweep" | { coefficientIndex: number };

interface TermDescriptor {
  readonly kind: TermKind;
  readonly displayLabel: React.ReactNode;
  readonly ariaLabel: string;
}

function createCoefficientTermDescriptor(coefficientIndex: number, coefficientLabel: string): TermDescriptor {
  const mathIndex = coefficientLabel.replace("a_", "");

  return {
    kind: { coefficientIndex },
    displayLabel: <MathJax inline>{`\\(a_{${mathIndex}}\\)`}</MathJax>,
    ariaLabel: coefficientLabel,
  };
}

const ASPHERE_TYPE_OPTIONS = [
  { value: "Conic", label: "Conic" },
  { value: "EvenAspherical", label: "Even Aspheric" },
  { value: "RadialPolynomial", label: "Radial Polynomial" },
  { value: "XToroid", label: "X Toroid" },
  { value: "YToroid", label: "Y Toroid" },
] as const;

function getTermRows(type: AsphericalType | undefined): ReadonlyArray<TermDescriptor> {
  if (type === undefined) {
    return [];
  }

  const conicRow: TermDescriptor = {
    kind: "conic",
    displayLabel: "Conic Constant",
    ariaLabel: "Conic Constant",
  };

  if (type === "Conic") {
    return [conicRow];
  }

  if (type === "EvenAspherical") {
    const coeffRows: TermDescriptor[] = Array.from({ length: 10 }, (_, i) => ({
      ...createCoefficientTermDescriptor(i, `a_${(i + 1) * 2}`),
    }));
    return [conicRow, ...coeffRows];
  }

  if (type === "RadialPolynomial") {
    const coeffRows: TermDescriptor[] = Array.from({ length: 10 }, (_, i) => ({
      ...createCoefficientTermDescriptor(i, `a_${i + 1}`),
    }));
    return [conicRow, ...coeffRows];
  }

  if (type === "XToroid" || type === "YToroid") {
    const toricRow: TermDescriptor = {
      kind: "toricSweep",
      displayLabel: "Toroid sweep R",
      ariaLabel: "Toroid sweep R",
    };
    const coeffRows: TermDescriptor[] = Array.from({ length: 10 }, (_, i) => ({
      ...createCoefficientTermDescriptor(i, `a_${(i + 1) * 2}`),
    }));
    return [conicRow, toricRow, ...coeffRows];
  }

  return [conicRow];
}

function getTermMode(state: AsphereOptimizationState, term: TermDescriptor): AsphereMode {
  if (term.kind === "conic") {
    return state.conic;
  }
  if (term.kind === "toricSweep") {
    return state.toricSweep;
  }
  return state.coefficients[(term.kind as { coefficientIndex: number }).coefficientIndex] ?? { mode: "constant" };
}

function setTermMode(state: AsphereOptimizationState, term: TermDescriptor, mode: AsphereMode): AsphereOptimizationState {
  if (term.kind === "conic") {
    return { ...state, conic: mode };
  }
  if (term.kind === "toricSweep") {
    return { ...state, toricSweep: mode };
  }
  const idx = (term.kind as { coefficientIndex: number }).coefficientIndex;
  return {
    ...state,
    coefficients: state.coefficients.map((c, i) => i === idx ? mode : c),
  };
}

function isVariableInvalid(mode: AsphereMode, usesBounds: boolean): boolean {
  if (mode.mode !== "variable" || !usesBounds) {
    return false;
  }
  const min = Number.parseFloat(mode.min);
  const max = Number.parseFloat(mode.max);
  return !Number.isFinite(min) || !Number.isFinite(max) || min >= max;
}

function isCoefficient(kind: TermKind): kind is { coefficientIndex: number } {
  return typeof kind === "object";
}

interface AsphereVarModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly asphereState: AsphereOptimizationState | undefined;
  readonly canUseBounds?: boolean;
  readonly onSave: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  readonly onClose: () => void;
}

export function AsphereVarModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  asphereState,
  canUseBounds = true,
  onSave,
  onClose,
}: AsphereVarModalProps) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || asphereState === undefined) {
    return (
      <Modal isOpen={false} title="Asphere Variable / Pickup">
        <></>
      </Modal>
    );
  }

  return (
    <AsphereVarModalEditor
      key={`${surfaceIndex}:${serializeAsphereState(asphereState)}`}
      optimizationModel={optimizationModel}
      surfaceIndex={surfaceIndex}
      asphereState={asphereState}
      canUseBounds={canUseBounds}
      onSave={onSave}
      onClose={onClose}
    />
  );
}

interface AsphereVarModalEditorProps {
  readonly optimizationModel: OpticalModel;
  readonly surfaceIndex: number;
  readonly asphereState: AsphereOptimizationState;
  readonly canUseBounds: boolean;
  readonly onSave: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  readonly onClose: () => void;
}

function AsphereVarModalEditor({
  optimizationModel,
  surfaceIndex,
  asphereState,
  canUseBounds,
  onSave,
  onClose,
}: AsphereVarModalEditorProps) {
  const [draft, setDraft] = React.useState<AsphereOptimizationState>(() => asphereState);
  const VariableModeFields = getVariableModeFieldsRenderer(canUseBounds);
  const sourceSurfaceOptions = React.useMemo(
    () => getThicknessPickupSourceSurfaceOptions(optimizationModel.surfaces.length, surfaceIndex),
    [optimizationModel.surfaces.length, surfaceIndex],
  );

  const termRows = getTermRows(draft.type);
  const isDoneDisabled = termRows.some((term) => {
    const mode = getTermMode(draft, term);

    if (isVariableInvalid(mode, canUseBounds)) {
      return true;
    }

    return canUseBounds
      && term.kind === "toricSweep"
      && mode.mode === "variable"
      && curvatureRadiusCrossesZero(mode.min, mode.max);
  });

  const handleTypeChange = (type: AsphericalType) => {
    const constant: AsphereMode = { mode: "constant" };
    setDraft({
      ...draft,
      type,
      conic: constant,
      toricSweep: constant,
      coefficients: Array.from({ length: 10 }, () => constant),
    });
  };

  const handleTermModeChange = (term: TermDescriptor, modeStr: string) => {
    const current = getTermMode(draft, term);
    if (modeStr === "constant") {
      setDraft(setTermMode(draft, term, { mode: "constant" }));
      return;
    }
    if (modeStr === "variable") {
      const prevMin = current.mode === "variable" ? current.min : "0";
      const prevMax = current.mode === "variable" ? current.max : "0";
      setDraft(setTermMode(draft, term, { mode: "variable", min: prevMin, max: prevMax }));
      return;
    }
    if (modeStr === "pickup") {
      const defaultSourceSurfaceIndex = String(sourceSurfaceOptions[0]?.value ?? "");
      setDraft(setTermMode(draft, term, {
        mode: "pickup",
        sourceSurfaceIndex: current.mode === "pickup" ? current.sourceSurfaceIndex : defaultSourceSurfaceIndex,
        scale: current.mode === "pickup" ? current.scale : "1",
        offset: current.mode === "pickup" ? current.offset : "0",
      }));
    }
  };

  const handleTermVariableChange = (term: TermDescriptor, field: "min" | "max", value: string) => {
    const current = getTermMode(draft, term);
    if (current.mode !== "variable") {
      return;
    }
    setDraft(setTermMode(draft, term, {
      ...current,
      [field]: value,
    }));
  };

  const handleTermPickupChange = (term: TermDescriptor, field: "sourceSurfaceIndex" | "scale" | "offset" | "sourceCoefficientIndex", value: string) => {
    const current = getTermMode(draft, term);
    if (current.mode !== "pickup") {
      return;
    }
    if (field === "sourceCoefficientIndex") {
      setDraft(setTermMode(draft, term, {
        ...current,
        sourceTermKey: `coefficient:${value}` as AsphereTermKey,
      }));
      return;
    }
    setDraft(setTermMode(draft, term, {
      ...current,
      [field]: value,
    }));
  };

  return (
    <Modal isOpen title="Asphere Variable / Pickup" size="lg">
      <div className="space-y-4">
        <div>
          <Label htmlFor="asphere-type">Type</Label>
          <Select
            id="asphere-type"
            aria-label="Asphere type"
            value={draft.type ?? ""}
            disabled={draft.lockedType}
            options={ASPHERE_TYPE_OPTIONS}
            placeholder="—"
            onChange={(e) => handleTypeChange(e.target.value as AsphericalType)}
          />
        </div>

        {termRows.length > 0 && (
          <div className="space-y-3">
            {termRows.map((term) => {
              const mode = getTermMode(draft, term);
              const variableBoundsCrossZero = canUseBounds
                && term.kind === "toricSweep"
                && mode.mode === "variable"
                && curvatureRadiusCrossesZero(mode.min, mode.max);
              const termId = typeof term.kind === "object"
                ? `coeff-${(term.kind as { coefficientIndex: number }).coefficientIndex}`
                : term.kind;

              return (
                <div key={termId} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm font-medium">{term.displayLabel}</span>
                    <ModeSelectField
                      id={`${termId}-mode`}
                      ariaLabel={`${term.ariaLabel} mode`}
                      value={mode.mode}
                      onChange={(value) => handleTermModeChange(term, value)}
                    />
                  </div>

                  {mode.mode === "variable" && (
                    <VariableModeFields.Component
                      idPrefix={termId}
                      minAriaLabel={`${term.ariaLabel} Min.`}
                      minValue={mode.min}
                      maxAriaLabel={`${term.ariaLabel} Max.`}
                      maxValue={mode.max}
                      onMinChange={(value) => handleTermVariableChange(term, "min", value)}
                      onMaxChange={(value) => handleTermVariableChange(term, "max", value)}
                      guidanceText={canUseBounds && term.kind === "toricSweep"
                        ? CURVATURE_RADIUS_GUIDANCE_TEXT
                        : undefined}
                      errorText={variableBoundsCrossZero
                        ? getCurvatureRadiusBoundsErrorText("Toroid sweep R")
                        : undefined}
                      className="ml-36 grid gap-3 pl-3"
                      inputRowClassName="grid gap-3 md:grid-cols-2"
                      helperTextClassName="md:col-span-2"
                      errorTextClassName="md:col-span-2"
                    />
                  )}

                  {mode.mode === "pickup" && (
                    <PickupModeFields
                      idPrefix={termId}
                      sourceSurfaceLabel="Source surface"
                      sourceSurfaceAriaLabel="Source surface"
                      sourceSurfaceValue={mode.sourceSurfaceIndex}
                      sourceSurfaceOptions={sourceSurfaceOptions}
                      onSourceSurfaceChange={(value) => handleTermPickupChange(term, "sourceSurfaceIndex", value)}
                      scaleLabel="Scale"
                      scaleAriaLabel={`${term.ariaLabel} scale`}
                      scaleValue={mode.scale}
                      onScaleChange={(value) => handleTermPickupChange(term, "scale", value)}
                      offsetLabel="Offset"
                      offsetAriaLabel={`${term.ariaLabel} offset`}
                      offsetValue={mode.offset}
                      onOffsetChange={(value) => handleTermPickupChange(term, "offset", value)}
                      extraField={isCoefficient(term.kind) ? {
                        idSuffix: "source-coeff",
                        label: "Source coefficient index",
                        ariaLabel: `${term.ariaLabel} source coefficient index`,
                        value: mode.sourceTermKey?.replace("coefficient:", "") ?? "",
                        onChange: (value) => handleTermPickupChange(term, "sourceCoefficientIndex", value),
                      } : undefined}
                      className="ml-36 grid gap-3 pl-3"
                      scaleOffsetLayout="two-column"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={isDoneDisabled}
            onClick={() => {
              onSave(surfaceIndex, draft);
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function serializeAsphereMode(mode: AsphereMode): string {
  switch (mode.mode) {
    case "constant":
      return "constant";
    case "variable":
      return `variable:${mode.min}:${mode.max}`;
    case "pickup":
      return `pickup:${mode.sourceSurfaceIndex}:${mode.sourceTermKey ?? ""}:${mode.scale}:${mode.offset}`;
  }
}

function serializeAsphereState(state: AsphereOptimizationState): string {
  return [
    state.surfaceIndex,
    state.type ?? "",
    String(state.lockedType),
    serializeAsphereMode(state.conic),
    serializeAsphereMode(state.toricSweep),
    state.coefficients.map(serializeAsphereMode).join("|"),
  ].join(":");
}
