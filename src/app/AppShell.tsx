/**
Guarded Optimization navigation awaits the same atomic editor synchronization helper as the page Apply button. It navigates and marks the result applied only on success; failures retain state and open the existing error modal.

## Rendered Structure
```tsx
<MathJaxContext>
  <AppShellProvider value={{ proxy, isReady, openErrorModal }}>
    <GlassCatalogProvider value={{ catalogs, lookupMaps, error, isLoaded, isLoading, preload }}>
      <Layout onNavigate={guardedNavigate}>{children}</Layout>
    </GlassCatalogProvider>
    <ErrorModal ... />
    <UnappliedOptimizationResultModal ... />
    {showLoadingOverlay && (
      <LoadingOverlay
        contents={
          <>
            <span>{overlayProgress.status}</span>
            <Progress value={overlayProgress.value} ariaLabel="Initialization progress" />
          </>
        }
      />
    )}
  </AppShellProvider>
</MathJaxContext>
```

## Notes
- `app/layout.tsx` remains the server layout for metadata and global providers.
- This replaces the former route-group shell so the public URLs remain unchanged after flattening the routes.
- The loading overlay stays visible until both Pyodide is ready and the initial glass-catalog preload has completed successfully.
- While Pyodide initializes, the overlay uses the milestone state supplied by `usePyodide`.
- Once Pyodide is ready and catalog preload begins, the overlay displays `"Preloading glass catalogs"` at `90%`; the overlay is removed after catalog preload succeeds.
- The catalog preload remains blocking while persisted custom glasses are replayed into `addUserDefinedGlasses` one row at a time.
- Accepted persisted rows are merged into `catalogsData.Custom` before `GlassMapStore.setCatalogsData(...)` is called.
- Malformed persisted rows, unsupported row types, and rows rejected by the worker are moved from `customGlasses` to `quarantinedCustomGlasses` when possible.
- After startup completes, AppShell reports one warning listing the quarantined row count and labels.
- If catalog preload fails, the overlay remains blocking and displays the AppShell-local catalog error. The failed result is not committed into `GlassMapStore`.
- `GlassMapStore.catalogsData` is the source of truth for already loaded catalogs; AppShell does not read settled data from the loader.
- `GlassCatalogProvider.error`, `isLoaded`, and `isLoading` are derived from AppShell-local preload status plus `GlassMapStore.catalogsData`; `catalogs` and `lookupMaps` come from `GlassMapStore`.
- `beforeunload` always calls `preventDefault()` and sets `event.returnValue` so reload, typed URL, tab close, and external navigation show the native browser prompt anywhere in the app.
- In-app navigation away from `/optimization` opens a non-dismissible `UnappliedOptimizationResultModal` instead of pushing the requested route immediately.
- `Stay` clears the pending route and remains on Optimization.
- `Leave` pushes the pending route without applying the Optimization-local model.
- `Apply to Editor` applies the Optimization-local optical model through `applyOptimizationModelToEditor()`, clears the optimization store's unapplied-result marker, then pushes the pending route.
- The browser-history guard tracks the complete active Optimization history entry: its full URL (including query and hash) and its original `history.state`, including Next.js App Router's `__NA` state. It listens for `popstate` in capture phase and, when navigation leaves `/optimization` with an unapplied result, stops immediate propagation before Next.js handles the event, restores that exact entry with `history.pushState(...)`, stores the attempted destination, and synchronously shows the same React warning modal without starting a router transition. Reusing the original Next history state prevents Next's patched `pushState` from dispatching a router restore.
- Browser back/forward navigation outside that Optimization modal path leaves the full history destination, including path, query, and hash, in place without calling `window.confirm`, and updates the tracked current URL for subsequent history navigation.
*/
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MathJaxContext } from "better-react-mathjax";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "zustand";
import { usePyodide } from "@/shared/hooks/usePyodide";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { Progress } from "@/shared/components/primitives/Progress";
import { Layout } from "@/shared/components/layout/Layout";
import { AppShellProvider } from "@/app/AppShellContext";
import { UnappliedOptimizationResultModal } from "@/app/UnappliedOptimizationResultModal";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import { GlassCatalogProvider } from "@/shared/components/providers/GlassCatalogProvider";
import { loadGlassCatalogs } from "@/features/glass-map/lib/glassCatalogLoader";
import {
  isPersistedCustomGlassRow,
  quarantinePersistedCustomGlass,
  quarantineStoredCustomGlassRow,
  readStoredCustomGlassRows,
} from "@/features/import-custom-glass/lib/customGlassStorage";
import type { CompleteGlassCatalogsData, UserDefinedMaterialsData } from "@/features/glass-map/types/glassMap";

