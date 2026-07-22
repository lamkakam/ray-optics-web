/**
 * Describes the Layout module.
 *
 * @remarks
 * ## Rendered Structure
 * ```tsx
 * <html>
 * <body>
 * <ThemeProvider>
 * <ImagePointProvider>
 * <ServiceWorkerRegistrar />
 * <...store providers...>
 * <AppShell>{children}</AppShell>
 * </...store providers...>
 * </ImagePointProvider>
 * </ThemeProvider>
 * </body>
 * </html>
 * ```
 */
import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/shared/components/providers/ServiceWorkerRegistrar";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";
import { ImagePointProvider } from "@/shared/components/providers/ImagePointProvider";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { ImportCustomGlassStoreProvider } from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import { OptimizationStoreProvider } from "@/features/optimization/providers/OptimizationStoreProvider";
import AppShell from "@/app/AppShell";

export const metadata: Metadata = {
  title: "Ray Optics Web",
  description: "Web-based GUI for RayOptics",
};

/**
 * Root server layout for the App Router. Owns metadata, global providers, and the shared client app shell wrapper.
 *
 * @remarks
 * ## Responsibilities
 * - Declares the app metadata
 * - Imports global CSS
 * - Mounts the theme provider, Image point provider, service worker registrar, and shared app-wide Zustand-backed store providers once for the entire app
 * - Wraps routed content in `AppShell` so shared client shell behaviour persists across all routes
 * - Mounts `GlassMapStoreProvider` at the app root so glass-map UI state persists across route switches
 * - Mounts `ImportCustomGlassStoreProvider` at the app root so Import Custom Glass readonly table sort/filter state persists across route switches
 * - Mounts `OptimizationStoreProvider` at the app root so optimization UI state persists across route switches
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
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
      </body>
    </html>
  );
}
