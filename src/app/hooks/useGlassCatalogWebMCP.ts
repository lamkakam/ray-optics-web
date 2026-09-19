"use client";

import { useMemo } from "react";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGetAllGlassesTool } from "@/features/glass-map/lib/glassWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

/**
 * Registers the global read-only glass query for the persistent shell's lifetime.
 * Catalog edits are read at execution time without re-registering. useWebMCP
 * handles unsupported browsers and unregisters when the shell or store changes.
 */
export function useGlassCatalogWebMCP(): void {
  const store = useGlassMapStore();
  const tool = useMemo(() => createGetAllGlassesTool(store), [store]);
  useWebMCP(tool, [store]);
}
