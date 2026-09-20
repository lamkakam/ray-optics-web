"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";
import { usePyodide } from "@/shared/hooks/usePyodide";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { Layout } from "@/shared/components/layout/Layout";
import { GlassCatalogProvider } from "@/shared/components/providers/GlassCatalogProvider";
import { AppShellProvider } from "@/app/AppShellContext";
import { AppInitializationOverlay } from "@/app/AppInitializationOverlay";
import { UnappliedOptimizationResultModal } from "@/app/UnappliedOptimizationResultModal";
import { useAppShellNavigation } from "@/app/hooks/useAppShellNavigation";
import { useAppShellGlassCatalogs } from "@/app/hooks/useAppShellGlassCatalogs";
import { useGlassCatalogWebMCP } from "@/app/hooks/useGlassCatalogWebMCP";
import { getPyodideErrorMessage } from "@/shared/lib/pyodideErrors";

/** Routed content rendered inside the shared application chrome. */
interface AppShellProps {
  readonly children: React.ReactNode;
}

/**
 * Composes the persistent client shell with one usePyodide call, shared runtime
 * and catalog providers, MathJax, and Layout. Registers the read-only global
 * glass WebMCP query on every route. Navigation and catalog hooks own
 * their lifecycles; the shell presents shared safe computation and initialization
 * messages without repeating boundary diagnostics. ClientApplication supplies stores and ClientOnlyApplication keeps
 * this shell and routed content out of server rendering.
 */
export default function AppShell({ children }: AppShellProps) {
  const { proxy, isReady, initProgress, error } = usePyodide();
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const openErrorModal = useCallback((failure?: unknown) => {
    setErrorMessage(getPyodideErrorMessage(failure));
    setErrorModalOpen(true);
  }, []);
  const { guardedNavigate, confirmationModalProps } = useAppShellNavigation(
    proxy,
    openErrorModal,
  );
  const {
    glassCatalogContextValue,
    quarantinedCustomGlassLabels,
    dismissQuarantineWarning,
  } = useAppShellGlassCatalogs(isReady, proxy);
  useGlassCatalogWebMCP();
  const contextValue = useMemo(
    () => ({ proxy, isReady, openErrorModal }),
    [proxy, isReady, openErrorModal],
  );

  return (
    <MathJaxContext>
      <AppShellProvider value={contextValue}>
        <GlassCatalogProvider value={glassCatalogContextValue}>
          <Layout onNavigate={guardedNavigate}>{children}</Layout>
        </GlassCatalogProvider>
        <ErrorModal
          isOpen={errorModalOpen}
          message={errorMessage}
          onClose={() => setErrorModalOpen(false)}
        />
        <UnappliedOptimizationResultModal {...confirmationModalProps} />
        {quarantinedCustomGlassLabels.length > 0 && (
          <ErrorModal
            isOpen
            message={`${quarantinedCustomGlassLabels.length} persisted custom glass entr${quarantinedCustomGlassLabels.length === 1 ? "y was" : "ies were"} quarantined: ${quarantinedCustomGlassLabels.join(", ")}`}
            onClose={dismissQuarantineWarning}
          />
        )}
        <AppInitializationOverlay
          isReady={isReady}
          hasProxy={proxy !== undefined}
          initProgress={initProgress}
          initializationError={error}
          glassCatalogsLoading={glassCatalogContextValue.isLoading}
          glassCatalogPreloadError={glassCatalogContextValue.error}
        />
      </AppShellProvider>
    </MathJaxContext>
  );
}
