"use client";

import React from "react";
import { SetButton } from "@/components/micro/SetButton";
import { Tooltip } from "@/components/micro/Tooltip";

interface DecenterCellProps {
  readonly isDecenterSet: boolean;
  readonly onOpenModal: () => void;
}

export function DecenterCell({ isDecenterSet, onOpenModal }: DecenterCellProps) {
  return (
    <Tooltip text="Click to open settings for Tilt and Decenter" position="top" portal>
      <SetButton isSet={isDecenterSet} aria-label="Edit decenter and tilt" onClick={onOpenModal} />
    </Tooltip>
  );
}
