"use client";

import { useState } from "react";
import type React from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import type { ClearAperture, EdgeAperture } from "@/shared/lib/types/opticalModel";

type ClearApertureShape = "circular";
type EdgeApertureShape = "default" | "circular";

interface ApertureConfirmValue {
  readonly clear_aperture: ClearAperture;
  readonly edge_aperture: EdgeAperture | undefined;
}

interface ApertureModalProps {
  readonly isOpen: boolean;
  readonly initialClearAperture: ClearAperture | undefined;
  readonly initialEdgeAperture: EdgeAperture | undefined;
  readonly readOnly?: boolean;
  readonly onConfirm: (value: ApertureConfirmValue) => void;
  readonly onClose: () => void;
}

function parsePositiveFiniteNumber(value: string): number | undefined {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseFiniteNumber(value: string): number | undefined {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  return trimmed !== "" && Number.isFinite(parsed) ? parsed : undefined;
}

export function ApertureModal({
  isOpen,
  initialClearAperture,
  initialEdgeAperture,
  readOnly = false,
  onConfirm,
  onClose,
}: ApertureModalProps) {
  const [clearShape, setClearShape] = useState<ClearApertureShape>(initialClearAperture?.shape ?? "circular");
  const [edgeShape, setEdgeShape] = useState<EdgeApertureShape>(initialEdgeAperture?.shape ?? "default");
  const [edgeRadius, setEdgeRadius] = useState(String(initialEdgeAperture?.radius ?? 1));
  const [clearOffsetX, setClearOffsetX] = useState(String(initialClearAperture?.offsetX ?? 0));
  const [clearOffsetY, setClearOffsetY] = useState(String(initialClearAperture?.offsetY ?? 0));
  const [edgeOffsetX, setEdgeOffsetX] = useState(String(initialEdgeAperture?.offsetX ?? 0));
  const [edgeOffsetY, setEdgeOffsetY] = useState(String(initialEdgeAperture?.offsetY ?? 0));
  const [error, setError] = useState<string | undefined>(undefined);

  const handleConfirm = () => {
    const parsedClearOffsetX = parseFiniteNumber(clearOffsetX);
    const parsedClearOffsetY = parseFiniteNumber(clearOffsetY);
    if (parsedClearOffsetX === undefined || parsedClearOffsetY === undefined) {
      setError("Offsets must be finite numbers.");
      return;
    }

    if (edgeShape === "default") {
      onConfirm({
        clear_aperture: { shape: clearShape, offsetX: parsedClearOffsetX, offsetY: parsedClearOffsetY },
        edge_aperture: undefined,
      });
      return;
    }

    const radius = parsePositiveFiniteNumber(edgeRadius);
    if (radius === undefined) {
      setError("Radius must be greater than 0.");
      return;
    }

    const parsedEdgeOffsetX = parseFiniteNumber(edgeOffsetX);
    const parsedEdgeOffsetY = parseFiniteNumber(edgeOffsetY);
    if (parsedEdgeOffsetX === undefined || parsedEdgeOffsetY === undefined) {
      setError("Offsets must be finite numbers.");
      return;
    }

    onConfirm({
      clear_aperture: { shape: clearShape, offsetX: parsedClearOffsetX, offsetY: parsedClearOffsetY },
      edge_aperture: { shape: "circular", radius, offsetX: parsedEdgeOffsetX, offsetY: parsedEdgeOffsetY },
    });
  };

  const clearShapeContent: Record<ClearApertureShape, React.ReactNode> = {
    circular: (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="clear-aperture-offset-x">Offset X</Label>
          <Input
            id="clear-aperture-offset-x"
            aria-label="Clear Offset X"
            type="text"
            value={clearOffsetX}
            disabled={readOnly}
            onChange={(event) => {
              setClearOffsetX(event.target.value);
              setError(undefined);
            }}
          />
        </div>
        <div>
          <Label htmlFor="clear-aperture-offset-y">Offset Y</Label>
          <Input
            id="clear-aperture-offset-y"
            aria-label="Clear Offset Y"
            type="text"
            value={clearOffsetY}
            disabled={readOnly}
            onChange={(event) => {
              setClearOffsetY(event.target.value);
              setError(undefined);
            }}
          />
        </div>
      </div>
    ),
  };
  const edgeShapeContent: Record<EdgeApertureShape, React.ReactNode> = {
    default: undefined,
    circular: (
      <div className="space-y-3">
        <div>
          <Label htmlFor="edge-aperture-radius">Radius</Label>
          <Input
            id="edge-aperture-radius"
            aria-label="Radius"
            type="text"
            value={edgeRadius}
            disabled={readOnly}
            onChange={(event) => {
              setEdgeRadius(event.target.value);
              setError(undefined);
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="edge-aperture-offset-x">Offset X</Label>
            <Input
              id="edge-aperture-offset-x"
              aria-label="Edge Offset X"
              type="text"
              value={edgeOffsetX}
              disabled={readOnly}
              onChange={(event) => {
                setEdgeOffsetX(event.target.value);
                setError(undefined);
              }}
            />
          </div>
          <div>
            <Label htmlFor="edge-aperture-offset-y">Offset Y</Label>
            <Input
              id="edge-aperture-offset-y"
              aria-label="Edge Offset Y"
              type="text"
              value={edgeOffsetY}
              disabled={readOnly}
              onChange={(event) => {
                setEdgeOffsetY(event.target.value);
                setError(undefined);
              }}
            />
          </div>
        </div>
      </div>
    ),
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Aperture"
      titleId="aperture-modal-title"
      size="lg"
      footer={(
        <div className="flex items-center gap-3">
          {readOnly ? (
            <div className="flex w-full justify-end">
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
              <span className="flex-1" />
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
            </>
          )}
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clear Aperture</h3>
          <div>
            <Label htmlFor="clear-aperture-shape">Aperture Shape</Label>
            <Select
              id="clear-aperture-shape"
              aria-label="Clear Aperture Shape"
              value={clearShape}
              disabled={readOnly}
              options={[{ value: "circular", label: "Circular" }]}
              onChange={(event) => setClearShape(event.target.value as ClearApertureShape)}
            />
          </div>
          {clearShapeContent[clearShape]}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Edge Aperture</h3>
          <div>
            <Label htmlFor="edge-aperture-shape">Aperture Shape</Label>
            <Select
              id="edge-aperture-shape"
              aria-label="Edge Aperture Shape"
              value={edgeShape}
              disabled={readOnly}
              options={[
                { value: "default", label: "Default (Follow Clear Aperture)" },
                { value: "circular", label: "Circular" },
              ]}
              onChange={(event) => {
                setEdgeShape(event.target.value as EdgeApertureShape);
                setError(undefined);
              }}
            />
          </div>
          {edgeShapeContent[edgeShape]}
        </section>
      </div>
      {error === undefined ? undefined : (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Modal>
  );
}
