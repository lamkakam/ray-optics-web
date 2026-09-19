"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "zustand";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import {
  getPageDefinition,
  getPageDefinitionForPathname,
  type PageKey,
} from "@/shared/lib/navigation/pageDefinitions";
import {
  createPageNavigationTools,
  type OptimizationNavigationAction,
  type OptimizationNavigationResult,
  type PageNavigationResult,
  type PageNavigationWebMcpDependencies,
} from "@/app/pageNavigationWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";
import { assertWebMcpNotCancelled } from "@/shared/lib/webMcpValidation";

/** Returns the current path, query, and hash without the origin. */
function getCurrentWindowHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Resolves a possibly relative history URL to its pathname. */
function getPathnameFromHref(href: string) {
  return new URL(href, window.location.origin).pathname;
}

/** Full tracked browser-history entry, including Next.js router state. */
interface HistoryEntry {
  readonly href: string;
  readonly state: unknown;
}

/**
 * Guards full-page unloads everywhere and intercepts guarded history navigation
 * in capture phase before Next.js can start a route transition. Restores the exact
 * Optimization URL (including query/hash) and original history.state, including
 * Next's __NA marker, before synchronously showing the shared confirmation.
 * Unguarded back/forward entries remain intact and become the tracked entry.
 * All browser listeners are removed when the persistent shell unmounts.
 */
function useBrowserHistoryNavigation(
  pathname: string,
  optimizationStore: ReturnType<typeof useOptimizationStore>,
  deferNavigation: (href: string) => void,
) {
  /** Complete active Optimization history entry restored when guarded popstate navigation is intercepted. */
  const activeHistoryEntryRef = useRef<HistoryEntry>({
    href: pathname,
    state: undefined,
  });

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    activeHistoryEntryRef.current = {
      href: getCurrentWindowHref(),
      state: window.history.state,
    };
  }, []);

  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      const nextHref = getCurrentWindowHref();
      const activeEntry = activeHistoryEntryRef.current;
      const previousPathname = getPathnameFromHref(activeEntry.href);
      const nextPathname = getPathnameFromHref(nextHref);
      if (
        previousPathname === "/optimization" &&
        nextPathname !== "/optimization" &&
        optimizationStore.getState().hasUnappliedOptimizationResult
      ) {
        event.stopImmediatePropagation();
        window.history.pushState(activeEntry.state, "", activeEntry.href);
        flushSync(() => deferNavigation(nextHref));
        return;
      }

      activeHistoryEntryRef.current = {
        href: nextHref,
        state: event.state,
      };
    };

    window.addEventListener("popstate", handler, { capture: true });
    return () =>
      window.removeEventListener("popstate", handler, { capture: true });
  }, [deferNavigation, optimizationStore]);
}

/** Registers persistent global page tools against the same pending state and actions as SideNav and the modal. */
function usePageNavigationWebMcp({
  getCurrentPage,
  getPendingNavigation,
  navigateToPage,
  resolveOptimizationNavigation,
}: PageNavigationWebMcpDependencies) {
  /** Global page tools remain mounted with the persistent application shell. */
  const pageNavigationTools = useMemo(
    () =>
      createPageNavigationTools({
        getCurrentPage,
        getPendingNavigation,
        navigateToPage,
        resolveOptimizationNavigation,
      }),
    [
      getCurrentPage,
      getPendingNavigation,
      navigateToPage,
      resolveOptimizationNavigation,
    ],
  );
  useWebMCP(pageNavigationTools.setActivePage);
  useWebMCP(pageNavigationTools.getActivePage);
  useWebMCP(pageNavigationTools.resolveOptimizationNavigation);
}

/**
 * Owns the shared SideNav/WebMCP Optimization confirmation state. Canonical page
 * requests use shared page definitions; arbitrary and history destinations retain
 * their full href. Stay clears the pending destination, Leave navigates without
 * applying, and Apply uses the editor's atomic synchronization helper. Only a
 * successful Apply marks the result applied and navigates. Failures report through
 * the shell error callback; cancellation retains editor/specs, result, and destination.
 * Router and store dependencies are obtained here without initializing a worker.
 */
