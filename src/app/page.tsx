"use client";

import { LensEditor } from "@/features/lens-editor/LensEditor";
import { useAppShell } from "@/app/AppShellContext";

/**
 *
 * ## Behaviour
 * - Reads `proxy`, `isReady`, and `openErrorModal` from `useAppShell()`
 * - Renders `LensEditor`
 * - Passes `openErrorModal` to `LensEditor` as `onError`
 */
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
