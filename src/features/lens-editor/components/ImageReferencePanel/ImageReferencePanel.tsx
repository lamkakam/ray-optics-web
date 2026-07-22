/**
# `features/lens-editor/components/ImageReferencePanel/ImageReferencePanel.tsx`

## Behaviour

- Reads `imagePoint` and `setImagePoint` from `ImagePointProvider`.
- Renders one `Select` labeled `Image point`.
- Offers exactly two options:
  - `"chief_ray"` — `Chief ray`
  - `"centroid"` — `Centroid`
- Calls `setImagePoint(...)` only when the selected option differs from the current value.
- Does not own persistence; persistence remains handled by `ImagePointProvider`.
*/
"use client";

import React from "react";
import { type ImagePoint, useImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";

const imagePointOptions: ReadonlyArray<{ value: ImagePoint; label: string }> = [
  { value: "chief_ray", label: "Chief ray" },
  { value: "centroid", label: "Centroid" },
];

/**
## Purpose

Lens Editor drawer panel for selecting the app-wide image reference convention used by OPD-related analysis and optimization workflows.

## Usages

Rendered as the `Image Reference` tab in `BottomDrawerContainer`.
*/
export function ImageReferencePanel() {
  const { imagePoint, setImagePoint } = useImagePoint();

  const handleImagePointChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedImagePoint = event.target.value as ImagePoint;
    if (selectedImagePoint !== imagePoint) {
      setImagePoint(selectedImagePoint);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-xs">
      <div>
        <Label htmlFor="image-reference-image-point-select">Image point</Label>
        <Select
          id="image-reference-image-point-select"
          aria-label="Image point"
          options={imagePointOptions}
          value={imagePoint}
          onChange={handleImagePointChange}
        />
      </div>
    </div>
  );
}
