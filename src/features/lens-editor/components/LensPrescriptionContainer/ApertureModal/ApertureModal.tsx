"use client";

import { useState } from "react";
import type React from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import type { ClearAperture, EdgeAperture } from "@/shared/lib/types/opticalModel";

type ClearApertureShape = ClearAperture["shape"];
type EdgeApertureShape = "default" | "circular";
type StringSetter = React.Dispatch<React.SetStateAction<string>>;

interface ApertureConfirmValue {
  readonly clear_aperture: ClearAperture;
  readonly edge_aperture: EdgeAperture | undefined;
}

interface ApertureModalProps {
  readonly isOpen: boolean;
  readonly semiDiameter: number;
  readonly initialClearAperture: ClearAperture | undefined;
  readonly initialEdgeAperture: EdgeAperture | undefined;
  readonly readOnly?: boolean;
  readonly onConfirm: (value: ApertureConfirmValue) => void;
  readonly onClose: () => void;
}

interface ClearApertureShapeComponentProps {
  readonly clearOffsetX: string;
  readonly clearOffsetY: string;
  readonly obstructionRadius: string;
  readonly readOnly: boolean;
  readonly setClearOffsetX: StringSetter;
  readonly setClearOffsetY: StringSetter;
  readonly setObstructionRadius: StringSetter;
  readonly clearError: () => void;
}

interface EdgeApertureShapeComponentProps {
  readonly edgeRadius: string;
  readonly edgeOffsetX: string;
  readonly edgeOffsetY: string;
  readonly readOnly: boolean;
  readonly setEdgeRadius: StringSetter;
  readonly setEdgeOffsetX: StringSetter;
  readonly setEdgeOffsetY: StringSetter;
  readonly clearError: () => void;
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

function ClearCircularFields({
  clearOffsetX,
  clearOffsetY,
  readOnly,
  setClearOffsetX,
  setClearOffsetY,
  clearError,
}: ClearApertureShapeComponentProps) {
  return (
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
            clearError();
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
            clearError();
          }}
        />
      </div>
    </div>
  );
}

function ClearAnnularFields(props: ClearApertureShapeComponentProps) {
  const {
    obstructionRadius,
    readOnly,
    setObstructionRadius,
    clearError,
  } = props;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="clear-aperture-obstruction-radius">Central Obstruction Radius</Label>
        <Input
          id="clear-aperture-obstruction-radius"
          aria-label="Central Obstruction Radius"
          type="text"
          value={obstructionRadius}
          disabled={readOnly}
          onChange={(event) => {
            setObstructionRadius(event.target.value);
            clearError();
          }}
        />
      </div>
      <ClearCircularFields {...props} />
    </div>
  );
}

function EdgeDefaultFields() {
  return undefined;
}

function EdgeCircularFields({
  edgeRadius,
  edgeOffsetX,
  edgeOffsetY,
  readOnly,
  setEdgeRadius,
  setEdgeOffsetX,
  setEdgeOffsetY,
  clearError,
}: EdgeApertureShapeComponentProps) {
  return (
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
            clearError();
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
              clearError();
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
              clearError();
            }}
          />
        </div>
      </div>
    </div>
  );
}

const CLEAR_APERTURE_SHAPE_COMPONENTS: Record<
  ClearApertureShape,
  React.ComponentType<ClearApertureShapeComponentProps>
> = {
  circular: ClearCircularFields,
  annular: ClearAnnularFields,
};

const EDGE_APERTURE_SHAPE_COMPONENTS: Record<
  EdgeApertureShape,
  React.ComponentType<EdgeApertureShapeComponentProps>
> = {
  default: EdgeDefaultFields,
  circular: EdgeCircularFields,
};

