"use client";

/** Lens Editor composition hook for the five prescription WebMCP descriptors. */
import { useMemo } from "react";
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createLensPrescriptionTools } from "@/features/lens-editor/lib/lensPrescriptionWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

/** Registers the Lens Editor prescription tool set for the lifetime of its store. */
export function useLensPrescriptionWebMCP(store: StoreApi<LensEditorState>): void {
  const tools = useMemo(() => createLensPrescriptionTools(store), [store]);
  useWebMCP(tools[0], [store]);
  useWebMCP(tools[1], [store]);
  useWebMCP(tools[2], [store]);
  useWebMCP(tools[3], [store]);
  useWebMCP(tools[4], [store]);
}
