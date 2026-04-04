"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";
import type { GlassMapRouteIntent } from "@/features/glass-map/stores/glassMapStore";
import { useAppShell } from "@/app/AppShellContext";

interface GlassMapPageContentProps {
  readonly proxy: ReturnType<typeof useAppShell>["proxy"];
  readonly isReady: boolean;
}

function GlassMapPageBody({
  proxy,
  isReady,
  routeIntent,
}: GlassMapPageContentProps & {
  readonly routeIntent?: GlassMapRouteIntent;
}) {
  const storeKey = routeIntent
    ? `${routeIntent.source}:${routeIntent.catalog}:${routeIntent.glass}`
    : "glass-map-default";

  return (
    <GlassMapStoreProvider key={storeKey} initialRouteIntent={routeIntent}>
      <GlassMapView proxy={proxy} isReady={isReady} routeIntent={routeIntent} />
    </GlassMapStoreProvider>
  );
}

function GlassMapPageContent({ proxy, isReady }: GlassMapPageContentProps) {
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

  return (
    <GlassMapPageBody proxy={proxy} isReady={isReady} routeIntent={routeIntent} />
  );
}

export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();

  return (
    <Suspense fallback={<GlassMapPageBody proxy={proxy} isReady={isReady} />}>
      <GlassMapPageContent proxy={proxy} isReady={isReady} />
    </Suspense>
  );
}
