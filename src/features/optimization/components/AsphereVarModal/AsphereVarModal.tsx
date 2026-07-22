/**
 * Describes the Asphere Var Modal module.
 *
 * @remarks
 * ## Key Conventions
 *
 * - Coefficient label mapping: EvenAspherical/XToroid/YToroid use `a_${(index+1)*2}` (a_2, a_4…); RadialPolynomial uses `a_${index+1}` (a_1, a_2…).
 * - `sourceTermKey` for coefficient pickups is stored as the template literal `"coefficient:N"` where `N` is a zero-based coefficient slot, and is validated by `buildOptimizationConfig()` in the store.
 * - Source coefficient pickup labels are intentionally plain text (`a_1`, `a_2`, etc.) instead of MathJax because they render inside a native `Select`.
 * - Conic and toricSweep pickups do not require a `sourceTermKey`.
 * - Uses `<MathJax inline>` for coefficient labels only; this component does not own a `MathJaxContext` and relies on the app-level provider.
 *
 * ## Modal Footer
 *
 * - Cancel and Confirm actions are passed to `Modal.footer` so they remain fixed while asphere variable controls scroll.
 */
"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import type { AsphericalType, OpticalModel } from "@/shared/lib/types/opticalModel";
import type { AsphereOptimizationState, AsphereMode, AsphereTermKey } from "@/features/optimization/stores/optimizationStore";
import { ModeSelectField } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  curvatureRadiusNoZeroStraddleRule,
  getThicknessPickupSourceSurfaceOptions,
  minLessThanMaxRule,
  validateVariableBounds,
} from "@/features/optimization/lib/modalHelpers";
import { getVariableModeFieldsRenderer } from "@/features/optimization/lib/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select, type SelectOption } from "@/shared/components/primitives/Select";

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

function isCoefficient(kind: TermKind): kind is { coefficientIndex: number } {
  return typeof kind === "object";
}

function getTermVariableBoundsErrorText(
  term: TermDescriptor,
  mode: AsphereMode,
  usesBounds: boolean,
): string | undefined {
  if (!usesBounds || mode.mode !== "variable") {
    return undefined;
  }

  return validateVariableBounds(term.ariaLabel, mode.min, mode.max, term.kind === "toricSweep"
    ? [minLessThanMaxRule, curvatureRadiusNoZeroStraddleRule]
    : [minLessThanMaxRule]);
}

