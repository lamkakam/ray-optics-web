"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import { GlassCatalogProvider } from "@/shared/components/providers/GlassCatalogProvider";
import {
  peekGlassCatalogs,
  preloadGlassCatalogs,
  type GlassCatalogsLoadResult,
} from "@/features/glass-map/lib/glassCatalogsResource";

interface AppShellProps {
  readonly children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { proxy, isReady, initProgress } = usePyodide();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const hasUnappliedOptimizationResult = useStore(
    optimizationStore,
    (state) => state.hasUnappliedOptimizationResult,
  );
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | undefined>();
  const [glassCatalogsResult, setGlassCatalogsResult] = useState<GlassCatalogsLoadResult | undefined>();
  const previousPathRef = useRef(pathname);
  const cachedGlassCatalogsResult = proxy === undefined ? undefined : peekGlassCatalogs(proxy);
  const effectiveGlassCatalogsResult = glassCatalogsResult ?? cachedGlassCatalogsResult;
  const glassCatalogsLoading =
    isReady &&
    proxy !== undefined &&
    effectiveGlassCatalogsResult === undefined;
  const glassCatalogsError = effectiveGlassCatalogsResult?.error;

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

  const handleApplyOptimizationToEditorAndLeave = useCallback(() => {
    const href = pendingNavigationHref;
    const model = optimizationStore.getState().optimizationModel;
    if (href === undefined || model === undefined) {
      setPendingNavigationHref(undefined);
      return;
    }

    applyOptimizationModelToEditor({ model, lensStore, specsStore });
    optimizationStore.getState().markOptimizationResultAppliedToEditor();
    proceedToHref(href);
  }, [lensStore, optimizationStore, pendingNavigationHref, proceedToHref, specsStore]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!optimizationStore.getState().hasUnappliedOptimizationResult) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [optimizationStore]);

  useEffect(() => {
    previousPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const handler = () => {
      const nextHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const previousPath = previousPathRef.current;
      if (
        previousPath === "/optimization"
        && nextHref !== "/optimization"
        && optimizationStore.getState().hasUnappliedOptimizationResult
      ) {
        window.history.pushState(null, "", previousPath);
        setPendingNavigationHref(nextHref);
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [optimizationStore]);

  useEffect(() => {
    if (!isReady || proxy === undefined) {
      return;
    }

    if (peekGlassCatalogs(proxy) !== undefined) {
      return;
    }

    let cancelled = false;

    void preloadGlassCatalogs(proxy).then((result) => {
      if (cancelled) {
        return;
      }

      setGlassCatalogsResult(result);
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, proxy]);

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
      catalogs: effectiveGlassCatalogsResult?.data,
      error: effectiveGlassCatalogsResult?.error,
      isLoaded: effectiveGlassCatalogsResult?.data !== undefined,
      isLoading: glassCatalogsLoading,
      preload: async () => {
        if (proxy === undefined) {
          return undefined;
        }

        const result = await preloadGlassCatalogs(proxy);
        setGlassCatalogsResult(result);
        return result;
      },
    }),
    [effectiveGlassCatalogsResult, glassCatalogsLoading, proxy]
  );
  const showLoadingOverlay =
    !isReady ||
    (proxy !== undefined && glassCatalogsLoading && glassCatalogsError === undefined);
  const overlayProgress =
    isReady && proxy !== undefined && glassCatalogsLoading
      ? { value: 90, status: "Preloading glass catalogs" }
      : initProgress;

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
        {showLoadingOverlay && (
          <LoadingOverlay
            title="Initializing Ray Optics"
            contents={
              <div className="flex w-72 max-w-[70vw] flex-col items-center gap-2">
                <span className="text-center text-sm text-gray-700 dark:text-gray-300">
                  {overlayProgress.status}
                </span>
                <Progress value={overlayProgress.value} ariaLabel="Initialization progress" />
              </div>
            }
          />
        )}
      </AppShellProvider>
    </MathJaxContext>
  );
}
