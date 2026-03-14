"use client";

import React from "react";
import { SetButton } from "@/components/micro/SetButton";
import { Tooltip } from "@/components/micro/Tooltip";

interface AsphericalCellProps {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
}

export function AsphericalCell({ isAspherical, onOpenModal }: AsphericalCellProps) {
  return (
    <Tooltip text="Click to set aspherical parameters" position="top" portal>
      <SetButton isSet={isAspherical} aria-label="Edit aspherical parameters" onClick={onOpenModal} />
    </Tooltip>
  );
}
