"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";
import { usePyodide } from "@/shared/hooks/usePyodide";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { Layout } from "@/shared/components/layout/Layout";
import { AppShellProvider } from "@/app/AppShellContext";

interface AppShellProps {
  readonly children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { proxy, isReady } = usePyodide();
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const contextValue = useMemo(
    () => ({
      proxy,
      isReady,
      openErrorModal: () => setErrorModalOpen(true),
    }),
    [proxy, isReady]
  );

  return (
    <MathJaxContext>
      <AppShellProvider value={contextValue}>
        <Layout>{children}</Layout>
        <ErrorModal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
        />
        {!isReady && (
          <LoadingOverlay
            title="Initializing Ray Optics"
            contents="Loading Pyodide and installing packages…"
          />
        )}
      </AppShellProvider>
    </MathJaxContext>
  );
}
