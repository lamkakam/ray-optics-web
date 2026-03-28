"use client";

import React from "react";
import { Button } from "@/components/micro/Button";

interface SetButtonProps {
  readonly isSet: boolean;
  readonly onClick: () => void;
  readonly "aria-label": string;
  readonly setLabel?: string;
  readonly unsetLabel?: string;
}

export function SetButton({
  isSet,
  onClick,
  "aria-label": ariaLabel,
  setLabel = "Set",
  unsetLabel = "—",
}: SetButtonProps) {
  return (
    <Button
      variant={isSet ? "primary" : "secondary"}
      size="xs"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {isSet ? setLabel : unsetLabel}
    </Button>
  );
}
