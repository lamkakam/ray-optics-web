/**
# `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx`

Reusable prescription grid cell UI that is safe for `shared/` because it depends only on shared primitives.

## Behavior

- All tooltips use `portal` and `noTouch` for AG Grid compatibility.
- Medium, aspherical, decenter, and diffraction grating tooltip-backed action cells do not apply `touch-action: none`, so native touch scrolling can start over those controls in iOS Safari.
- Medium, aspherical, decenter, and diffraction grating cells use `triggerClassName="flex h-full w-full"` so the tooltip trigger fills the cell action area.
- Medium, aperture, aspherical, decenter, and diffraction grating action cell text renders on a single line and uses an ellipsis when it exceeds the available cell width.
- Empty aspherical, decenter, and diffraction grating values display `None`.
- Aperture values are formatted from both `clear_aperture` and `edge_aperture`: missing clear aperture and centered circular clear aperture display `Default` when edge aperture is missing/default; circular clear aperture with nonzero offset displays `Cir offset (<x>, <y>)`; annular clear aperture displays `Annu obs <radius>` with an optional offset suffix; explicit circular edge aperture appends `; Edge Cir <radius>` with an optional offset suffix.
- Aspherical values display the shared asphere type label (`Conic`, `Even Aspherical`, `Radial Polynomial`, `X Toroid`, `Y Toroid`).
- Decenter values display `coordinateSystemStrategy` directly.
- Diffraction grating values display `${lpmm} lp/mm`.
- Default tooltip copy preserves the Lens Editor wording.
- Optimization passes view-oriented tooltip copy through the shared column builders.*/
"use client";

import React from "react";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import {
  formatAsphericalLabel,
  formatApertureLabel,
  formatDecenterLabel,
  formatDiffractionGratingLabel,
} from "@/shared/lib/lens-prescription-grid/displayLabels";
import type {
  ClearAperture,
  DecenterConfig,
  DiffractionGrating,
  EdgeAperture,
  Surface,
} from "@/shared/lib/types/opticalModel";

interface ActionWrapperProps {
  readonly children: React.ReactNode;
  readonly onAction: () => void;
}

export function LensPrescriptionActionWrapper({ children, onAction }: ActionWrapperProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea") !== null) {
      return;
    }

    onAction();
  };

  return (
    <div
      data-cell-wrapper
      className="flex h-full w-full cursor-pointer items-center"
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

interface MediumCellProps {
  readonly medium: string;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function MediumCell({
  medium,
  onOpenModal,
  tooltipText = "Click to set medium or glass",
}: MediumCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch triggerClassName="flex h-full w-full">
      <button
        type="button"
        aria-label="Edit medium"
        className="w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-left"
        onClick={onOpenModal}
      >
        {medium}
      </button>
    </Tooltip>
  );
}

interface TextActionButtonProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
  readonly onClick: () => void;
}

function TextActionButton({ ariaLabel, children, onClick }: TextActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="h-full w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-left"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface AsphericalCellProps {
  readonly aspherical: Surface["aspherical"] | undefined;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function AsphericalCell({
  aspherical,
  onOpenModal,
  tooltipText = "Click to set aspherical parameters",
}: AsphericalCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch triggerClassName="flex h-full w-full">
      <TextActionButton ariaLabel="Edit aspherical parameters" onClick={onOpenModal}>
        {formatAsphericalLabel(aspherical)}
      </TextActionButton>
    </Tooltip>
  );
}

interface ApertureCellProps {
  readonly clearAperture: ClearAperture | undefined;
  readonly edgeAperture: EdgeAperture | undefined;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function ApertureCell({
  clearAperture,
  edgeAperture,
  onOpenModal,
  tooltipText = "Click to set aperture",
}: ApertureCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch triggerClassName="flex h-full w-full">
      <TextActionButton ariaLabel="Edit aperture" onClick={onOpenModal}>
        {formatApertureLabel(clearAperture, edgeAperture)}
      </TextActionButton>
    </Tooltip>
  );
}

interface DecenterCellProps {
  readonly decenter: DecenterConfig | undefined;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function DecenterCell({
  decenter,
  onOpenModal,
  tooltipText = "Click to open settings for Tilt and Decenter",
}: DecenterCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch triggerClassName="flex h-full w-full">
      <TextActionButton ariaLabel="Edit decenter and tilt" onClick={onOpenModal}>
        {formatDecenterLabel(decenter)}
      </TextActionButton>
    </Tooltip>
  );
}

interface DiffractionGratingCellProps {
  readonly diffractionGrating: DiffractionGrating | undefined;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function DiffractionGratingCell({
  diffractionGrating,
  onOpenModal,
  tooltipText = "Click to set diffraction grating",
}: DiffractionGratingCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch triggerClassName="flex h-full w-full">
      <TextActionButton ariaLabel="Edit diffraction grating" onClick={onOpenModal}>
        {formatDiffractionGratingLabel(diffractionGrating)}
      </TextActionButton>
    </Tooltip>
  );
}
