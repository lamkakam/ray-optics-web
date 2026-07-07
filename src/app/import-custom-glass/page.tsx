"use client";

import dynamic from "next/dynamic";

const ImportCustomGlassPage = dynamic(
  () => import("@/features/import-custom-glass/ImportCustomGlassPage"),
  { ssr: false },
);

export default ImportCustomGlassPage;
