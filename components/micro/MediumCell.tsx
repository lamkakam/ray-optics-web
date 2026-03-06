"use client";

import React from "react";

interface MediumCellProps {
  readonly medium: string;
  readonly onOpenModal: () => void;
}

export function MediumCell({ medium, onOpenModal }: MediumCellProps) {
  return (
    <button
      type="button"
      aria-label="Edit medium"
      className="cursor-pointer"
      onClick={onOpenModal}
    >
      {medium}
    </button>
  );
}
