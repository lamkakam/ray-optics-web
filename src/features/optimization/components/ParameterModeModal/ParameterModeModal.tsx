"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import { ModeSelectField } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields";
import {
  PARAMETER_MODE_UI,
  type ParameterModeUi,
} from "@/features/optimization/components/ParameterModeModal/parameterModeUi";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  createPickupDraft,
  createVariableDraft,
  curvatureRadiusNoZeroStraddleRule,
  minLessThanMaxRule,
  validateVariableBounds,
} from "@/features/optimization/lib/modalHelpers";
import { getRadiusLabel } from "@/features/optimization/lib/optimizationViewModels";
import {
  PARAMETER_GROUPS,
  type ParameterComponent,
  type ParameterGroupKey,
  type ParameterGroupSpec,
} from "@/features/optimization/lib/parameters/parameterGroups";
import {
  getParameterMode,
  withParameterMode,
  type ParameterGroupState,
  type ParameterMode,
} from "@/features/optimization/lib/parameters/parameterStates";
import { getVariableModeFieldsRenderer } from "@/features/optimization/components/ParameterModeModal/fields/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";

interface ParameterModeModalProps {
  readonly isOpen: boolean;
  /** Parameter group being edited, or `undefined` when no parameter modal is open. */
  readonly group: ParameterGroupKey | undefined;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  /** Committed state of the target surface within `group`. */
  readonly state: ParameterGroupState | undefined;
  readonly canUseBounds?: boolean;
  /** Receives the complete edited state on Confirm. */
  readonly onSave: (
    group: ParameterGroupKey,
    surfaceIndex: number,
    state: ParameterGroupState,
  ) => void;
  readonly onClose: () => void;
}

/**
 * Edits the constant/variable/pickup modes of one surface within a parameter
 * group in a cancelable local draft. Presentation comes from
 * `PARAMETER_MODE_UI`, components and rules from `PARAMETER_GROUPS`.
 *
 * @remarks
 * ## Behavior
 *
 * - Remounts a keyed inner editor whenever the target group, surface, or committed state changes, so the draft always starts from the committed state.
 * - Single-component groups (radius, thickness) show `<surface label> <noun>: <value>`, a labeled mode selector, variable bounds seeded with the current value, and pickups defaulting to source surface `1`, scale `1`, offset `0`.
 * - Multi-component groups (asphere, tilt/decenter) show a `Type` qualifier selector, disabled when the editor locks the qualifier; changing it resets every component to constant. Each component row keeps prior variable bounds or pickup fields when its mode is switched, otherwise starts variables at `0`/`0` and pickups at the first source option, scale `1`, offset `0`. Coefficient pickups also pick a source coefficient (default slot `0`).
 * - Pickup source choices exclude the target surface and include the Image plane only for image-capable groups.
 * - With bounds (`canUseBounds`), shows the first bounds error per component: Min. must be less than Max., and radius-like components (radius, toric sweep radius) must not straddle `0` and show flat-surface guidance. Any error disables Confirm. Without bounds, Min./Max. inputs and guidance are hidden.
 * - Cancel discards the draft. Confirm commits the complete state through `onSave(group, surfaceIndex, state)` and closes. Clicking outside or pressing `Escape` does not close the modal.
 */
export function ParameterModeModal({
  isOpen,
  group,
  optimizationModel,
  surfaceIndex,
  state,
  canUseBounds = true,
  onSave,
  onClose,
}: ParameterModeModalProps) {
  if (
    !isOpen ||
    group === undefined ||
    optimizationModel === undefined ||
    surfaceIndex === undefined ||
    state === undefined
  ) {
    return (
      <Modal
        isOpen={false}
        title={group === undefined ? "" : PARAMETER_MODE_UI[group].title}
      />
    );
  }

  return (
    <ParameterModeEditor
      key={`${group}:${surfaceIndex}:${JSON.stringify(state)}`}
      group={group}
      model={optimizationModel}
      surfaceIndex={surfaceIndex}
      state={state}
      canUseBounds={canUseBounds}
      onSave={onSave}
      onClose={onClose}
    />
  );
}

