"use client";

import React, { createContext, useContext } from "react";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { GlassCatalogsLoadResult } from "@/features/glass-map/lib/glassCatalogsResource";

export interface GlassCatalogContextValue {
  readonly catalogs: AllGlassCatalogsData | undefined;
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
