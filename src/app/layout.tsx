import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/shared/components/providers/ServiceWorkerRegistrar";
import { ThemeProvider } from "@/shared/components/providers/ThemeProvider";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";

export const metadata: Metadata = {
  title: "Ray Optics Web",
  description: "Web-based GUI for RayOptics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <ServiceWorkerRegistrar />
          <SpecsConfiguratorStoreProvider>
            <LensEditorStoreProvider>
              <AnalysisPlotStoreProvider>
                <AnalysisDataStoreProvider>
                  <LensLayoutImageStoreProvider>
                    <GlassMapStoreProvider>
                      {children}
                    </GlassMapStoreProvider>
                  </LensLayoutImageStoreProvider>
                </AnalysisDataStoreProvider>
              </AnalysisPlotStoreProvider>
            </LensEditorStoreProvider>
          </SpecsConfiguratorStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

