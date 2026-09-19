"use client";

/** Page-scoped lifecycle composition for the four custom-glass CRUD tools. */
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  createCustomGlassWebMcpTools,
  type CustomGlassWebMcpDependencies,
} from "@/features/import-custom-glass/lib/customGlassWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

/**
 * Registers tools once in public order while mounted and lets their executions
 * observe the latest proxy, catalog, store actions, persistence, and callbacks.
 */
export function useCustomGlassWebMCP(
  dependencies: CustomGlassWebMcpDependencies,
): void {
  const latestDependenciesRef = useRef(dependencies);
  useLayoutEffect(() => {
    latestDependenciesRef.current = dependencies;
  }, [dependencies]);
  const tools = useMemo(
    () => createCustomGlassWebMcpTools(() => latestDependenciesRef.current),
    [],
  );

  useWebMCP(tools.getCustomGlasses);
  useWebMCP(tools.addCustomGlass);
  useWebMCP(tools.updateCustomGlass);
  useWebMCP(tools.deleteCustomGlass);
}
