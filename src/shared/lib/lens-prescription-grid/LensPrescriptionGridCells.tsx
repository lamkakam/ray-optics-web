"use client";

import React from "react";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

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

interface AsphericalCellProps {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function AsphericalCell({
  isAspherical,
  onOpenModal,
  tooltipText = "Click to set aspherical parameters",
}: AsphericalCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch>
      <SetButton isSet={isAspherical} aria-label="Edit aspherical parameters" onClick={onOpenModal} />
    </Tooltip>
  );
}

interface DecenterCellProps {
  readonly isDecenterSet: boolean;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function DecenterCell({
  isDecenterSet,
  onOpenModal,
  tooltipText = "Click to open settings for Tilt and Decenter",
}: DecenterCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch>
      <SetButton isSet={isDecenterSet} aria-label="Edit decenter and tilt" onClick={onOpenModal} />
    </Tooltip>
  );
}

interface DiffractionGratingCellProps {
  readonly isDiffractionGratingSet: boolean;
  readonly onOpenModal: () => void;
  readonly tooltipText?: string;
}

export function DiffractionGratingCell({
  isDiffractionGratingSet,
  onOpenModal,
  tooltipText = "Click to set diffraction grating",
}: DiffractionGratingCellProps) {
  return (
    <Tooltip text={tooltipText} position="top" portal noTouch>
      <SetButton
        isSet={isDiffractionGratingSet}
        aria-label="Edit diffraction grating"
        onClick={onOpenModal}
      />
    </Tooltip>
  );
}
