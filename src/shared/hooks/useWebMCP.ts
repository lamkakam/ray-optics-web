"use client";

/** React lifecycle adapter for one imperative WebMCP tool descriptor. */
import { useEffect, useLayoutEffect, useRef, type DependencyList } from "react";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Registers one same-origin tool when WebMCP is available, delegates executions to
 * the latest committed descriptor, contains registration failures, and unregisters
 * with an `AbortController` on dependency change or unmount.
 */
export function useWebMCP(tool: WebMCP.ModelContextTool, dependencies: DependencyList = []): void {
  const committedToolRef = useRef(tool);

  useIsomorphicLayoutEffect(() => {
    committedToolRef.current = tool;
  });

  useEffect(() => {
    const modelContext = typeof document === "undefined" ? undefined : document.modelContext;
    if (!modelContext) return;

    const controller = new AbortController();
    const registeredTool: WebMCP.ModelContextTool = {
      ...committedToolRef.current,
      execute: (input, options) => committedToolRef.current.execute(
        input,
        options ?? { signal: controller.signal },
      ),
    };

    try {
      const registration = modelContext.registerTool(registeredTool, { signal: controller.signal });
      void Promise.resolve(registration).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        controller.abort();
        console.warn(`[useWebMCP] registerTool("${tool.name}") rejected:`, error);
      });
    } catch (error) {
      controller.abort();
      console.warn(`[useWebMCP] registerTool("${tool.name}") rejected:`, error);
      return;
    }

    return () => controller.abort();
    // Public dependencies deliberately control descriptor re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.name, tool.description, ...dependencies]);
}
