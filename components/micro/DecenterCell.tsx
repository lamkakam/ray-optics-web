"use client";

import React from "react";
import { Button } from "@/components/micro/Button";

interface DecenterCellProps {
  readonly isDecenterSet: boolean;
  readonly onOpenModal: () => void;
}

export function DecenterCell({ isDecenterSet, onOpenModal }: DecenterCellProps) {
  return (
    <Button
      variant="secondary"
      size="xs"
      aria-label="Edit decenter and tilt"
      onClick={onOpenModal}
      className={isDecenterSet
        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
        : undefined}
    >
      {isDecenterSet ? "Set" : "—"}
    </Button>
  );
}
