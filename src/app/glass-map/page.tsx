"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "zustand";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import type { GlassMapRouteIntent } from "@/features/glass-map/stores/glassMapStore";
import { useAppShell } from "@/app/AppShellContext";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { SelectedGlass } from "@/features/glass-map/types/glassMap";

interface GlassMapPageContentProps {
  readonly proxy: ReturnType<typeof useAppShell>["proxy"];
  readonly isReady: boolean;
}

function GlassMapLoadingFallback({
  proxy: _proxy,
  isReady: _isReady,
}: GlassMapPageContentProps) {
  return (
    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
      Loading glass catalog data…
    </div>
  );
}

function GlassMapPageContent({ proxy, isReady }: GlassMapPageContentProps) {
  const lensEditorStore = useLensEditorStore();
  const hasPendingMediumSelection = useStore(
    lensEditorStore,
    (state) => state.pendingMediumSelection !== undefined,
  );
  const searchParams = useSearchParams();
  const routeIntent = useMemo<GlassMapRouteIntent | undefined>(() => {
    const source = searchParams.get("source");
    const catalog = searchParams.get("catalog");
    const glass = searchParams.get("glass");

    if (source !== "medium-selector" || catalog === null || glass === null) {
      return undefined;
    }

    return { source, catalog, glass };
  }, [searchParams]);
  const routeIntentKey = routeIntent === undefined
    ? "default"
    : `${routeIntent.source}:${routeIntent.catalog}:${routeIntent.glass}`;
  const handleUseSelectedGlass = hasPendingMediumSelection
    ? (glass: SelectedGlass) => {
        lensEditorStore.getState().updatePendingMediumSelection({
          medium: glass.glassName,
          manufacturer: glass.catalogName,
        });
      }
    : undefined;

  return (
    <Suspense fallback={<GlassMapLoadingFallback proxy={proxy} isReady={isReady} />}>
      <GlassMapView
        key={routeIntentKey}
        proxy={proxy}
        isReady={isReady}
        routeIntent={routeIntent}
        onUseSelectedGlass={handleUseSelectedGlass}
      />
    </Suspense>
  );
}

export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();

  return (
    <Suspense fallback={<GlassMapLoadingFallback proxy={proxy} isReady={isReady} />}>
      <GlassMapPageContent proxy={proxy} isReady={isReady} />
    </Suspense>
  );
}
