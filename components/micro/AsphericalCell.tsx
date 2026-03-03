"use client";

import React from "react";

interface AsphericalCellProps {
  readonly isAspherical: boolean;
  readonly onOpenModal: () => void;
}

export function AsphericalCell({ isAspherical, onOpenModal }: AsphericalCellProps) {
  return (
    <input
      type="checkbox"
      aria-label="Edit aspherical parameters"
      checked={isAspherical}
      readOnly
      onClick={onOpenModal}
    />
  );
}
