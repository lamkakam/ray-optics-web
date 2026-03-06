import React from "react";

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
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Updating...
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Loading lens layout...
        </div>
      )}
      <button
        type="button"
        aria-label="Refresh lens layout"
        disabled={loading}
        onClick={onRefresh}
        className="absolute right-2 top-2 rounded-lg border border-gray-300 bg-white/80 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        ↻
      </button>
    </div>
  );
}
