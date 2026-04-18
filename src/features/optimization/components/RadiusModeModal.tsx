"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getRadiusValue } from "@/features/optimization/components/optimizationViewModels";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";

type VariableChoice = "constant" | "variable" | "pickup";

interface RadiusModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

function toDraft(mode: RadiusMode): RadiusModeDraft {
  switch (mode.mode) {
    case "constant":
      return { mode: "constant" };
    case "variable":
      return {
        mode: "variable",
        min: mode.min,
        max: mode.max,
      };
    case "pickup":
      return {
        mode: "pickup",
        sourceSurfaceIndex: mode.sourceSurfaceIndex,
        scale: mode.scale,
        offset: mode.offset,
      };
  }
}

export function RadiusModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  onSetMode,
  onClose,
}: RadiusModeModalProps) {
  const [draftMode, setDraftMode] = React.useState<RadiusModeDraft | undefined>(undefined);

  React.useEffect(() => {
    if (!isOpen || surfaceIndex === undefined || selectedMode === undefined) {
      setDraftMode(undefined);
      return;
    }

    setDraftMode(toDraft(selectedMode));
  }, [isOpen, selectedMode, surfaceIndex]);

  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined || draftMode === undefined) {
    return (
      <Modal isOpen={false} title="Radius Variable / Pickup">
        <></>
      </Modal>
    );
  }

  const radiusValue = getRadiusValue(optimizationModel, surfaceIndex);
  const variableBoundsCrossZero = draftMode.mode === "variable"
    && crossesZero(draftMode.min, draftMode.max);

  return (
    <Modal
      isOpen
      title="Radius Variable / Pickup"
    >
      <div className="space-y-4">
        <Paragraph>
          {getRadiusLabel(surfaceIndex, optimizationModel)} radius: {radiusValue}
        </Paragraph>
        <div>
          <Label htmlFor="radius-mode">Mode</Label>
          <Select
            id="radius-mode"
            aria-label="Radius mode"
            value={draftMode.mode}
            options={[
              { label: "constant", value: "constant" },
              { label: "variable", value: "variable" },
              { label: "pickup", value: "pickup" },
            ]}
            onChange={(event) => {
              const mode = event.target.value as VariableChoice;
              if (mode === "constant") {
                setDraftMode({ mode });
                return;
              }

              if (mode === "variable") {
                setDraftMode({
                  mode,
                  min: String(radiusValue),
                  max: String(radiusValue),
                });
                return;
              }

              setDraftMode({
                mode,
                sourceSurfaceIndex: "1",
                scale: "1",
                offset: "0",
              });
            }}
          />
        </div>

        {draftMode.mode === "variable" ? (
          <div className="grid gap-3">
            <Paragraph variant="caption">
              R = 0 means a flat surface (infinite radius).
            </Paragraph>
            <Paragraph variant="caption">
              Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.
            </Paragraph>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="radius-min">Min.</Label>
                <Input
                  id="radius-min"
                  aria-label="Min."
                  value={draftMode.min}
                  onChange={(event) => setDraftMode({
                    mode: "variable",
                    min: event.target.value,
                    max: draftMode.max,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="radius-max">Max.</Label>
                <Input
                  id="radius-max"
                  aria-label="Max."
                  value={draftMode.max}
                  onChange={(event) => setDraftMode({
                    mode: "variable",
                    min: draftMode.min,
                    max: event.target.value,
                  })}
                />
              </div>
            </div>
            {variableBoundsCrossZero ? (
              <Paragraph variant="caption" className="text-red-600 dark:text-red-400">
                Radius variable bounds must stay on one side of 0.
              </Paragraph>
            ) : null}
          </div>
        ) : null}

        {draftMode.mode === "pickup" ? (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pickup-source">Source surface index</Label>
              <Input
                id="pickup-source"
                aria-label="Source surface index"
                value={draftMode.sourceSurfaceIndex}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: event.target.value,
                  scale: draftMode.scale,
                  offset: draftMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-scale">scale</Label>
              <Input
                id="pickup-scale"
                aria-label="scale"
                value={draftMode.scale}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
                  scale: event.target.value,
                  offset: draftMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-offset">offset</Label>
              <Input
                id="pickup-offset"
                aria-label="offset"
                value={draftMode.offset}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
                  scale: draftMode.scale,
                  offset: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={variableBoundsCrossZero}
            onClick={() => {
              onSetMode(surfaceIndex, draftMode);
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

function crossesZero(minValue: string, maxValue: string): boolean {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }

  return min < 0 && max > 0;
}