function getSourceCoefficientOptions(optimizationModel: OpticalModel, sourceSurfaceIndex: string): ReadonlyArray<SelectOption> {
  const sourceSurface = optimizationModel.surfaces[Number.parseInt(sourceSurfaceIndex, 10) - 1];
  const isRadialPolynomial = sourceSurface?.aspherical?.kind === "RadialPolynomial";

  return Array.from({ length: 10 }, (_, index) => {
    const coefficientLabel = isRadialPolynomial ? index + 1 : (index + 1) * 2;
    return {
      value: index,
      label: `a_${coefficientLabel}`,
    };
  });
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

/**
 * Modal dialog for configuring asphere variable and pickup optimization targets for a single surface. Allows the user to select the asphere type (Conic, Even Aspheric, Radial Polynomial, X Toroid, Y Toroid) and set each term (conic constant, polynomial coefficients, toroid sweep radius) to `constant`, `variable`, or `pickup` mode. Keeps changes in local draft state until "Done" is clicked.
 *
 * @remarks
 * ## Behavior
 *
 * - Requires `optimizationModel`, `surfaceIndex`, and `asphereState` before rendering the editor; otherwise renders the closed modal placeholder.
 * - Seeds draft from `asphereState` when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or asphere state changes.
 * - Reuses shared bounded variable validation helpers, shared curvature-radius guidance text, and shared zero-crossing error formatting from `features/optimization/lib/modalHelpers.ts` for term validation copy when `canUseBounds === true`.
 * - Reuses the `ModeSelectField` and `PickupModeFields` nested directory barrels under `features/optimization/components/LensPrescriptionGrid/`, plus the boolean-driven renderer helper in `features/optimization/lib/variableModeFields.tsx`, for the shared term-row mode selector and common variable/pickup field groups, while keeping asphere-specific type switching, term mapping, coefficient pickup wiring, and toroid validation in this modal.
 * - **Type selector**: dropdown with Conic / Even Aspheric / Radial Polynomial / X Toroid / Y Toroid. Disabled when `asphereState.lockedType === true` (surface already has an aspheric configuration from the Editor). Changing the type (when unlocked) resets all term modes to `constant`.
 * - **Term rows** rendered based on selected type:
 * - `Conic`: Conic Constant only
 * - `EvenAspherical`: Conic Constant + a_2, a_4, ..., a_20 (10 coefficients, even-indexed)
 * - `RadialPolynomial`: Conic Constant + a_1, a_2, ..., a_10 (10 coefficients, sequential)
 * - `XToroid` / `YToroid`: Conic Constant + Toroid sweep R + a_2, a_4, ..., a_20
 * - Coefficient row labels are displayed with `MathJax inline` as `\(a_{n}\)` while preserving plain-text accessibility names such as `a_2 mode` and `a_2 Min.` for controls in the same row.
 * - Each term row has a mode selector (`constant` / `variable` / `pickup`).
 * - **variable**:
 * - For `canUseBounds === true`, shows Min and Max `Input` fields inline.
 * - For every bounded variable term, shows the shared inline min/max validation message and disables `Confirm` when either bound is non-finite or the numeric minimum is greater than or equal to the numeric maximum.
 * - For `Toroid sweep R` when `canUseBounds === true`, also shows the shared curvature-radius guidance that `R = 0` is a flat surface (infinite radius), instructs users not to straddle `0`, and shows the shared labeled inline validation message when bounds straddle `0`.
 * - Toroid sweep validation checks min/max ordering before zero-straddling, so only one inline validation message is shown at a time.
 * - For `canUseBounds === false`, renders the unbounded variable body instead of Min./Max. inputs and skips toroid zero-crossing guidance/error copy.
 * - The toroid validation message styling comes from `BoundedVariableModeFields` via `Paragraph` variant `errorMessage`; this modal only supplies layout classes.
 * - **pickup**: shows Source surface as a `Select`, plus Scale and Offset `Input` fields. Source surface options are real surfaces only (`optimizationModel.surfaces.length`) and omit the current target `surfaceIndex`, matching thickness pickup behavior. Switching a term into pickup mode defaults `sourceSurfaceIndex` to the first available source option instead of the target surface. Coefficient rows additionally show a native Source coefficient `Select` with plain-text option labels so iOS Safari can display the native picker correctly. The source coefficient options are based on the selected source surface: `RadialPolynomial` sources show `a_1` through `a_10`; every other source surface, including spherical/no-asphere surfaces, shows `a_2`, `a_4`, ..., `a_20`. Option values remain zero-based coefficient slots `0` through `9`, stored as `sourceTermKey = "coefficient:N"` where `N` may be `0`. Newly selected coefficient pickups default to `sourceTermKey = "coefficient:0"`.
 * - Footer actions: `Cancel` on the left and `Confirm` on the right.
 * - **Cancel button**: closes the modal and discards uncommitted draft changes.
 * - **Confirm button**: when `canUseBounds === true`, disabled when any variable term has non-finite bounds or `min >= max`, and also when `Toroid sweep R` variable bounds straddle `0` (negative min with positive max). Calls `onSave(surfaceIndex, draft)` then `onClose()`.
 * - Clicking or touching outside the modal does not close it.
 * - Pressing `Escape` does not close it.
 */
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
    return getTermVariableBoundsErrorText(term, mode, canUseBounds) !== undefined;
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
      const coefficientSourceTermKey = isCoefficient(term.kind)
        ? { sourceTermKey: current.mode === "pickup" ? (current.sourceTermKey ?? "coefficient:0") : "coefficient:0" as AsphereTermKey }
        : {};
      setDraft(setTermMode(draft, term, {
        mode: "pickup",
        sourceSurfaceIndex: current.mode === "pickup" ? current.sourceSurfaceIndex : defaultSourceSurfaceIndex,
        scale: current.mode === "pickup" ? current.scale : "1",
        offset: current.mode === "pickup" ? current.offset : "0",
        ...coefficientSourceTermKey,
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
    <Modal
      isOpen
      title="Asphere Variable / Pickup"
      size="lg"
      footer={(
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
      )}
    >
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
              const variableBoundsErrorText = getTermVariableBoundsErrorText(term, mode, canUseBounds);
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
                      errorText={variableBoundsErrorText}
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
                        label: "Source coefficient",
                        ariaLabel: `${term.ariaLabel} source coefficient`,
                        value: mode.sourceTermKey?.replace("coefficient:", "") ?? "0",
                        options: getSourceCoefficientOptions(optimizationModel, mode.sourceSurfaceIndex),
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
