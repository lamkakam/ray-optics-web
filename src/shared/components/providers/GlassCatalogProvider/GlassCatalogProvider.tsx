/**
## Behaviour
- `catalogs` contains normalized worker-backed glass catalog data once AppShell has successfully loaded and committed it to `GlassMapStore`
- `lookupMaps` contains the case-insensitive manufacturer and medium maps built by `GlassMapStore` from the same loaded catalog data
- `error` contains the AppShell-local preload failure message, if any
- `isLoaded` is derived from AppShell-local preload status
- `isLoading` is `true` while the shared shell preload is in flight before success or failure
- `preload()` reuses the shared loader path, commits successful data to `GlassMapStore`, updates AppShell-local status/error, and returns the cached result when available*/
"use client";

import React, { createContext, useContext } from "react";
import type { AllGlassCatalogsData, GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { GlassCatalogsLoadResult } from "@/features/glass-map/lib/glassCatalogLoader";

export interface GlassCatalogContextValue {
  readonly catalogs: AllGlassCatalogsData | undefined;
  readonly lookupMaps: GlassLookupMaps | undefined;
  readonly error: string | undefined;
  readonly isLoaded: boolean;
  readonly isLoading: boolean;
  readonly preload: () => Promise<GlassCatalogsLoadResult | undefined>;
}

export const GlassCatalogContext = createContext<GlassCatalogContextValue | undefined>(undefined);

interface GlassCatalogProviderProps {
  readonly value: GlassCatalogContextValue;
  readonly children: React.ReactNode;
}

/**
Client-only React context for app-wide glass catalog data. The provider does not fetch data itself; `AppShell` injects successful catalog data from `GlassMapStore` plus AppShell-local preload status/error so lens editor and glass map consume a shared context.*/
export function GlassCatalogProvider({ value, children }: GlassCatalogProviderProps) {
  return (
    <GlassCatalogContext.Provider value={value}>
      {children}
    </GlassCatalogContext.Provider>
  );
}

export function useGlassCatalogs(): GlassCatalogContextValue {
  const context = useContext(GlassCatalogContext);

  if (context === undefined) {
    throw new Error("useGlassCatalogs must be used within a GlassCatalogProvider");
  }

  return context;
}
