"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { MathJaxContext } from "better-react-mathjax";
import { createStore } from "zustand";
import type { Theme } from "@/shared/tokens/theme";
import type { AppView } from "@/shared/lib/types/appView";
import { usePyodide } from "@/shared/hooks/usePyodide";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { createLensLayoutImageSlice, type LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import { createGlassMapSlice, type GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { createAnalysisDataSlice, type AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import { ErrorModal } from "@/shared/components/primitives/ErrorModal";
import { SettingsView } from "@/app/pages/SettingsView";
import { PrivacyPolicyView } from "@/app/pages/PrivacyPolicyView";
import { AboutView } from "@/app/pages/AboutView";
import { LoadingOverlay } from "@/shared/components/primitives/LoadingOverlay";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { LensEditor } from "@/features/lens-editor/LensEditor";
import { Layout } from "@/shared/components/layout/Layout";

export default function Home() {
  const { proxy, isReady } = usePyodide();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const lensLayoutImageStore = useMemo(
    () => createStore<LensLayoutImageState>(createLensLayoutImageSlice),
    []
  );

  const glassMapStore = useMemo(
    () => createStore<GlassMapStore>(createGlassMapSlice),
    []
  );

  const analysisDataStore = useMemo(
    () => createStore<AnalysisDataState>(createAnalysisDataSlice),
    []
  );

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("home");

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as Theme;
    if (selected !== theme) {
      setTheme(selected);
    }
  };

  const errorModal = (
    <ErrorModal
      isOpen={errorModalOpen}
      onClose={() => setErrorModalOpen(false)}
    />
  );

  const initOverlayNode = !isReady && (
    <LoadingOverlay
      title="Initializing Ray Optics"
      contents="Loading Pyodide and installing packages…"
    />
  );

  const lensEditor = (
    <LensEditor
      lensLayoutImageStore={lensLayoutImageStore}
      analysisDataStore={analysisDataStore}
      proxy={proxy}
      isReady={isReady}
      onError={() => setErrorModalOpen(true)}
    />
  );

  return (
    <MathJaxContext>
      <Layout
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        errorModal={errorModal}
        initOverlayNode={initOverlayNode}
      >
        {currentView === "home" && lensEditor}
        {currentView === "settings" && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}
        {currentView === "glass-map" && (
          <GlassMapView store={glassMapStore} proxy={proxy} isReady={isReady} />
        )}
        {currentView === "privacy-policy" && <PrivacyPolicyView />}
        {currentView === "about" && <AboutView />}
      </Layout>
    </MathJaxContext>
  );
}