export function useAppShellNavigation(
  proxy: PyodideWorkerAPI | undefined,
  openErrorModal: () => void,
) {
  const router = useRouter();
  const pathname = usePathname();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const hasUnappliedOptimizationResult = useStore(
    optimizationStore,
    (state) => state.hasUnappliedOptimizationResult,
  );
  /** Route deferred by the unapplied-optimization navigation guard. */
  const [pendingNavigationHref, setPendingNavigationHref] = useState<
    string | undefined
  >();
  /** Immediate pending-navigation snapshot shared by modal and imperative tool callbacks. */
  const pendingNavigationHrefRef = useRef<string | undefined>(undefined);

  /** Updates React and imperative snapshots together for modal, tool, and history requests. */
  const deferNavigation = useCallback((href: string) => {
    pendingNavigationHrefRef.current = href;
    setPendingNavigationHref(href);
  }, []);

  /** Returns whether a target route must be deferred behind the unapplied-result modal. */
  const shouldWarnBeforeLeavingOptimization = useCallback(
    (targetHref: string) =>
      pathname === "/optimization" &&
      getPathnameFromHref(targetHref) !== "/optimization" &&
      hasUnappliedOptimizationResult,
    [hasUnappliedOptimizationResult, pathname],
  );

  /** Clears pending navigation and pushes an accepted route. */
  const proceedToHref = useCallback(
    (href: string) => {
      pendingNavigationHrefRef.current = undefined;
      setPendingNavigationHref(undefined);
      router.push(href);
    },
    [router],
  );

  /** Resolves a supported page key through the same guard used by SideNav. */
  const requestPageNavigation = useCallback(
    (page: PageKey): PageNavigationResult => {
      const definition = getPageDefinition(page);
      if (definition === undefined) {
        throw new Error(`Unknown application page: ${page}`);
      }

      if (shouldWarnBeforeLeavingOptimization(definition.path)) {
        deferNavigation(definition.path);
        const currentPage = getPageDefinitionForPathname(pathname);
        if (currentPage === undefined) {
          throw new Error(`Unknown application pathname: ${pathname}`);
        }
        return {
          status: "pending_optimization_confirmation",
          currentPage: currentPage.key,
          requestedPage: page,
        };
      }

      proceedToHref(definition.path);
      return { status: "navigated", page };
    },
    [
      deferNavigation,
      pathname,
      proceedToHref,
      shouldWarnBeforeLeavingOptimization,
    ],
  );

  /** Intercepts in-app navigation away from an unapplied Optimization result. */
  const guardedNavigate = useCallback(
    (href: string, event?: React.MouseEvent<HTMLAnchorElement>) => {
      event?.preventDefault();
      const targetPage = getPageDefinitionForPathname(
        getPathnameFromHref(href),
      );
      if (targetPage !== undefined) {
        return requestPageNavigation(targetPage.key).status === "navigated";
      }

      if (shouldWarnBeforeLeavingOptimization(href)) {
        deferNavigation(href);
        return false;
      }

      proceedToHref(href);
      return true;
    },
    [
      deferNavigation,
      proceedToHref,
      requestPageNavigation,
      shouldWarnBeforeLeavingOptimization,
    ],
  );

  /** Reads the shell's canonical current page for `get_active_page`. */
  const getCurrentPage = useCallback((): PageKey => {
    const page = getPageDefinitionForPathname(pathname);
    if (page === undefined) {
      throw new Error(`Unknown application pathname: ${pathname}`);
    }
    return page.key;
  }, [pathname]);

  /** Resolves the shell's pending href to a canonical page key when possible. */
  const getPendingNavigation = useCallback(() => {
    const pendingHref = pendingNavigationHrefRef.current;
    if (pendingHref === undefined) {
      return undefined;
    }
    return getPageDefinitionForPathname(getPathnameFromHref(pendingHref))?.key;
  }, []);

  /** Shared Stay/Leave/Apply implementation. Forwards cancellation to the editor commit boundary so a cancelled pending Apply retains the result and destination without mutating editor/specs stores or navigating. */
  const resolveOptimizationNavigation = useCallback(
    async (
      action: OptimizationNavigationAction,
      signal?: AbortSignal,
    ): Promise<OptimizationNavigationResult> => {
      const href = pendingNavigationHrefRef.current;
      if (href === undefined) {
        return { status: "no_pending_navigation" };
      }

      assertWebMcpNotCancelled(signal);
      const destinationPage = getPageDefinitionForPathname(
        getPathnameFromHref(href),
      )?.key;

      if (action === "stay") {
        pendingNavigationHrefRef.current = undefined;
        setPendingNavigationHref(undefined);
        return { status: "stayed" };
      }

      if (action === "leave") {
        proceedToHref(href);
        return {
          status: "left",
          ...(destinationPage === undefined ? {} : { page: destinationPage }),
        } as OptimizationNavigationResult;
      }

      const model = optimizationStore.getState().optimizationModel;
      if (model === undefined) {
        pendingNavigationHrefRef.current = undefined;
        setPendingNavigationHref(undefined);
        return { status: "no_pending_navigation" };
      }
      if (proxy === undefined) {
        return { status: "no_pending_navigation" };
      }

      try {
        await applyOptimizationModelToEditor({
          model,
          lensStore,
          specsStore,
          proxy,
          signal,
        });
        assertWebMcpNotCancelled(signal);
        optimizationStore.getState().markOptimizationResultAppliedToEditor();
        proceedToHref(href);
        return {
          status: "applied_and_left",
          ...(destinationPage === undefined ? {} : { page: destinationPage }),
        } as OptimizationNavigationResult;
      } catch (error: unknown) {
        if (!signal?.aborted) {
          openErrorModal();
        }
        throw error;
      }
    },
    [
      lensStore,
      openErrorModal,
      optimizationStore,
      proceedToHref,
      proxy,
      specsStore,
    ],
  );

  /** Dismisses the warning while remaining on Optimization. */
  const handleStayOnOptimization = useCallback(() => {
    void resolveOptimizationNavigation("stay").catch(() => undefined);
  }, [resolveOptimizationNavigation]);

  /** Leaves without applying the Optimization-local model. */
  const handleLeaveOptimization = useCallback(() => {
    void resolveOptimizationNavigation("leave").catch(() => undefined);
  }, [resolveOptimizationNavigation]);

  /** Atomically applies the optimized model and navigates only after success. */
  const handleApplyOptimizationToEditorAndLeave = useCallback(() => {
    void resolveOptimizationNavigation("apply_to_editor").catch(
      () => undefined,
    );
  }, [resolveOptimizationNavigation]);

  usePageNavigationWebMcp({
    getCurrentPage,
    getPendingNavigation,
    navigateToPage: requestPageNavigation,
    resolveOptimizationNavigation,
  });
  useBrowserHistoryNavigation(pathname, optimizationStore, deferNavigation);

  return {
    guardedNavigate,
    confirmationModalProps: {
      isOpen: pendingNavigationHref !== undefined,
      onStay: handleStayOnOptimization,
      onLeave: handleLeaveOptimization,
      onApplyToEditor: handleApplyOptimizationToEditorAndLeave,
    },
  };
}
