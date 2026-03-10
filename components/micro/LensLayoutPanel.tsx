import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";

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
    <div className={clsx(cx.panel.style.imageContainer)}>
      {imageBase64 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not optimizable by next/image */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Lens layout diagram"
            className="max-h-full max-w-full object-contain"
          />
          {loading && (
            <div className={clsx(cx.panel.style.loadingOverlay, cx.panel.color.loadingOverlayBgColor)}>
              <span className={clsx("text-sm", cx.text.color.loadingTextColor)}>
                Updating...
              </span>
            </div>
          )}
        </>
      ) : (
        <div className={clsx(cx.panel.style.emptyState, cx.text.color.emptyTextColor)}>
          {loading
            ? "Loading lens layout..."
            : "Configure the System Specs & Lens Prescription below, or choose an example system, then click \u201cUpdate System\u201d to view the lens layout."}
        </div>
      )}
      <Button
        variant="floating"
        aria-label="Refresh lens layout"
        disabled={loading}
        onClick={onRefresh}
      >
        ↻
      </Button>
    </div>
  );
}
