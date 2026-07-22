"use client";
/** App-wide catalog data and preload status injected by `AppShell`. */

import React, { createContext, useContext } from "react";
import type { AllGlassCatalogsData, GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { GlassCatalogsLoadResult } from "@/features/glass-map/lib/glassCatalogLoader";

/** Catalog data, lookup maps, preload state, and shared preload action. */
export interface GlassCatalogContextValue {
  /** Normalized worker-backed catalogs after a successful store commit. */
  readonly catalogs: AllGlassCatalogsData | undefined;
  /** Case-insensitive manufacturer and medium maps derived from the same catalogs. */
  readonly lookupMaps: GlassLookupMaps | undefined;
  /** Shell-local preload failure message. */
  readonly error: string | undefined;
  /** Whether preload completed successfully. */
  readonly isLoaded: boolean;
  /** Whether initial preload is in flight. */
  readonly isLoading: boolean;
  /** Reuses cached data or runs the shared loader and commits successful data. */
  readonly preload: () => Promise<GlassCatalogsLoadResult | undefined>;
}

/** Optional React context consumed by `useGlassCatalogs`. */
export const GlassCatalogContext = createContext<GlassCatalogContextValue | undefined>(undefined);

interface GlassCatalogProviderProps {
  readonly value: GlassCatalogContextValue;
  readonly children: React.ReactNode;
}

/** Client-only React context for app-wide glass catalog data. The provider does not fetch data itself; `AppShell` injects successful catalog data from `GlassMapStore` plus AppShell-local preload status/error so lens editor and glass map consume a shared context. */
export function GlassCatalogProvider({ value, children }: GlassCatalogProviderProps) {
  return (
    <GlassCatalogContext.Provider value={value}>
      {children}
    </GlassCatalogContext.Provider>
  );
}

/**
 * Reads app-wide glass catalogs and preload state.
 *
 * @throws When used outside {@link GlassCatalogProvider}.
 */
export function useGlassCatalogs(): GlassCatalogContextValue {
  const context = useContext(GlassCatalogContext);

  if (context === undefined) {
    throw new Error("useGlassCatalogs must be used within a GlassCatalogProvider");
  }

  return context;
}
