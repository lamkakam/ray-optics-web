"use client";

import React from "react";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface AsphericalCellProps {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
}

export function AsphericalCell({ isAspherical, onOpenModal }: AsphericalCellProps) {
  return (
    <Tooltip text="Click to set aspherical parameters" position="top" portal noTouch>
      <SetButton isSet={isAspherical} aria-label="Edit aspherical parameters" onClick={onOpenModal} />
    </Tooltip>
  );
}
