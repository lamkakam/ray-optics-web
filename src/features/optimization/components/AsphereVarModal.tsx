"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { AsphericalType } from "@/shared/lib/types/opticalModel";
import type { AsphereOptimizationState, AsphereMode, AsphereTermKey } from "@/features/optimization/stores/optimizationStore";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
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

const MODE_OPTIONS = [
  { value: "constant", label: "constant" },
  { value: "variable", label: "variable" },
  { value: "pickup", label: "pickup" },
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

function isVariableInvalid(mode: AsphereMode): boolean {
  if (mode.mode !== "variable") {
    return false;
  }
  const min = Number.parseFloat(mode.min);
  const max = Number.parseFloat(mode.max);
  return !Number.isFinite(min) || !Number.isFinite(max) || min >= max;
}

function crossesZero(minValue: string, maxValue: string): boolean {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }

  return min < 0 && max > 0;
}

function isCoefficient(kind: TermKind): kind is { coefficientIndex: number } {
  return typeof kind === "object";
}

interface AsphereVarModalProps {
  readonly isOpen: boolean;
  readonly surfaceIndex: number | undefined;
  readonly asphereState: AsphereOptimizationState | undefined;
  readonly onSave: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  readonly onClose: () => void;
}

export function AsphereVarModal({
  isOpen,
  surfaceIndex,
  asphereState,
  onSave,
  onClose,
}: AsphereVarModalProps) {
  const [draft, setDraft] = React.useState<AsphereOptimizationState | undefined>(undefined);

  React.useEffect(() => {
    if (!isOpen || surfaceIndex === undefined || asphereState === undefined) {
      setDraft(undefined);
      return;
    }
    setDraft(asphereState);
  }, [isOpen, surfaceIndex, asphereState]);

  if (!isOpen || surfaceIndex === undefined || asphereState === undefined || draft === undefined) {
    return (
      <Modal isOpen={false} title="Asphere Variable / Pickup">
        <></>
      </Modal>
    );
  }

  const termRows = getTermRows(draft.type);
  const isDoneDisabled = termRows.some((term) => {
    const mode = getTermMode(draft, term);

    if (isVariableInvalid(mode)) {
      return true;
    }

    return term.kind === "toricSweep"
      && mode.mode === "variable"
      && crossesZero(mode.min, mode.max);
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
      setDraft(setTermMode(draft, term, {
        mode: "pickup",
        sourceSurfaceIndex: current.mode === "pickup" ? current.sourceSurfaceIndex : "1",
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
              const variableBoundsCrossZero = term.kind === "toricSweep"
                && mode.mode === "variable"
                && crossesZero(mode.min, mode.max);
              const termId = typeof term.kind === "object"
                ? `coeff-${(term.kind as { coefficientIndex: number }).coefficientIndex}`
                : term.kind;

              return (
                <div key={termId} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm font-medium">{term.displayLabel}</span>
                    <Select
                      id={`${termId}-mode`}
                      aria-label={`${term.ariaLabel} mode`}
                      value={mode.mode}
                      options={MODE_OPTIONS}
                      onChange={(e) => handleTermModeChange(term, e.target.value)}
                    />
                  </div>

                  {mode.mode === "variable" && (
                    <div className="ml-36 grid gap-3 pl-3 md:grid-cols-2">
                      {term.kind === "toricSweep" ? (
                        <>
                          <Paragraph variant="caption" className="md:col-span-2">
                            R = 0 means a flat surface (infinite radius).
                          </Paragraph>
                          <Paragraph variant="caption" className="md:col-span-2">
                            Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.
                          </Paragraph>
                        </>
                      ) : null}
                      <div>
                        <Label htmlFor={`${termId}-min`}>Min.</Label>
                        <Input
                          id={`${termId}-min`}
                          aria-label={`${term.ariaLabel} Min.`}
                          value={mode.min}
                          onChange={(e) => handleTermVariableChange(term, "min", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${termId}-max`}>Max.</Label>
                        <Input
                          id={`${termId}-max`}
                          aria-label={`${term.ariaLabel} Max.`}
                          value={mode.max}
                          onChange={(e) => handleTermVariableChange(term, "max", e.target.value)}
                        />
                      </div>
                      {variableBoundsCrossZero ? (
                        <Paragraph variant="caption" className="text-red-600 dark:text-red-400 md:col-span-2">
                          Toroid sweep R variable bounds must stay on one side of 0.
                        </Paragraph>
                      ) : null}
                    </div>
                  )}

                  {mode.mode === "pickup" && (
                    <div className="ml-36 grid gap-3 pl-3">
                      <div>
                        <Label htmlFor={`${termId}-source`}>Source surface index</Label>
                        <Input
                          id={`${termId}-source`}
                          aria-label={`${term.ariaLabel} source surface index`}
                          value={mode.sourceSurfaceIndex}
                          onChange={(e) => handleTermPickupChange(term, "sourceSurfaceIndex", e.target.value)}
                        />
                      </div>
                      {isCoefficient(term.kind) && (
                        <div>
                          <Label htmlFor={`${termId}-source-coeff`}>Source coefficient index</Label>
                          <Input
                            id={`${termId}-source-coeff`}
                            aria-label={`${term.ariaLabel} source coefficient index`}
                            value={mode.sourceTermKey?.replace("coefficient:", "") ?? ""}
                            onChange={(e) => handleTermPickupChange(term, "sourceCoefficientIndex", e.target.value)}
                          />
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor={`${termId}-scale`}>Scale</Label>
                          <Input
                            id={`${termId}-scale`}
                            aria-label={`${term.ariaLabel} scale`}
                            value={mode.scale}
                            onChange={(e) => handleTermPickupChange(term, "scale", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${termId}-offset`}>Offset</Label>
                          <Input
                            id={`${termId}-offset`}
                            aria-label={`${term.ariaLabel} offset`}
                            value={mode.offset}
                            onChange={(e) => handleTermPickupChange(term, "offset", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
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
