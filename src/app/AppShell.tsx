"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";
import { usePyodide } from "@/shared/hooks/usePyodide";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { Layout } from "@/shared/components/layout/Layout";
import { AppShellProvider } from "@/app/AppShellContext";
import { GlassCatalogProvider } from "@/shared/components/providers/GlassCatalogProvider";
import {
  peekGlassCatalogs,
  preloadGlassCatalogs,
  type GlassCatalogsLoadResult,
} from "@/shared/lib/data/glassCatalogsResource";

interface AppShellProps {
  readonly children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { proxy, isReady } = usePyodide();
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [glassCatalogsResult, setGlassCatalogsResult] = useState<GlassCatalogsLoadResult | undefined>();
  const cachedGlassCatalogsResult = proxy === undefined ? undefined : peekGlassCatalogs(proxy);
  const effectiveGlassCatalogsResult = glassCatalogsResult ?? cachedGlassCatalogsResult;
  const glassCatalogsLoading =
    isReady &&
    proxy !== undefined &&
    effectiveGlassCatalogsResult === undefined;
  const glassCatalogsError = effectiveGlassCatalogsResult?.error;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

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

  return (
    <MathJaxContext>
      <AppShellProvider value={contextValue}>
        <GlassCatalogProvider value={glassCatalogContextValue}>
          <Layout>{children}</Layout>
        </GlassCatalogProvider>
        <ErrorModal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
        />
        {showLoadingOverlay && (
          <LoadingOverlay
            title="Initializing Ray Optics"
            contents="Loading Pyodide, installing packages, and preloading glass catalogs…"
          />
        )}
      </AppShellProvider>
    </MathJaxContext>
  );
}
