"use client";

import React from "react";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { useAppShell } from "@/app/(app-shell)/AppShellContext";

export default function GlassMapPage() {
  const { proxy, isReady } = useAppShell();

  return <GlassMapView proxy={proxy} isReady={isReady} />;
}
