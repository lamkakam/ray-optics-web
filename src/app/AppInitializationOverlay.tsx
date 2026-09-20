"use client";

import type { InitProgress } from "@/shared/hooks/usePyodide";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { Progress } from "@/shared/components/primitives/Progress";

/** Runtime availability and shell-owned catalog initialization state. */
interface AppInitializationOverlayProps {
  readonly isReady: boolean;
  readonly hasProxy: boolean;
  readonly initProgress: InitProgress;
  /** Approved initialization failure text supplied by usePyodide. */
  readonly initializationError?: string;
  readonly glassCatalogsLoading: boolean;
  readonly glassCatalogPreloadError: string | undefined;
}

/**
 * Blocks the application until runtime and initial catalog loading finish.
 * Uses runtime milestones before readiness, then the 90% catalog milestone.
 * Initialization or catalog failures replace progress with safe text while retaining the overlay;
 * catalog state only blocks a ready runtime when its worker proxy is available.
 */
export function AppInitializationOverlay({
  isReady,
  hasProxy,
  initProgress,
  initializationError,
  glassCatalogsLoading,
  glassCatalogPreloadError,
}: AppInitializationOverlayProps) {
  const showLoadingOverlay =
    !isReady ||
    (hasProxy &&
      (glassCatalogsLoading || glassCatalogPreloadError !== undefined));
  if (!showLoadingOverlay) {
    return undefined;
  }

  const overlayProgress =
    isReady && hasProxy && glassCatalogsLoading
      ? { value: 90, status: "Preloading glass catalogs" }
      : initProgress;
  const failureMessage =
    initializationError ??
    (isReady && hasProxy ? glassCatalogPreloadError : undefined);
  const overlayContents =
    failureMessage !== undefined ? (
      <span className="text-center text-sm text-red-600 dark:text-red-400">
        {failureMessage}
      </span>
    ) : (
      <div className="flex w-72 max-w-[70vw] flex-col items-center gap-2">
        <span className="text-center text-sm text-gray-700 dark:text-gray-300">
          {overlayProgress.status}
        </span>
        <Progress
          value={overlayProgress.value}
          ariaLabel="Initialization progress"
        />
      </div>
    );

  return (
    <LoadingOverlay
      title="Initializing Ray Optics"
      contents={overlayContents}
    />
  );
}
