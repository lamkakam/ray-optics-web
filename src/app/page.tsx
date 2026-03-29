"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createStore } from "zustand";
import type { Theme } from "@/lib/theme";
import type { AppView } from "@/lib/appView";
import { usePyodide } from "@/hooks/usePyodide";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/store/analysisPlotStore";
import { createLensLayoutImageSlice, type LensLayoutImageState } from "@/store/lensLayoutImageStore";
import { createAnalysisDataSlice, type AnalysisDataState } from "@/store/analysisDataStore";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { SettingsView } from "@/components/page/SettingsView";
import { PrivacyPolicyView } from "@/components/page/PrivacyPolicyView";
import { AboutView } from "@/components/page/AboutView";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";
import { useTheme } from "@/components/ThemeProvider";
import { LensEditor } from "@/components/page/LensEditor";
import { Layout } from "@/components/layout/Layout";

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

  const specsStore = useMemo(
    () => createStore<SpecsConfigurerState>(createSpecsConfigurerSlice),
    []
  );

  const lensStore = useMemo(
    () => createStore<LensEditorState>(createLensEditorSlice),
    []
  );

  const analysisPlotStore = useMemo(
    () => createStore<AnalysisPlotState>(createAnalysisPlotSlice),
    []
  );

  const lensLayoutImageStore = useMemo(
    () => createStore<LensLayoutImageState>(createLensLayoutImageSlice),
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
      specsStore={specsStore}
      lensStore={lensStore}
      analysisPlotStore={analysisPlotStore}
      lensLayoutImageStore={lensLayoutImageStore}
      analysisDataStore={analysisDataStore}
      proxy={proxy}
      isReady={isReady}
      onError={() => setErrorModalOpen(true)}
    />
  );

  return (
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
      {currentView === "privacy-policy" && <PrivacyPolicyView />}
      {currentView === "about" && <AboutView />}
    </Layout>
  );
}
