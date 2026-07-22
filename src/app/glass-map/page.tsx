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

/**
 *
 * ## Behaviour
 * - Reads `proxy` and `isReady` from `useAppShell()`
 * - Wraps query-param parsing in a `React.Suspense` boundary to satisfy the App Router build requirement for `useSearchParams()`
 * - Reads `source`, `catalog`, and `glass` from `useSearchParams()` inside the Suspense-wrapped child component
 * - Builds `routeIntent` only when `source=medium-selector` and both `catalog` and `glass` are present
 * - Keeps `routeIntent` as render data; it is not mirrored into the persistent glass-map store with an effect
 * - Renders `GlassMapView` under an inner `Suspense` boundary so the catalog resource can suspend independently of the search-param boundary
 * - Uses a stable `routeIntentKey` so route-intent-local UI override state resets when the URL intent changes
 * - Keeps `GlassMapView` under the same long-lived store instance, so plot filters and selection survive page switches
 * - Renders `GlassMapView` with the shared Pyodide worker state and the optional route intent
 * - Reads whether a pending medium selection still exists from the lens-editor store
 * - Injects `onUseSelectedGlass` only while that pending modal draft exists; the callback copies the selected glass's canonical name and catalog into the draft without committing the prescription row
 * - Leaves navigation to `/` to the Glass Map inline links, so `Back to lens editor` remains a state-preserving navigation while `Use selected glass` updates the draft first
 * - Uses the same loading placeholder for both search-param suspense and catalog-resource suspense
 */
export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();

  return (
    <Suspense fallback={<GlassMapLoadingFallback proxy={proxy} isReady={isReady} />}>
      <GlassMapPageContent proxy={proxy} isReady={isReady} />
    </Suspense>
  );
}
