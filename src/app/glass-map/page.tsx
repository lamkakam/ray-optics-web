"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GlassMapView, type GlassMapRouteIntent } from "@/features/glass-map/GlassMapView";
import { useAppShell } from "@/app/AppShellContext";

interface GlassMapPageContentProps {
  readonly proxy: ReturnType<typeof useAppShell>["proxy"];
  readonly isReady: boolean;
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

  return <GlassMapView proxy={proxy} isReady={isReady} routeIntent={routeIntent} />;
}

export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();

  return (
    <Suspense fallback={<GlassMapView proxy={proxy} isReady={isReady} />}>
      <GlassMapPageContent proxy={proxy} isReady={isReady} />
    </Suspense>
  );
}
