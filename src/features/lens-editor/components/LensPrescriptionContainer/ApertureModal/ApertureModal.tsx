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
  const [error, setError] = useState<string | undefined>(undefined);

  const handleConfirm = () => {
    if (edgeShape === "default") {
      onConfirm({
        clear_aperture: { shape: clearShape },
        edge_aperture: undefined,
      });
      return;
    }

    const radius = parsePositiveFiniteNumber(edgeRadius);
    if (radius === undefined) {
      setError("Radius must be greater than 0.");
      return;
    }

    onConfirm({
      clear_aperture: { shape: clearShape },
      edge_aperture: { shape: "circular", radius },
    });
  };

  const clearShapeContent: Record<ClearApertureShape, React.ReactNode> = {
    circular: undefined,
  };
  const edgeShapeContent: Record<EdgeApertureShape, React.ReactNode> = {
    default: undefined,
    circular: (
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
        {error === undefined ? undefined : (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
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
    </Modal>
  );
}
