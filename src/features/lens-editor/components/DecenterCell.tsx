"use client";

import React from "react";
import { SetButton } from "@/shared/components/primitives/SetButton";
import { Tooltip } from "@/shared/components/primitives/Tooltip";

interface DecenterCellProps {
  readonly isDecenterSet: boolean;
  readonly onOpenModal: () => void;
}

export function DecenterCell({ isDecenterSet, onOpenModal }: DecenterCellProps) {
  return (
    <Tooltip text="Click to open settings for Tilt and Decenter" position="top" portal noTouch>
      <SetButton isSet={isDecenterSet} aria-label="Edit decenter and tilt" onClick={onOpenModal} />
    </Tooltip>
  );
}
