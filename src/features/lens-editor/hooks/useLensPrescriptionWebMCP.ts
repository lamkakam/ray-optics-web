"use client";

/** Lens Editor composition hook for the five prescription WebMCP descriptors. */
import { useMemo } from "react";
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import { createLensPrescriptionTools } from "@/features/lens-editor/lib/lensPrescriptionWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

/** Registers descriptors whose executions use the latest catalog lookup snapshot. */
export function useLensPrescriptionWebMCP(
  store: StoreApi<LensEditorState>,
  lookupMaps: GlassLookupMaps | undefined,
): void {
  const tools = useMemo(() => createLensPrescriptionTools(store, lookupMaps), [store, lookupMaps]);
  useWebMCP(tools[0], [store]);
  useWebMCP(tools[1], [store]);
  useWebMCP(tools[2], [store]);
  useWebMCP(tools[3], [store]);
  useWebMCP(tools[4], [store]);
}
