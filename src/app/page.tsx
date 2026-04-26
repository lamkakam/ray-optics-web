"use client";

import { LensEditor } from "@/features/lens-editor/LensEditor";
import { useAppShell } from "@/app/AppShellContext";

export default function HomePage() {
  const { proxy, isReady, openErrorModal } = useAppShell();

  return (
    <LensEditor
      proxy={proxy}
      isReady={isReady}
      onError={openErrorModal}
    />
  );
}
