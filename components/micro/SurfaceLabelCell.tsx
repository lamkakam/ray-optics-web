"use client";

import React from "react";

interface SurfaceLabelCellProps {
  readonly value: "Default" | "Stop";
  readonly onValueChange: (value: "Default" | "Stop") => void;
}

export function SurfaceLabelCell({ value, onValueChange }: SurfaceLabelCellProps) {
  return (
    <select
      aria-label="Surface label"
      value={value}
      onChange={(e) => onValueChange(e.target.value as "Default" | "Stop")}
    >
      <option value="Default">Default</option>
      <option value="Stop">Stop</option>
    </select>
  );
}
