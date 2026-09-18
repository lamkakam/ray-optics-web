"use client";

/** Composition hook that registers the five page-scoped Optimization WebMCP tools. */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useWebMCP } from "@/shared/hooks/useWebMCP";
import {
  createOptimizationWebMcpTools,
  type OptimizationWebMcpDependencies,
} from "@/features/optimization/lib/optimizationWebMcp";

/**
 * Registers Optimization tools in public contract order and keeps the mounted
 * registration bound to the latest worker, catalog, store, and callback snapshot.
 */
export function useOptimizationWebMCP(
  dependencies: OptimizationWebMcpDependencies,
): void {
  const latestDependenciesRef = useRef(dependencies);
  useLayoutEffect(() => {
    latestDependenciesRef.current = dependencies;
  }, [dependencies]);

  const tools = useMemo(
    () => createOptimizationWebMcpTools(() => latestDependenciesRef.current),
    [],
  );

  useWebMCP(tools.setOptimizationConfig);
  useWebMCP(tools.getOptimizationConfig);
  useWebMCP(tools.evaluateOptimizationOperands);
  useWebMCP(tools.executeOptimization);
  useWebMCP(tools.applyOptimizationToEditor);
}