interface AppShellProps {
  readonly children: React.ReactNode;
}

function getCurrentWindowHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getPathnameFromHref(href: string) {
  return new URL(href, window.location.origin).pathname;
}

interface HistoryEntry {
  readonly href: string;
  readonly state: unknown;
}

type GlassCatalogPreloadStatus = "loading" | "loaded" | "error";

/**
Client wrapper for the shared runtime shell. Owns Pyodide initialization, app-wide glass-catalog preloading, the global error modal, the loading overlay, Optimization leave guards, `MathJaxContext`, and common app chrome for all routed pages.

## Responsibilities
- Calls `usePyodide()` once for the app tree
- Displays determinate initialization progress from `usePyodide().initProgress`
- Loads normalized glass catalog data via `loadGlassCatalogs()` when `GlassMapStore.catalogsData` is not already available
- Hydrates valid persisted custom glass rows from IndexedDB into Pyodide after built-in catalog loading succeeds and before catalog preload is marked loaded
- Quarantines invalid or worker-rejected persisted custom glass rows and reports one warning after initialization
- Owns glass-catalog preload status/error locally and commits only successful data into `GlassMapStore`
- Registers an app-wide `beforeunload` guard for reload, tab close, typed URL, and external navigation
- Allows browser back/forward navigation between app routes without native confirmation, while keeping the Optimization unapplied-result modal as the browser-history guard for unapplied results
- Guards in-app SideNav navigation away from `/optimization` when an optimized result has not been applied to the Editor
- Provides `proxy`, `isReady`, and `openErrorModal` through `AppShellProvider`
- Injects app-wide glass catalog state through `GlassCatalogProvider`, combining local preload status/error with successful store data
- Renders the shared `Layout` shell around route content
- Renders `ErrorModal` and `LoadingOverlay` outside the routed content area
- Renders `UnappliedOptimizationResultModal` outside routed content so the warning can be shown even while leaving the Optimization route
- Shows the glass-catalog preload as the `90%` initialization milestone while the initial catalog preload is in flight
*/
export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { proxy, isReady, initProgress } = usePyodide();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const glassMapStore = useGlassMapStore();
  const catalogsData = useStore(glassMapStore, (state) => state.catalogsData);
  const lookupMaps = useStore(glassMapStore, (state) => state.lookupMaps);
  const hasUnappliedOptimizationResult = useStore(
    optimizationStore,
    (state) => state.hasUnappliedOptimizationResult,
  );
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | undefined>();
  const [glassCatalogPreloadStatus, setGlassCatalogPreloadStatus] =
    useState<GlassCatalogPreloadStatus | undefined>();
  const [glassCatalogPreloadError, setGlassCatalogPreloadError] = useState<string | undefined>();
  const [quarantinedCustomGlassLabels, setQuarantinedCustomGlassLabels] = useState<readonly string[]>([]);
  const activeHistoryEntryRef = useRef<HistoryEntry>({ href: pathname, state: undefined });
  const glassCatalogsLoading =
    isReady &&
    proxy !== undefined &&
    catalogsData === undefined &&
    glassCatalogPreloadStatus !== "loaded" &&
    glassCatalogPreloadStatus !== "error";
  const glassCatalogsLoaded = catalogsData !== undefined || glassCatalogPreloadStatus === "loaded";

  const shouldWarnBeforeLeavingOptimization = useCallback(
    (targetHref: string) =>
      pathname === "/optimization"
      && targetHref !== "/optimization"
      && hasUnappliedOptimizationResult,
    [hasUnappliedOptimizationResult, pathname],
  );

  const proceedToHref = useCallback(
    (href: string) => {
      setPendingNavigationHref(undefined);
      router.push(href);
    },
    [router],
  );

  const guardedNavigate = useCallback(
    (href: string, event?: React.MouseEvent<HTMLAnchorElement>) => {
      event?.preventDefault();
      if (shouldWarnBeforeLeavingOptimization(href)) {
        setPendingNavigationHref(href);
        return false;
      }

      proceedToHref(href);
      return true;
    },
    [proceedToHref, shouldWarnBeforeLeavingOptimization],
  );

  const handleStayOnOptimization = useCallback(() => {
    setPendingNavigationHref(undefined);
  }, []);

  const handleLeaveOptimization = useCallback(() => {
    const href = pendingNavigationHref;
    if (href === undefined) {
      return;
    }

    proceedToHref(href);
  }, [pendingNavigationHref, proceedToHref]);

  const handleApplyOptimizationToEditorAndLeave = useCallback(async () => {
    const href = pendingNavigationHref;
    const model = optimizationStore.getState().optimizationModel;
    if (href === undefined || model === undefined) {
      setPendingNavigationHref(undefined);
      return;
    }

    if (proxy === undefined) return;
    try {
      await applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy });
      optimizationStore.getState().markOptimizationResultAppliedToEditor();
      proceedToHref(href);
    } catch {
      setErrorModalOpen(true);
    }
  }, [lensStore, optimizationStore, pendingNavigationHref, proceedToHref, proxy, specsStore]);

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
  }, [pathname]);

  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      const nextHref = getCurrentWindowHref();
      const activeEntry = activeHistoryEntryRef.current;
      const previousPathname = getPathnameFromHref(activeEntry.href);
      const nextPathname = getPathnameFromHref(nextHref);
      if (
        previousPathname === "/optimization"
        && nextPathname !== "/optimization"
        && optimizationStore.getState().hasUnappliedOptimizationResult
      ) {
        event.stopImmediatePropagation();
        window.history.pushState(activeEntry.state, "", activeEntry.href);
        flushSync(() => setPendingNavigationHref(nextHref));
        return;
      }

      activeHistoryEntryRef.current = {
        href: nextHref,
        state: event.state,
      };
    };

    window.addEventListener("popstate", handler, { capture: true });
    return () => window.removeEventListener("popstate", handler, { capture: true });
  }, [optimizationStore]);

  useEffect(() => {
    if (!isReady || proxy === undefined) {
      return;
    }

    if (catalogsData !== undefined) {
      return;
    }

    if (glassCatalogPreloadStatus !== undefined) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await loadGlassCatalogs(proxy);
      if (cancelled) {
        return;
      }

      if (result.error === undefined) {
        const hydratedData: CompleteGlassCatalogsData = {
          ...result.data,
          Custom: { ...result.data.Custom },
        };
        const quarantinedLabels: string[] = [];
        const storedRows = await readStoredCustomGlassRows().catch(() => []);
        for (const row of storedRows) {
          if (!isPersistedCustomGlassRow(row)) {
            const label = typeof row === "object" && row !== null && "label" in row && typeof row.label === "string"
              ? row.label
              : "unlabeled";
            quarantinedLabels.push(label);
            await quarantineStoredCustomGlassRow(row, label).catch(() => undefined);
            continue;
          }

          try {
            const added: UserDefinedMaterialsData = await proxy.addUserDefinedGlasses([{
              name: row.label,
              pairs: row.pairs,
            }]);
            hydratedData.Custom = {
              ...hydratedData.Custom,
              ...added,
            };
          } catch {
            quarantinedLabels.push(row.label);
            await quarantinePersistedCustomGlass(row).catch(() => undefined);
          }
        }

        if (quarantinedLabels.length > 0) {
          setQuarantinedCustomGlassLabels(quarantinedLabels);
        }
        glassMapStore.getState().setCatalogsData(hydratedData);
        setGlassCatalogPreloadStatus("loaded");
        setGlassCatalogPreloadError(undefined);
        return;
      }

      setGlassCatalogPreloadStatus("error");
      setGlassCatalogPreloadError(result.error);
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogsData, glassCatalogPreloadStatus, glassMapStore, isReady, proxy]);

  const contextValue = useMemo(
    () => ({
      proxy,
      isReady,
      openErrorModal: () => setErrorModalOpen(true),
    }),
    [proxy, isReady]
  );
  const glassCatalogContextValue = useMemo(
    () => ({
      catalogs: catalogsData,
      lookupMaps,
      error: glassCatalogPreloadError,
      isLoaded: glassCatalogsLoaded,
      isLoading: glassCatalogsLoading,
      preload: async () => {
        if (proxy === undefined) {
          return undefined;
        }

        if (catalogsData !== undefined) {
          setGlassCatalogPreloadStatus("loaded");
          setGlassCatalogPreloadError(undefined);
          return { data: catalogsData, error: undefined };
        }

        setGlassCatalogPreloadStatus("loading");
        setGlassCatalogPreloadError(undefined);
        const result = await loadGlassCatalogs(proxy);
        if (result.error === undefined) {
          glassMapStore.getState().setCatalogsData(result.data);
          setGlassCatalogPreloadStatus("loaded");
          setGlassCatalogPreloadError(undefined);
        } else {
          setGlassCatalogPreloadStatus("error");
          setGlassCatalogPreloadError(result.error);
        }
        return result;
      },
    }),
    [
      catalogsData,
      glassCatalogPreloadError,
      glassCatalogsLoaded,
      glassCatalogsLoading,
      glassMapStore,
      lookupMaps,
      proxy,
    ]
  );
  const showLoadingOverlay =
    !isReady ||
    (proxy !== undefined && (glassCatalogsLoading || glassCatalogPreloadError !== undefined));
  const overlayProgress =
    isReady && proxy !== undefined && glassCatalogsLoading
      ? { value: 90, status: "Preloading glass catalogs" }
      : initProgress;
  const overlayContents =
    isReady && proxy !== undefined && glassCatalogPreloadError !== undefined ? (
      <span className="text-center text-sm text-red-600 dark:text-red-400">
        {glassCatalogPreloadError}
      </span>
    ) : (
      <div className="flex w-72 max-w-[70vw] flex-col items-center gap-2">
        <span className="text-center text-sm text-gray-700 dark:text-gray-300">
          {overlayProgress.status}
        </span>
        <Progress value={overlayProgress.value} ariaLabel="Initialization progress" />
      </div>
    );

  return (
    <MathJaxContext>
      <AppShellProvider value={contextValue}>
        <GlassCatalogProvider value={glassCatalogContextValue}>
          <Layout onNavigate={guardedNavigate}>{children}</Layout>
        </GlassCatalogProvider>
        <ErrorModal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
        />
        <UnappliedOptimizationResultModal
          isOpen={pendingNavigationHref !== undefined}
          onStay={handleStayOnOptimization}
          onLeave={handleLeaveOptimization}
          onApplyToEditor={handleApplyOptimizationToEditorAndLeave}
        />
        {quarantinedCustomGlassLabels.length > 0 && (
          <ErrorModal
            isOpen
            message={`${quarantinedCustomGlassLabels.length} persisted custom glass entr${quarantinedCustomGlassLabels.length === 1 ? "y was" : "ies were"} quarantined: ${quarantinedCustomGlassLabels.join(", ")}`}
            onClose={() => setQuarantinedCustomGlassLabels([])}
          />
        )}
        {showLoadingOverlay && (
          <LoadingOverlay
            title="Initializing Ray Optics"
            contents={overlayContents}
          />
        )}
      </AppShellProvider>
    </MathJaxContext>
  );
}
