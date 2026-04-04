"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import type { GlassMapRouteIntent } from "@/features/glass-map/stores/glassMapStore";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
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
  const store = useGlassMapStore();
  const { setRouteIntent } = store.getState();

  useEffect(() => {
    setRouteIntent(routeIntent);
  }, [routeIntent, setRouteIntent]);

  return <GlassMapView proxy={proxy} isReady={isReady} routeIntent={routeIntent} />;
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
