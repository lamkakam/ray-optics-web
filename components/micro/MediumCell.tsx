"use client";

import React from "react";
import { Tooltip } from "@/components/micro/Tooltip";

interface MediumCellProps {
  readonly medium: string;
  readonly onOpenModal: () => void;
}

export function MediumCell({ medium, onOpenModal }: MediumCellProps) {
  return (
    <Tooltip text="Click to set medium or glass" position="top" portal noTouch>
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
