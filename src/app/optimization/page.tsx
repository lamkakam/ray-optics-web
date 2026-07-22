/**
# `app/optimization/page.tsx`
*/
"use client";

import { useAppShell } from "@/app/AppShellContext";
import { OptimizationPage } from "@/features/optimization/OptimizationPage";

/**
## Purpose

App Router page for `/optimization`.

## Behavior

- Reads `proxy`, `isReady`, and `openErrorModal` from `useAppShell()`.
- Renders `features/optimization/OptimizationPage`.
- Delegates worker/setup errors to the shared shell error modal via `openErrorModal`.
*/
export default function OptimizationRoutePage() {
  const { proxy, isReady, openErrorModal } = useAppShell();

  return (
    <OptimizationPage
      proxy={proxy}
      isReady={isReady}
      onError={openErrorModal}
    />
  );
}
