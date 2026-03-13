"use client";

import React from "react";
import { Tooltip } from "@/components/micro/Tooltip";

interface AsphericalCellProps {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
}

export function AsphericalCell({ isAspherical, onOpenModal }: AsphericalCellProps) {
  return (
    <Tooltip text="Click to set aspherical parameters" position="top" portal>
      <input
        type="checkbox"
        aria-label="Edit aspherical parameters"
        checked={isAspherical}
        readOnly
        onClick={onOpenModal}
      />
    </Tooltip>
  );
}
