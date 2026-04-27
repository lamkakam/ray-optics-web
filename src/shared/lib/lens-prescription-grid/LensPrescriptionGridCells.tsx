"use client";

import React from "react";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import {
  formatAsphericalLabel,
  formatDecenterLabel,
  formatDiffractionGratingLabel,
} from "@/shared/lib/lens-prescription-grid/displayLabels";
import type { DecenterConfig, DiffractionGrating, Surface } from "@/shared/lib/types/opticalModel";

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
    <Tooltip text={tooltipText} position="top" portal noTouch>
      <button
        type="button"
        aria-label="Edit medium"
        className="cursor-pointer"
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
      className="h-full w-full cursor-pointer text-left"
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
