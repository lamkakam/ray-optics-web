"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
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
type ClearApertureSectionValue = { readonly value: ClearAperture } | { readonly error: string };
type EdgeApertureSectionValue = { readonly value: EdgeAperture | undefined } | { readonly error: string };

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

interface ClearApertureSectionHandle {
  readonly getValue: () => ClearApertureSectionValue;
}

interface EdgeApertureSectionHandle {
  readonly getValue: () => EdgeApertureSectionValue;
}

interface ClearApertureSectionProps {
  readonly semiDiameter: number;
  readonly initialClearAperture: ClearAperture | undefined;
  readonly readOnly: boolean;
  readonly clearError: () => void;
}

interface EdgeApertureSectionProps {
  readonly initialEdgeAperture: EdgeAperture | undefined;
  readonly readOnly: boolean;
  readonly clearError: () => void;
}

interface ClearCircularFieldsProps {
  readonly clearOffsetX: string;
  readonly clearOffsetY: string;
  readonly readOnly: boolean;
  readonly setClearOffsetX: StringSetter;
  readonly setClearOffsetY: StringSetter;
  readonly clearError: () => void;
}

interface ClearAnnularFieldsProps extends ClearCircularFieldsProps {
  readonly obstructionRadius: string;
  readonly setObstructionRadius: StringSetter;
}

interface EdgeCircularFieldsProps {
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
}: ClearCircularFieldsProps) {
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

function ClearAnnularFields(props: ClearAnnularFieldsProps) {
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
}: EdgeCircularFieldsProps) {
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

const CLEAR_APERTURE_SHAPE_COMPONENTS = {
  circular: ClearCircularFields,
  annular: ClearAnnularFields,
} satisfies {
  readonly circular: React.ComponentType<ClearCircularFieldsProps>;
  readonly annular: React.ComponentType<ClearAnnularFieldsProps>;
};

const EDGE_APERTURE_SHAPE_COMPONENTS = {
  default: EdgeDefaultFields,
  circular: EdgeCircularFields,
} satisfies {
  readonly default: React.ComponentType;
  readonly circular: React.ComponentType<EdgeCircularFieldsProps>;
};

const ClearApertureSection = forwardRef<ClearApertureSectionHandle, ClearApertureSectionProps>(function ClearApertureSection(
  {
    semiDiameter,
    initialClearAperture,
    readOnly,
    clearError,
  },
  ref,
) {
  const [clearShape, setClearShape] = useState<ClearApertureShape>(initialClearAperture?.shape ?? "circular");
  const [obstructionRadius, setObstructionRadius] = useState(String(
    initialClearAperture?.shape === "annular" ? initialClearAperture.obstructionRadius : semiDiameter / 2,
  ));
  const [clearOffsetX, setClearOffsetX] = useState(String(initialClearAperture?.offsetX ?? 0));
  const [clearOffsetY, setClearOffsetY] = useState(String(initialClearAperture?.offsetY ?? 0));

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const parsedClearOffsetX = parseFiniteNumber(clearOffsetX);
      const parsedClearOffsetY = parseFiniteNumber(clearOffsetY);
      if (parsedClearOffsetX === undefined || parsedClearOffsetY === undefined) {
        return { error: "Offsets must be finite numbers." };
      }

      if (clearShape === "annular") {
        const parsedObstructionRadius = parsePositiveFiniteNumber(obstructionRadius);
        if (parsedObstructionRadius === undefined || parsedObstructionRadius >= semiDiameter) {
          return { error: "Central obstruction radius must be greater than 0 and smaller than the clear aperture radius." };
        }

        return {
          value: {
            shape: "annular",
            obstructionRadius: parsedObstructionRadius,
            offsetX: parsedClearOffsetX,
            offsetY: parsedClearOffsetY,
          },
        };
      }

      return { value: { shape: "circular", offsetX: parsedClearOffsetX, offsetY: parsedClearOffsetY } };
    },
  }), [clearOffsetX, clearOffsetY, clearShape, obstructionRadius, semiDiameter]);

  return (
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
      {clearShape === "annular" ? (
        <CLEAR_APERTURE_SHAPE_COMPONENTS.annular
          clearOffsetX={clearOffsetX}
          clearOffsetY={clearOffsetY}
          obstructionRadius={obstructionRadius}
          readOnly={readOnly}
          setClearOffsetX={setClearOffsetX}
          setClearOffsetY={setClearOffsetY}
          setObstructionRadius={setObstructionRadius}
          clearError={clearError}
        />
      ) : (
        <CLEAR_APERTURE_SHAPE_COMPONENTS.circular
          clearOffsetX={clearOffsetX}
          clearOffsetY={clearOffsetY}
          readOnly={readOnly}
          setClearOffsetX={setClearOffsetX}
          setClearOffsetY={setClearOffsetY}
          clearError={clearError}
        />
      )}
    </section>
  );
});

