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
type EdgeApertureShape = "default" | EdgeAperture["shape"];
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

interface RectangularFieldsProps {
  readonly idPrefix: string;
  readonly ariaPrefix: string;
  readonly xHalfWidth: string;
  readonly yHalfWidth: string;
  readonly rotation: string;
  readonly offsetX: string;
  readonly offsetY: string;
  readonly readOnly: boolean;
  readonly setXHalfWidth: StringSetter;
  readonly setYHalfWidth: StringSetter;
  readonly setRotation: StringSetter;
  readonly setOffsetX: StringSetter;
  readonly setOffsetY: StringSetter;
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

function RectangularFields({
  idPrefix,
  ariaPrefix,
  xHalfWidth,
  yHalfWidth,
  rotation,
  offsetX,
  offsetY,
  readOnly,
  setXHalfWidth,
  setYHalfWidth,
  setRotation,
  setOffsetX,
  setOffsetY,
  clearError,
}: RectangularFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-x-half-width`}>Half-Length</Label>
          <Input
            id={`${idPrefix}-x-half-width`}
            aria-label={`${ariaPrefix} Half-Length`}
            type="text"
            value={xHalfWidth}
            disabled={readOnly}
            onChange={(event) => {
              setXHalfWidth(event.target.value);
              clearError();
            }}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-y-half-width`}>Half-Width</Label>
          <Input
            id={`${idPrefix}-y-half-width`}
            aria-label={`${ariaPrefix} Half-Width`}
            type="text"
            value={yHalfWidth}
            disabled={readOnly}
            onChange={(event) => {
              setYHalfWidth(event.target.value);
              clearError();
            }}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-rotation`}>Rotation (°)</Label>
        <Input
          id={`${idPrefix}-rotation`}
          aria-label={`${ariaPrefix} Rotation`}
          type="text"
          value={rotation}
          disabled={readOnly}
          onChange={(event) => {
            setRotation(event.target.value);
            clearError();
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-offset-x`}>Offset X</Label>
          <Input
            id={`${idPrefix}-offset-x`}
            aria-label={`${ariaPrefix} Offset X`}
            type="text"
            value={offsetX}
            disabled={readOnly}
            onChange={(event) => {
              setOffsetX(event.target.value);
              clearError();
            }}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-offset-y`}>Offset Y</Label>
          <Input
            id={`${idPrefix}-offset-y`}
            aria-label={`${ariaPrefix} Offset Y`}
            type="text"
            value={offsetY}
            disabled={readOnly}
            onChange={(event) => {
              setOffsetY(event.target.value);
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
  rectangular: RectangularFields,
} satisfies {
  readonly circular: React.ComponentType<ClearCircularFieldsProps>;
  readonly annular: React.ComponentType<ClearAnnularFieldsProps>;
  readonly rectangular: React.ComponentType<RectangularFieldsProps>;
};

const EDGE_APERTURE_SHAPE_COMPONENTS = {
  default: EdgeDefaultFields,
  circular: EdgeCircularFields,
  rectangular: RectangularFields,
} satisfies {
  readonly default: React.ComponentType;
  readonly circular: React.ComponentType<EdgeCircularFieldsProps>;
  readonly rectangular: React.ComponentType<RectangularFieldsProps>;
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
  const [clearXHalfWidth, setClearXHalfWidth] = useState(String(
    initialClearAperture?.shape === "rectangular" ? initialClearAperture.xHalfWidth : semiDiameter,
  ));
  const [clearYHalfWidth, setClearYHalfWidth] = useState(String(
    initialClearAperture?.shape === "rectangular" ? initialClearAperture.yHalfWidth : semiDiameter,
  ));
  const [clearRotation, setClearRotation] = useState(String(
    initialClearAperture?.shape === "rectangular" ? initialClearAperture.rotation : 0,
  ));

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

      if (clearShape === "rectangular") {
        const parsedXHalfWidth = parsePositiveFiniteNumber(clearXHalfWidth);
        const parsedYHalfWidth = parsePositiveFiniteNumber(clearYHalfWidth);
        if (parsedXHalfWidth === undefined || parsedYHalfWidth === undefined) {
          return { error: "Half-Length and Half-Width must be greater than 0." };
        }

        const parsedRotation = parseFiniteNumber(clearRotation);
        if (parsedRotation === undefined) {
          return { error: "Rotation must be a finite number." };
        }

        return {
          value: {
            shape: "rectangular",
            xHalfWidth: parsedXHalfWidth,
            yHalfWidth: parsedYHalfWidth,
            rotation: parsedRotation,
            offsetX: parsedClearOffsetX,
            offsetY: parsedClearOffsetY,
          },
        };
      }

      return { value: { shape: "circular", offsetX: parsedClearOffsetX, offsetY: parsedClearOffsetY } };
    },
  }), [clearOffsetX, clearOffsetY, clearRotation, clearShape, clearXHalfWidth, clearYHalfWidth, obstructionRadius, semiDiameter]);

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
            { value: "rectangular", label: "Rectangular" },
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
      ) : clearShape === "rectangular" ? (
        <CLEAR_APERTURE_SHAPE_COMPONENTS.rectangular
          idPrefix="clear-aperture"
          ariaPrefix="Clear"
          xHalfWidth={clearXHalfWidth}
          yHalfWidth={clearYHalfWidth}
          rotation={clearRotation}
          offsetX={clearOffsetX}
          offsetY={clearOffsetY}
          readOnly={readOnly}
          setXHalfWidth={setClearXHalfWidth}
          setYHalfWidth={setClearYHalfWidth}
          setRotation={setClearRotation}
          setOffsetX={setClearOffsetX}
          setOffsetY={setClearOffsetY}
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
  const [edgeRadius, setEdgeRadius] = useState(String(initialEdgeAperture?.shape === "circular" ? initialEdgeAperture.radius : 1));
  const [edgeOffsetX, setEdgeOffsetX] = useState(String(initialEdgeAperture?.offsetX ?? 0));
  const [edgeOffsetY, setEdgeOffsetY] = useState(String(initialEdgeAperture?.offsetY ?? 0));
  const [edgeXHalfWidth, setEdgeXHalfWidth] = useState(String(
    initialEdgeAperture?.shape === "rectangular" ? initialEdgeAperture.xHalfWidth : 1,
  ));
  const [edgeYHalfWidth, setEdgeYHalfWidth] = useState(String(
    initialEdgeAperture?.shape === "rectangular" ? initialEdgeAperture.yHalfWidth : 1,
  ));
  const [edgeRotation, setEdgeRotation] = useState(String(
    initialEdgeAperture?.shape === "rectangular" ? initialEdgeAperture.rotation : 0,
  ));

  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (edgeShape === "default") {
        return { value: undefined };
      }

      const parsedEdgeOffsetX = parseFiniteNumber(edgeOffsetX);
      const parsedEdgeOffsetY = parseFiniteNumber(edgeOffsetY);
      if (parsedEdgeOffsetX === undefined || parsedEdgeOffsetY === undefined) {
        return { error: "Offsets must be finite numbers." };
      }

      if (edgeShape === "rectangular") {
        const parsedXHalfWidth = parsePositiveFiniteNumber(edgeXHalfWidth);
        const parsedYHalfWidth = parsePositiveFiniteNumber(edgeYHalfWidth);
        if (parsedXHalfWidth === undefined || parsedYHalfWidth === undefined) {
          return { error: "Half-Length and Half-Width must be greater than 0." };
        }

        const parsedRotation = parseFiniteNumber(edgeRotation);
        if (parsedRotation === undefined) {
          return { error: "Rotation must be a finite number." };
        }

        return {
          value: {
            shape: "rectangular",
            xHalfWidth: parsedXHalfWidth,
            yHalfWidth: parsedYHalfWidth,
            rotation: parsedRotation,
            offsetX: parsedEdgeOffsetX,
            offsetY: parsedEdgeOffsetY,
          },
        };
      }

      const radius = parsePositiveFiniteNumber(edgeRadius);
      if (radius === undefined) {
        return { error: "Radius must be greater than 0." };
      }

      return { value: { shape: "circular", radius, offsetX: parsedEdgeOffsetX, offsetY: parsedEdgeOffsetY } };
    },
  }), [edgeOffsetX, edgeOffsetY, edgeRadius, edgeRotation, edgeShape, edgeXHalfWidth, edgeYHalfWidth]);

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
            { value: "rectangular", label: "Rectangular" },
          ]}
          onChange={(event) => {
            setEdgeShape(event.target.value as EdgeApertureShape);
            clearError();
          }}
        />
      </div>
      {edgeShape === "rectangular" ? (
        <EDGE_APERTURE_SHAPE_COMPONENTS.rectangular
          idPrefix="edge-aperture"
          ariaPrefix="Edge"
          xHalfWidth={edgeXHalfWidth}
          yHalfWidth={edgeYHalfWidth}
          rotation={edgeRotation}
          offsetX={edgeOffsetX}
          offsetY={edgeOffsetY}
          readOnly={readOnly}
          setXHalfWidth={setEdgeXHalfWidth}
          setYHalfWidth={setEdgeYHalfWidth}
          setRotation={setEdgeRotation}
          setOffsetX={setEdgeOffsetX}
          setOffsetY={setEdgeOffsetY}
          clearError={clearError}
        />
      ) : edgeShape === "circular" ? (
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
