"use client";

import React from "react";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface DiffractionGratingCellProps {
  readonly isDiffractionGratingSet: boolean;
  readonly onOpenModal: () => void;
}

export function DiffractionGratingCell({
  isDiffractionGratingSet,
  onOpenModal,
}: DiffractionGratingCellProps) {
  return (
    <Tooltip text="Click to set diffraction grating" position="top" portal noTouch>
      <SetButton
        isSet={isDiffractionGratingSet}
        aria-label="Edit diffraction grating"
        onClick={onOpenModal}
      />
    </Tooltip>
  );
}