const EdgeApertureSection = forwardRef<EdgeApertureSectionHandle, EdgeApertureSectionProps>(function EdgeApertureSection(
  {
    initialEdgeAperture,
    readOnly,
    clearError,
  },
  ref,
) {
  const [edgeShape, setEdgeShape] = useState<EdgeApertureShape>(initialEdgeAperture?.shape ?? "default");
  const [edgeRadius, setEdgeRadius] = useState(String(initialEdgeAperture?.radius ?? 1));
  const [edgeOffsetX, setEdgeOffsetX] = useState(String(initialEdgeAperture?.offsetX ?? 0));
  const [edgeOffsetY, setEdgeOffsetY] = useState(String(initialEdgeAperture?.offsetY ?? 0));

  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (edgeShape === "default") {
        return { value: undefined };
      }

      const radius = parsePositiveFiniteNumber(edgeRadius);
      if (radius === undefined) {
        return { error: "Radius must be greater than 0." };
      }

      const parsedEdgeOffsetX = parseFiniteNumber(edgeOffsetX);
      const parsedEdgeOffsetY = parseFiniteNumber(edgeOffsetY);
      if (parsedEdgeOffsetX === undefined || parsedEdgeOffsetY === undefined) {
        return { error: "Offsets must be finite numbers." };
      }

      return { value: { shape: "circular", radius, offsetX: parsedEdgeOffsetX, offsetY: parsedEdgeOffsetY } };
    },
  }), [edgeOffsetX, edgeOffsetY, edgeRadius, edgeShape]);

  return (
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
      {edgeShape === "circular" ? (
        <EDGE_APERTURE_SHAPE_COMPONENTS.circular
          edgeRadius={edgeRadius}
          edgeOffsetX={edgeOffsetX}
          edgeOffsetY={edgeOffsetY}
          readOnly={readOnly}
          setEdgeRadius={setEdgeRadius}
          setEdgeOffsetX={setEdgeOffsetX}
          setEdgeOffsetY={setEdgeOffsetY}
          clearError={clearError}
        />
      ) : (
        <EDGE_APERTURE_SHAPE_COMPONENTS.default />
      )}
    </section>
  );
});

export function ApertureModal({
  isOpen,
  semiDiameter,
  initialClearAperture,
  initialEdgeAperture,
  readOnly = false,
  onConfirm,
  onClose,
}: ApertureModalProps) {
  const clearSectionRef = useRef<ClearApertureSectionHandle>(null);
  const edgeSectionRef = useRef<EdgeApertureSectionHandle>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const clearError = () => {
    setError(undefined);
  };

  const handleConfirm = () => {
    const clearResult = clearSectionRef.current?.getValue();
    if (clearResult === undefined) {
      return;
    }
    if ("error" in clearResult) {
      setError(clearResult.error);
      return;
    }

    const edgeResult = edgeSectionRef.current?.getValue();
    if (edgeResult === undefined) {
      return;
    }
    if ("error" in edgeResult) {
      setError(edgeResult.error);
      return;
    }

    onConfirm({
      clear_aperture: clearResult.value,
      edge_aperture: edgeResult.value,
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
        <ClearApertureSection
          ref={clearSectionRef}
          semiDiameter={semiDiameter}
          initialClearAperture={initialClearAperture}
          readOnly={readOnly}
          clearError={clearError}
        />
        <EdgeApertureSection
          ref={edgeSectionRef}
          initialEdgeAperture={initialEdgeAperture}
          readOnly={readOnly}
          clearError={clearError}
        />
      </div>
      {error === undefined ? undefined : (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Modal>
  );
}
