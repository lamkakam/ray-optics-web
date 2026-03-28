"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createStore } from "zustand";
import type { Theme } from "@/lib/theme";
import type { AppView } from "@/lib/appView";
import { usePyodide } from "@/hooks/usePyodide";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/store/analysisPlotStore";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { Button } from "@/components/micro/Button";
import { Header } from "@/components/micro/Header";
import { SideNav } from "@/components/composite/SideNav";
import { SettingsView } from "@/components/composite/SettingsView";
import { PrivacyPolicyView } from "@/components/composite/PrivacyPolicyView";
import { AboutView } from "@/components/composite/AboutView";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";
import { useTheme } from "@/components/ThemeProvider";
import { LensEditor } from "@/components/page/LensEditor";

export default function Home() {
  const { proxy, isReady } = usePyodide();
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
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

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
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

  const hamburgerButton = (
    <Button
      variant="secondary"
      size="sm"
      aria-label="Open navigation"
      onClick={() => setSideNavOpen((prev) => !prev)}
    >
      ☰
    </Button>
  );

  const sideNavNode = (
    <SideNav
      isOpen={sideNavOpen}
      isLG={isLG}
      currentView={currentView}
      onClose={() => setSideNavOpen(false)}
      onNavigate={(view) => { setCurrentView(view); setSideNavOpen(false); }}
    />
  );

  const lensEditor = (
    <LensEditor
      specsStore={specsStore}
      lensStore={lensStore}
      analysisPlotStore={analysisPlotStore}
      proxy={proxy}
      isReady={isReady}
      onError={() => setErrorModalOpen(true)}
    />
  );

  const layoutLG: React.ReactNode = (
    <div className="flex flex-col h-screen">
      <header className="shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex h-12 items-center gap-4 px-4">
          {hamburgerButton}
          <Header level={1}>Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col min-h-0">
        {sideNavNode}

        {currentView === "home" && lensEditor}

        {currentView === "settings" && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}

        {currentView === "privacy-policy" && <PrivacyPolicyView />}

        {currentView === "about" && <AboutView />}
      </div>

      {errorModal}
      {initOverlayNode}
    </div>
  );

  const layoutSM: React.ReactNode = (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center">
          {hamburgerButton}
          <Header level={1} className="ml-2">Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex flex-col">
        {sideNavNode}

        {currentView === "home" && lensEditor}

        {currentView === "settings" && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}

        {currentView === "privacy-policy" && <PrivacyPolicyView />}

        {currentView === "about" && <AboutView />}
      </div>

      {errorModal}
      {initOverlayNode}
    </div>
  );

  return isLG ? layoutLG : layoutSM;
}
