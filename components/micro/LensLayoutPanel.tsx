import React from "react";
import clsx from "clsx";
import { Paragraph } from "./Paragraph";

interface LensLayoutPanelProps {
  readonly imageBase64?: string;
  readonly loading?: boolean;
}

export function LensLayoutPanel({
  imageBase64,
  loading,
}: LensLayoutPanelProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {imageBase64 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not optimizable by next/image */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Lens layout diagram"
            className="max-h-full max-w-full object-contain"
          />
          {loading && (
            <div className={clsx("absolute inset-0 flex items-center justify-center", "dark:bg-gray-900/60")}>
              <Paragraph variant="placeholder">
                Updating...
              </Paragraph>
            </div>
          )}
        </>
      ) : (
        <Paragraph variant="placeholder">
          {loading
            ? "Loading lens layout..."
            : "Configure the System Specs & Lens Prescription below, or choose an example system, then click \u201cUpdate System\u201d to view the lens layout."}
        </Paragraph>
      )}
    </div>
  );
}
