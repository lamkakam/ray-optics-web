"use client";

import type React from "react";
import AppShell from "@/app/AppShell";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { ImportCustomGlassStoreProvider } from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { OptimizationStoreProvider } from "@/features/optimization/providers/OptimizationStoreProvider";
import { ImagePointProvider } from "@/shared/components/providers/ImagePointProvider";
import ServiceWorkerRegistrar from "@/shared/components/providers/ServiceWorkerRegistrar";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";

/** Routed content mounted by the browser-only application root. */
interface ClientApplicationProps {
  readonly children: React.ReactNode;
}

/**
 * Composes the complete interactive application after the browser loads JavaScript.
 *
 * @remarks
 * This component owns every app-wide provider, service-worker registration, and
 * `AppShell`. `ClientOnlyApplication` dynamically imports it with server
 * rendering disabled, so none of this tree or its routed children is emitted as
 * prerendered application markup.
 */
export default function ClientApplication({
  children,
}: ClientApplicationProps) {
  return (
    <ThemeProvider>
      <ImagePointProvider>
        <ServiceWorkerRegistrar />
        <SpecsConfiguratorStoreProvider>
          <LensEditorStoreProvider>
            <AnalysisPlotStoreProvider>
              <AnalysisDataStoreProvider>
                <LensLayoutImageStoreProvider>
                  <GlassMapStoreProvider>
                    <ImportCustomGlassStoreProvider>
                      <OptimizationStoreProvider>
                        <AppShell>{children}</AppShell>
                      </OptimizationStoreProvider>
                    </ImportCustomGlassStoreProvider>
                  </GlassMapStoreProvider>
                </LensLayoutImageStoreProvider>
              </AnalysisDataStoreProvider>
            </AnalysisPlotStoreProvider>
          </LensEditorStoreProvider>
        </SpecsConfiguratorStoreProvider>
      </ImagePointProvider>
    </ThemeProvider>
  );
}
