"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getThicknessValue } from "@/features/optimization/components/optimizationViewModels";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";

type VariableChoice = "constant" | "variable" | "pickup";

interface ThicknessModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

export function ThicknessModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  onSetMode,
  onClose,
}: ThicknessModeModalProps) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined) {
    return (
      <Modal isOpen={false} title="Thickness Variable / Pickup">
        <></>
      </Modal>
    );
  }

  const thicknessValue = getThicknessValue(optimizationModel, surfaceIndex);

  return (
    <Modal
      isOpen
      title="Thickness Variable / Pickup"
      onBackdropClick={onClose}
    >
      <div className="space-y-4">
        <Paragraph>
          {getRadiusLabel(surfaceIndex, optimizationModel)} thickness: {thicknessValue}
        </Paragraph>
        <div>
          <Label htmlFor="thickness-mode">Mode</Label>
          <Select
            id="thickness-mode"
            aria-label="Thickness mode"
            value={selectedMode.mode}
            options={[
              { label: "constant", value: "constant" },
              { label: "variable", value: "variable" },
              { label: "pickup", value: "pickup" },
            ]}
            onChange={(event) => {
              const mode = event.target.value as VariableChoice;
              if (mode === "constant") {
                onSetMode(surfaceIndex, { mode });
                return;
              }

              if (mode === "variable") {
                onSetMode(surfaceIndex, {
                  mode,
                  min: String(thicknessValue),
                  max: String(thicknessValue),
                });
                return;
              }

              onSetMode(surfaceIndex, {
                mode,
                sourceSurfaceIndex: "1",
                scale: "1",
                offset: "0",
              });
            }}
          />
        </div>

        {selectedMode.mode === "variable" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="thickness-min">Min.</Label>
              <Input
                id="thickness-min"
                aria-label="Thickness Min."
                value={selectedMode.min}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "variable",
                  min: event.target.value,
                  max: selectedMode.max,
                })}
              />
            </div>
            <div>
              <Label htmlFor="thickness-max">Max.</Label>
              <Input
                id="thickness-max"
                aria-label="Thickness Max."
                value={selectedMode.max}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "variable",
                  min: selectedMode.min,
                  max: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        {selectedMode.mode === "pickup" ? (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pickup-thickness-source">Source surface index</Label>
              <Input
                id="pickup-thickness-source"
                aria-label="Thickness source surface index"
                value={selectedMode.sourceSurfaceIndex}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: event.target.value,
                  scale: selectedMode.scale,
                  offset: selectedMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-thickness-scale">scale</Label>
              <Input
                id="pickup-thickness-scale"
                aria-label="Thickness scale"
                value={selectedMode.scale}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: selectedMode.sourceSurfaceIndex,
                  scale: event.target.value,
                  offset: selectedMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-thickness-offset">offset</Label>
              <Input
                id="pickup-thickness-offset"
                aria-label="Thickness offset"
                value={selectedMode.offset}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: selectedMode.sourceSurfaceIndex,
                  scale: selectedMode.scale,
                  offset: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