interface EditorProps {
  readonly group: ParameterGroupKey;
  readonly model: OpticalModel;
  readonly surfaceIndex: number;
  readonly state: ParameterGroupState;
  readonly canUseBounds: boolean;
  readonly onSave: ParameterModeModalProps["onSave"];
  readonly onClose: () => void;
}

function boundsErrorText(
  component: ParameterComponent,
  label: string,
  mode: ParameterMode,
  canUseBounds: boolean,
): string | undefined {
  if (!canUseBounds || mode.mode !== "variable") return undefined;
  return validateVariableBounds(
    label,
    mode.min,
    mode.max,
    component.rejectsZeroStraddle
      ? [minLessThanMaxRule, curvatureRadiusNoZeroStraddleRule]
      : [minLessThanMaxRule],
  );
}

function ParameterModeEditor({
  group,
  model,
  surfaceIndex,
  state,
  canUseBounds,
  onSave,
  onClose,
}: EditorProps) {
  const ui = PARAMETER_MODE_UI[group] as ParameterModeUi<ParameterGroupKey>;
  const spec = PARAMETER_GROUPS[group] as ParameterGroupSpec<ParameterGroupKey>;
  const [draft, setDraft] = React.useState(state);
  const VariableFields = getVariableModeFieldsRenderer(canUseBounds);
  const sourceOptions = React.useMemo(
    () => ui.sourceOptions(model, surfaceIndex),
    [ui, model, surfaceIndex],
  );
  const groupComponents = spec.components(draft.qualifier as never);
  const components = ui.orderComponents?.(groupComponents) ?? groupComponents;
  const isSingle = ui.currentValue !== undefined;
  const currentValue = ui.currentValue?.read(model, surfaceIndex) ?? 0;

  const setMode = (componentKey: string, mode: ParameterMode) =>
    setDraft((current) => withParameterMode(current, componentKey, mode));

  const changeMode = (
    component: ParameterComponent,
    next: ParameterMode["mode"],
  ) => {
    const current = getParameterMode(draft, component.key);
    if (next === "constant") {
      setMode(component.key, { mode: "constant" });
    } else if (next === "variable") {
      setMode(
        component.key,
        isSingle
          ? createVariableDraft(currentValue)
          : {
              mode: "variable",
              min: current.mode === "variable" ? current.min : "0",
              max: current.mode === "variable" ? current.max : "0",
            },
      );
    } else if (isSingle) {
      setMode(component.key, createPickupDraft());
    } else {
      setMode(component.key, {
        mode: "pickup",
        sourceSurfaceIndex:
          current.mode === "pickup"
            ? current.sourceSurfaceIndex
            : String(sourceOptions[0]?.value ?? ""),
        scale: current.mode === "pickup" ? current.scale : "1",
        offset: current.mode === "pickup" ? current.offset : "0",
        ...(component.picksUpCoefficient
          ? {
              sourceTermKey:
                current.mode === "pickup"
                  ? (current.sourceTermKey ?? "coefficient:0")
                  : "coefficient:0",
            }
          : {}),
      });
    }
  };

  const rows = components.map((component) => {
    const labels = ui.componentLabels(component, draft.qualifier as never);
    const mode = getParameterMode(draft, component.key);
    return {
      component,
      labels,
      mode,
      errorText: boundsErrorText(
        component,
        labels.boundsLabel,
        mode,
        canUseBounds,
      ),
    };
  });
  const invalid = rows.some(({ errorText }) => errorText !== undefined);

  return (
    <Modal
      isOpen
      title={ui.title}
      size={ui.size}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={invalid}
            onClick={() => {
              onSave(group, surfaceIndex, draft);
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {ui.currentValue !== undefined ? (
          <Paragraph>
            {getRadiusLabel(surfaceIndex, model)} {ui.currentValue.noun}:{" "}
            {currentValue}
          </Paragraph>
        ) : null}

        {ui.qualifierSelect !== undefined ? (
          <div>
            <Label htmlFor={ui.qualifierSelect.id}>Type</Label>
            <Select
              id={ui.qualifierSelect.id}
              aria-label={ui.qualifierSelect.ariaLabel}
              value={(draft.qualifier as string | undefined) ?? ""}
              disabled={draft.lockedQualifier}
              options={ui.qualifierSelect.options}
              placeholder={ui.qualifierSelect.placeholder}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  qualifier: event.target.value as never,
                  modes: {},
                })
              }
            />
          </div>
        ) : null}

        <div className={isSingle ? "space-y-4" : "space-y-3"}>
          {rows.map(({ component, labels, mode, errorText }) => {
            const rowClassName = isSingle ? undefined : "ml-36 grid gap-3 pl-3";
            return (
              <div key={component.key} className="space-y-2">
                {isSingle ? (
                  <ModeSelectField
                    id={labels.modeId}
                    label={labels.modeLabel}
                    ariaLabel={labels.modeAriaLabel}
                    value={mode.mode}
                    onChange={(next) => changeMode(component, next)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm font-medium">
                      {labels.displayLabel}
                    </span>
                    <ModeSelectField
                      id={labels.modeId}
                      ariaLabel={labels.modeAriaLabel}
                      value={mode.mode}
                      onChange={(next) => changeMode(component, next)}
                    />
                  </div>
                )}

                {mode.mode === "variable" ? (
                  <VariableFields.Component
                    idPrefix={labels.variableIdPrefix}
                    minAriaLabel={labels.minAriaLabel}
                    minValue={mode.min}
                    maxAriaLabel={labels.maxAriaLabel}
                    maxValue={mode.max}
                    onMinChange={(value) =>
                      setMode(component.key, { ...mode, min: value })
                    }
                    onMaxChange={(value) =>
                      setMode(component.key, { ...mode, max: value })
                    }
                    guidanceText={
                      canUseBounds && component.rejectsZeroStraddle
                        ? CURVATURE_RADIUS_GUIDANCE_TEXT
                        : undefined
                    }
                    errorText={errorText}
                    className={rowClassName}
                    inputRowClassName={
                      isSingle ? undefined : "grid gap-3 md:grid-cols-2"
                    }
                    helperTextClassName={isSingle ? undefined : "md:col-span-2"}
                    errorTextClassName={isSingle ? undefined : "md:col-span-2"}
                  />
                ) : null}

                {mode.mode === "pickup" ? (
                  <PickupModeFields
                    idPrefix={labels.pickupIdPrefix}
                    sourceSurfaceLabel="Source surface"
                    sourceSurfaceAriaLabel={labels.sourceAriaLabel}
                    sourceSurfaceValue={mode.sourceSurfaceIndex}
                    sourceSurfaceOptions={sourceOptions}
                    onSourceSurfaceChange={(value) =>
                      setMode(component.key, {
                        ...mode,
                        sourceSurfaceIndex: value,
                      })
                    }
                    scaleLabel={labels.scaleLabel}
                    scaleAriaLabel={labels.scaleAriaLabel}
                    scaleValue={mode.scale}
                    onScaleChange={(value) =>
                      setMode(component.key, { ...mode, scale: value })
                    }
                    offsetLabel={labels.offsetLabel}
                    offsetAriaLabel={labels.offsetAriaLabel}
                    offsetValue={mode.offset}
                    onOffsetChange={(value) =>
                      setMode(component.key, { ...mode, offset: value })
                    }
                    extraField={
                      component.picksUpCoefficient &&
                      ui.sourceCoefficientOptions !== undefined
                        ? {
                            idSuffix: "source-coeff",
                            label: "Source coefficient",
                            ariaLabel: `${labels.boundsLabel} source coefficient`,
                            value:
                              mode.sourceTermKey?.replace("coefficient:", "") ??
                              "0",
                            options: ui.sourceCoefficientOptions(
                              model,
                              mode.sourceSurfaceIndex,
                            ),
                            onChange: (value) =>
                              setMode(component.key, {
                                ...mode,
                                sourceTermKey: `coefficient:${value}`,
                              }),
                          }
                        : undefined
                    }
                    className={rowClassName}
                    scaleOffsetLayout={isSingle ? undefined : "two-column"}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
