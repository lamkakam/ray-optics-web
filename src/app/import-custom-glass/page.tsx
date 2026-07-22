/**
 * Next.js App Router entry for `/import-custom-glass`.
 *
 * @remarks
 * ## Behavior
 * - Client-only route.
 * - Dynamically loads `features/import-custom-glass/ImportCustomGlassPage` with SSR disabled because it depends on browser APIs, the app shell worker context, and Zustand client state.
 */
"use client";

import dynamic from "next/dynamic";

const ImportCustomGlassPage = dynamic(
  () => import("@/features/import-custom-glass/ImportCustomGlassPage"),
  { ssr: false },
);

export default ImportCustomGlassPage;
