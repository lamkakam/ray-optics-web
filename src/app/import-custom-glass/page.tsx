"use client";
import dynamic from "next/dynamic";

/**
 * Client-only `/import-custom-glass` route.
 *
 * Dynamically loads the feature page with SSR disabled because it depends on
 * browser APIs, the app-shell worker context, and Zustand client state.
 */
const ImportCustomGlassPage = dynamic(
  () => import("@/features/import-custom-glass/ImportCustomGlassPage"),
  { ssr: false },
);

export default ImportCustomGlassPage;
