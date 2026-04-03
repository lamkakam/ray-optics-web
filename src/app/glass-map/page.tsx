"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GlassMapView, type GlassMapRouteIntent } from "@/features/glass-map/GlassMapView";
import { useAppShell } from "@/app/AppShellContext";

export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();
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