export function ApertureModal({
  isOpen,
  semiDiameter,
  initialClearAperture,
  initialEdgeAperture,
  readOnly = false,
  onConfirm,
  onClose,
}: ApertureModalProps) {
  const [clearShape, setClearShape] = useState<ClearApertureShape>(initialClearAperture?.shape ?? "circular");
  const [edgeShape, setEdgeShape] = useState<EdgeApertureShape>(initialEdgeAperture?.shape ?? "default");
  const [edgeRadius, setEdgeRadius] = useState(String(initialEdgeAperture?.radius ?? 1));
  const [obstructionRadius, setObstructionRadius] = useState(String(
    initialClearAperture?.shape === "annular" ? initialClearAperture.obstructionRadius : semiDiameter / 2,
  ));
  const [clearOffsetX, setClearOffsetX] = useState(String(initialClearAperture?.offsetX ?? 0));
  const [clearOffsetY, setClearOffsetY] = useState(String(initialClearAperture?.offsetY ?? 0));
  const [edgeOffsetX, setEdgeOffsetX] = useState(String(initialEdgeAperture?.offsetX ?? 0));
  const [edgeOffsetY, setEdgeOffsetY] = useState(String(initialEdgeAperture?.offsetY ?? 0));
  const [error, setError] = useState<string | undefined>(undefined);
  const ClearShapeComponent = CLEAR_APERTURE_SHAPE_COMPONENTS[clearShape];
  const EdgeShapeComponent = EDGE_APERTURE_SHAPE_COMPONENTS[edgeShape];
  const clearError = () => {
    setError(undefined);
  };

  const handleConfirm = () => {
    const parsedClearOffsetX = parseFiniteNumber(clearOffsetX);
    const parsedClearOffsetY = parseFiniteNumber(clearOffsetY);
    if (parsedClearOffsetX === undefined || parsedClearOffsetY === undefined) {
      setError("Offsets must be finite numbers.");
      return;
    }

    const clear_aperture: ClearAperture | undefined = clearShape === "annular"
      ? (() => {
          const parsedObstructionRadius = parsePositiveFiniteNumber(obstructionRadius);
          if (parsedObstructionRadius === undefined || parsedObstructionRadius >= semiDiameter) {
            setError("Central obstruction radius must be greater than 0 and smaller than the clear aperture radius.");
            return undefined;
          }
          return {
            shape: "annular",
            obstructionRadius: parsedObstructionRadius,
            offsetX: parsedClearOffsetX,
            offsetY: parsedClearOffsetY,
          };
        })()
      : { shape: "circular", offsetX: parsedClearOffsetX, offsetY: parsedClearOffsetY };
    if (clear_aperture === undefined) {
      return;
    }

    if (edgeShape === "default") {
      onConfirm({
        clear_aperture,
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
      clear_aperture,
      edge_aperture: { shape: "circular", radius, offsetX: parsedEdgeOffsetX, offsetY: parsedEdgeOffsetY },
    });
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
              options={[
                { value: "circular", label: "Circular" },
                { value: "annular", label: "Annular" },
              ]}
              onChange={(event) => {
                setClearShape(event.target.value as ClearApertureShape);
                clearError();
              }}
            />
          </div>
          <ClearShapeComponent
            clearOffsetX={clearOffsetX}
            clearOffsetY={clearOffsetY}
            obstructionRadius={obstructionRadius}
            readOnly={readOnly}
            setClearOffsetX={setClearOffsetX}
            setClearOffsetY={setClearOffsetY}
            setObstructionRadius={setObstructionRadius}
            clearError={clearError}
          />
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
                clearError();
              }}
            />
          </div>
          <EdgeShapeComponent
            edgeRadius={edgeRadius}
            edgeOffsetX={edgeOffsetX}
            edgeOffsetY={edgeOffsetY}
            readOnly={readOnly}
            setEdgeRadius={setEdgeRadius}
            setEdgeOffsetX={setEdgeOffsetX}
            setEdgeOffsetY={setEdgeOffsetY}
            clearError={clearError}
          />
        </section>
      </div>
      {error === undefined ? undefined : (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Modal>
  );
}
