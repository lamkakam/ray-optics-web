import React from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface LensLayoutPanelProps {
  readonly imageBase64?: string;
  readonly loading?: boolean;
  readonly onRefresh: () => void;
}

export function LensLayoutPanel({
  imageBase64,
  loading,
  onRefresh,
}: LensLayoutPanelProps) {
  return (
    <div className={cx.panel.style.imageContainer}>
      {imageBase64 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not optimizable by next/image */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Lens layout diagram"
            className="max-h-full max-w-full object-contain"
          />
          {loading && (
            <div className={`${cx.panel.style.loadingOverlay} ${cx.panel.color.loadingOverlay}`}>
              <span className={`text-sm ${cx.text.color.loading}`}>
                Updating...
              </span>
            </div>
          )}
        </>
      ) : (
        <div className={`${cx.panel.style.emptyState} ${cx.text.color.empty}`}>
          {loading
            ? "Loading lens layout..."
            : "Configure the System Specs & Lens Prescription below, or choose an example system, then click \u201cUpdate System\u201d to view the lens layout."}
        </div>
      )}
      <button
        type="button"
        aria-label="Refresh lens layout"
        disabled={loading}
        onClick={onRefresh}
        className={`${cx.button.style.floating} ${cx.button.color.floating} ${cx.button.size.xs}`}
      >
        ↻
      </button>
    </div>
  );
}
